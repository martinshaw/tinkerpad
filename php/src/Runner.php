<?php

namespace Tinkerpad\Php;

use Psy\CodeCleaner\NoReturnValue;
use Psy\Configuration;
use Psy\Exception\ThrowUpException;
use Psy\VarDumper\Cloner;
use Symfony\Component\Console\Output\BufferedOutput;
use Symfony\Component\VarDumper\Dumper\CliDumper;
use Symfony\Component\VarDumper\Dumper\HtmlDumper;
use Symfony\Component\VarDumper\VarDumper;
use Tinkerpad\Php\Exceptions\DieException;
use Tinkerpad\Php\Psy\ExecutionClosure;
use Tinkerpad\Php\Psy\Shell;

class Runner
{
    protected static self $instance;

    protected array $booters = [
        Booters\Composer::class,
        Booters\Symphony::class,
        Booters\Wordpress::class,
        Booters\Laravel::class,
    ];

    protected string $cwd;

    protected ?string $code;

    protected bool $session;

    protected ?array $info = null;

    protected array $setups = [];

    protected Shell $shell;

    protected array $outputs = [];

    protected array $queries = [];

    protected array $tables = [];

    protected array $columns = [];

    protected ?string $error = null;

    protected bool $includeQueries = false;

    protected bool $includeTables = false;

    protected bool $includeColumns = false;

    protected bool $dumpAssignments = false;

    protected bool $dumpLogs = true;

    protected UseStatementFilter $useFilter;

    protected int $peakMemoryUsage = 0;

    protected float $time = 0;

    public function __construct(string $cwd, ?string $code = null, bool $session = false)
    {
        $this->cwd = $cwd;
        $this->code = $code;
        $this->session = $session;
        $this->useFilter = new UseStatementFilter();

        if (is_dir($this->cwd)) {
            chdir($this->cwd);
        }

        Runner::$instance = $this;
    }

    public static function getInstance(): self
    {
        return Runner::$instance;
    }

    public function getCode(): ?string
    {
        return $this->code;
    }

    public function getInfo(): ?array
    {
        return $this->info;
    }

    public function getShell(): Shell
    {
        return $this->shell;
    }

    public function getOutputs(): array
    {
        return $this->outputs;
    }

    public function addOutput(mixed $output, ?string $label = null): self
    {
        if ($output instanceof DieException) {
            return $this;
        }

        $data = (new Cloner($this->getCasters()))->cloneVar($output);

        $htmlDumper = new HtmlDumper;
        $htmlDumper->setDumpHeader('');

        $raw = (new CliDumper())->dump($data, true);
        if ($label !== null && $label !== '') {
            $raw = $label . ' = ' . ltrim((string) $raw);
        }

        $entry = [
            'kind' => 'dump',
            'raw' => $raw,
            'html' => base64_encode($htmlDumper->dump($data, true)),
        ];

        if ($label !== null && $label !== '') {
            $entry['label'] = $label;
        }

        $normalized = $this->normalizeForJson($output);
        if ($normalized !== $this->unjsonable()) {
            $entry['data'] = $normalized;
        }

        if ($table = $this->tabularFrom($output)) {
            $entry['table'] = $table;
        }

        $this->outputs[] = $entry;

        return $this;
    }

    public function dumpsLogs(): bool
    {
        return $this->dumpLogs;
    }

    public function addLog(string $level, string $message, mixed $context = []): self
    {
        if (! $this->dumpLogs) {
            return $this;
        }

        $level = strtolower(trim($level) ?: 'info');
        $context = is_array($context) ? $context : [];
        $hasContext = $context !== [];

        $raw = '[' . strtoupper($level) . '] ' . $message;
        $html = '';

        if ($hasContext) {
            // Shallow clone keeps the context tree collapsed under the message.
            $data = (new Cloner($this->getCasters()))
                ->cloneVar($context)
                ->withMaxDepth(1)
                ->withMaxItemsPerDepth(20);

            // Label ties context to the log line inside sf-dump (also helps Raw→Tree parity).
            if (method_exists($data, 'withContext')) {
                $data = $data->withContext([
                    'label' => '[' . strtoupper($level) . '] ' . $message,
                ]);
            }

            $htmlDumper = new HtmlDumper;
            $htmlDumper->setDumpHeader('');
            $html = base64_encode($htmlDumper->dump($data, true));

            $raw .= "\n" . (new CliDumper())->dump(
                (new Cloner($this->getCasters()))->cloneVar($context),
                true,
            );
        } else {
            // Message-only logs still need an HTML body so Tree never drops them.
            $data = (new Cloner($this->getCasters()))->cloneVar(
                new \Symfony\Component\VarDumper\Caster\ScalarStub($message),
            );
            if (method_exists($data, 'withContext')) {
                $data = $data->withContext(['label' => '[' . strtoupper($level) . ']']);
            }
            $htmlDumper = new HtmlDumper;
            $htmlDumper->setDumpHeader('');
            $html = base64_encode($htmlDumper->dump($data, true));
        }

        $entry = [
            'kind' => 'log',
            'level' => $level,
            'message' => $message,
            'raw' => $raw,
            'html' => $html,
            'hasContext' => $hasContext,
        ];

        $payload = $hasContext
            ? ['message' => $message, 'context' => $context]
            : $message;
        $normalized = $this->normalizeForJson($payload);
        if ($normalized !== $this->unjsonable()) {
            $entry['data'] = $normalized;
        }

        $this->outputs[] = $entry;

        return $this;
    }

    public function setPeakMemoryUsage(int $peakMemoryUsage): self
    {
        $this->peakMemoryUsage = $peakMemoryUsage;

        return $this;
    }

    public function getPeakMemoryUsage(): int
    {
        return $this->peakMemoryUsage;
    }

    public function setTime(float $time): self
    {
        $this->time = $time;

        return $this;
    }

    public function getTime(): float
    {
        return $this->time;
    }

    public function payload(float $runAt): array
    {
        $payload = [
            'outputs' => $this->outputs,
            'runAt' => $runAt,
            'time' => $this->time,
            'peakMemoryUsage' => $this->peakMemoryUsage,
        ];

        if ($this->error) {
            $payload['error'] = $this->error;
        }

        if ($this->includeQueries) {
            $payload['queries'] = $this->queries;
        }

        if ($this->includeTables) {
            $payload['tables'] = $this->tables;
        }

        if ($this->includeColumns) {
            $payload['columns'] = $this->columns;
        }

        return $payload;
    }

    public function boot(): self
    {
        foreach ($this->booters as $booter) {
            $booter::boot($this->cwd);

            if ($info = $booter::getInfo()) {
                $this->info = $info;
                $this->setups = array_merge($this->setups, $booter::getSetups());
            }
        }

        if ($this->code === null && ! $this->session) {
            return $this;
        }

        $this->ensureShell();

        return $this;
    }

    public function listen(): void
    {
        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        $this->writeFrame([
            'ready' => true,
            'outputs' => [],
            'info' => $this->info,
        ]);

        while (($line = fgets(STDIN)) !== false) {
            $line = trim($line);

            if ($line === '') {
                continue;
            }

            try {
                $request = json_decode($line, true, 512, JSON_THROW_ON_ERROR);

                if (! is_array($request)) {
                    throw new \InvalidArgumentException('Invalid request');
                }

                if (($request['op'] ?? 'run') === 'close') {
                    break;
                }

                $this->writeFrame($this->handle($request));
            } catch (\Throwable $e) {
                $this->outputs = [];
                $this->addOutput($e);
                $this->error = $e->getMessage();
                $this->writeFrame($this->payload(microtime(true)));
            }
        }
    }

    public function handle(array $request): array
    {
        $started = microtime(true);
        $this->outputs = [];
        $this->queries = [];
        $this->tables = [];
        $this->columns = [];
        $this->error = null;
        $this->includeQueries = false;
        $this->includeTables = false;
        $this->includeColumns = false;
        $this->dumpAssignments = ! empty($request['dumpAssignments']);
        // Default on when the key is omitted (older clients / one-shot runs).
        $this->dumpLogs = ! array_key_exists('dumpLogs', $request) || ! empty($request['dumpLogs']);
        LogCapture::beginRequest();

        $op = $request['op'] ?? 'run';

        try {
            if (! empty($request['queryLog'])) {
                $this->includeQueries = true;
                $this->prepareQueryLog(true);
            } elseif ($this->isLaravel()) {
                $this->prepareQueryLog(false);
            }

            switch ($op) {
                case 'tables':
                    $this->listTables();
                    break;
                case 'columns':
                    $this->listColumns((string) ($request['table'] ?? ''));
                    break;
                case 'query':
                    $this->runSql((string) ($request['sql'] ?? ''), (bool) ($request['allowWrites'] ?? false));
                    break;
                case 'run':
                default:
                    $this->code = $request['code'] ?? $this->code;
                    $this->run();
                    break;
            }

            if ($this->includeQueries) {
                $this->captureQueryLog();
            }
        } catch (\Throwable $e) {
            $this->addOutput($e);
            $this->error ??= $e->getMessage();
        }

        if ($op !== 'run') {
            $this->setTime(microtime(true) - $started);
            $this->setPeakMemoryUsage(memory_get_peak_usage(true));
        }

        return $this->payload($started);
    }

    public function run(): self
    {
        $this->outputs = [];

        try {
            $clean = $this->removeComments($this->code ?? '');

            if (trim($clean) === '') {
                return $this;
            }

            // Persistent session: only introduce new use imports once; later
            // runs of the same buffer skip aliases already applied in this shell.
            if ($this->session) {
                $clean = $this->useFilter->filter($clean);
                if (trim($clean) === '') {
                    return $this;
                }
            }

            AssignmentOutput::$suppressReturn = false;
            if ($this->dumpAssignments) {
                $clean = AssignmentOutput::inject($clean);
            }

            $this->shell->resetCodeBuffer();
            $this->shell->addCode($clean);

            $var = (new ExecutionClosure($this->shell))->execute();

            if (! ($var instanceof NoReturnValue) && ! AssignmentOutput::$suppressReturn) {
                $this->addOutput($var);
            }
        } catch (ThrowUpException $th) {
            throw $th;
        } catch (\Throwable $e) {
            if (isset($this->shell)) {
                $this->shell->resetCodeBuffer();
            }

            $this->addOutput($e);
        }

        return $this;
    }

    protected function ensureShell(): void
    {
        if (isset($this->shell)) {
            return;
        }

        $this->shell = new Shell($this->getPsyConfig());
        $this->shell->setOutput(new BufferedOutput());

        VarDumper::setHandler(function ($var, ?string $label = null) {
            if (\ob_get_level() > 0) {
                \ob_flush();
            }
            Runner::getInstance()->addOutput($var, $label);
        });

        foreach ($this->setups as $setup) {
            $setup($this->shell);
        }

        // After Laravel setups so Log / Event facades are fully available.
        LogCapture::install();
    }

    protected function writeFrame(array $payload): void
    {
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

        if ($json === false) {
            $json = '{"outputs":[],"error":"Failed to encode result","time":0,"peakMemoryUsage":0,"runAt":0}';
        }

        fwrite(STDOUT, $json . "\n");
        fflush(STDOUT);
    }

    protected function isLaravel(): bool
    {
        return ($this->info['framework_name'] ?? '') === 'Laravel'
            && class_exists(\Illuminate\Support\Facades\DB::class);
    }

    protected function prepareQueryLog(bool $enable): void
    {
        if (! $this->isLaravel()) {
            return;
        }

        try {
            \Illuminate\Support\Facades\DB::disableQueryLog();
            \Illuminate\Support\Facades\DB::flushQueryLog();

            if ($enable) {
                \Illuminate\Support\Facades\DB::enableQueryLog();
            }
        } catch (\Throwable) {
        }
    }

    protected function captureQueryLog(): void
    {
        if (! $this->isLaravel()) {
            $this->queries = [];

            return;
        }

        try {
            $queries = \Illuminate\Support\Facades\DB::getQueryLog();
            $this->queries = array_map(function ($query) {
                return [
                    'query' => (string) ($query['query'] ?? ''),
                    'bindings' => array_map(function ($binding) {
                        if (is_scalar($binding) || $binding === null) {
                            return $binding;
                        }

                        if ($binding instanceof \DateTimeInterface) {
                            return $binding->format(DATE_ATOM);
                        }

                        return (string) $binding;
                    }, $query['bindings'] ?? []),
                    'time' => $query['time'] ?? 0,
                ];
            }, $queries);
            \Illuminate\Support\Facades\DB::disableQueryLog();
            \Illuminate\Support\Facades\DB::flushQueryLog();
        } catch (\Throwable) {
            $this->queries = [];
        }
    }

    protected function listTables(): void
    {
        $this->includeTables = true;

        if (! $this->isLaravel()) {
            $this->error = 'Laravel is not booted for this directory';

            return;
        }

        $schema = \Illuminate\Support\Facades\Schema::getFacadeRoot();

        if (method_exists($schema, 'getTableListing')) {
            $tables = $schema->getTableListing();
        } elseif (method_exists($schema, 'getTables')) {
            $tables = array_map(function ($table) {
                if (is_array($table)) {
                    return (string) ($table['name'] ?? '');
                }

                return (string) $table;
            }, $schema->getTables());
        } else {
            $tables = $schema->getConnection()->getDoctrineSchemaManager()->listTableNames();
        }

        $tables = array_values(array_filter($tables, fn ($table) => $table !== ''));
        sort($tables);
        $this->tables = $tables;
    }

    protected function listColumns(string $table): void
    {
        $this->includeColumns = true;

        if (! $this->isLaravel()) {
            $this->error = 'Laravel is not booted for this directory';

            return;
        }

        if ($table === '') {
            $this->error = 'Table name is required';

            return;
        }

        $schema = \Illuminate\Support\Facades\Schema::getFacadeRoot();

        if (method_exists($schema, 'getColumns')) {
            $this->columns = array_map(function ($column) {
                return [
                    'name' => (string) ($column['name'] ?? ''),
                    'type' => (string) ($column['type_name'] ?? $column['type'] ?? ''),
                    'nullable' => (bool) ($column['nullable'] ?? false),
                ];
            }, $schema->getColumns($table));

            return;
        }

        $this->columns = array_map(fn ($name) => [
            'name' => $name,
            'type' => '',
            'nullable' => false,
        ], $schema->getColumnListing($table));
    }

    protected function runSql(string $sql, bool $allowWrites): void
    {
        $sql = trim($sql);

        if ($sql === '') {
            $this->error = 'SQL is empty';

            return;
        }

        if (! $this->isLaravel()) {
            $this->error = 'Laravel is not booted for this directory';

            return;
        }

        $body = rtrim($sql, "; \t\n\r");

        if (str_contains($body, ';')) {
            $this->error = 'Only a single SQL statement is allowed';

            return;
        }

        $readOnly = $this->isReadOnlySql($body);

        if (! $allowWrites && ! $readOnly) {
            $this->error = 'Only read-only SQL is allowed. Turn on allow writes to run this statement.';

            return;
        }

        if ($readOnly) {
            $this->addOutput(\Illuminate\Support\Facades\DB::select($body));

            return;
        }

        $this->addOutput([
            'affected' => \Illuminate\Support\Facades\DB::affectingStatement($body),
        ]);
    }

    protected function isReadOnlySql(string $sql): bool
    {
        if (! preg_match('/^(select|show|describe|desc|explain|with)\b/i', ltrim($sql))) {
            return false;
        }

        return ! preg_match('/\b(insert|update|delete|drop|alter|truncate|grant|revoke|create|replace|rename|call)\b/i', $sql);
    }

    protected function getPsyConfig(): Configuration
    {
        return new Configuration([
            'updateCheck' => 'never',
            'configFile' => null,
            'usePcntl' => false,
            'historySize' => 1,
            'interactiveMode' => Configuration::INTERACTIVE_MODE_DISABLED,
            'theme' => 'compact',
            'verbosity' => Configuration::VERBOSITY_DEBUG,
        ]);
    }

    protected function getCasters(): array
    {
        $casters = [
            'Illuminate\Support\Collection' => 'Laravel\Tinker\TinkerCaster::castCollection',
            'Illuminate\Database\Eloquent\Model' => 'Laravel\Tinker\TinkerCaster::castModel',
            'Illuminate\Foundation\Application' => 'Laravel\Tinker\TinkerCaster::castApplication',
            'Illuminate\Support\HtmlString' => 'Laravel\Tinker\TinkerCaster::castHtmlString',
            'Illuminate\Support\Stringable' => 'Laravel\Tinker\TinkerCaster::castStringable',
            'Illuminate\Process\ProcessResult' => 'Laravel\Tinker\TinkerCaster::castProcessResult',
        ];

        foreach ($casters as $class => $caster) {
            if (! class_exists($class) || ! class_exists(explode('::', $caster)[0])) {
                unset($casters[$class]);
            }
        }

        return $casters;
    }

    /** Sentinel for values that cannot be normalized to JSON. */
    protected static ?object $unjsonable = null;

    protected function unjsonable(): object
    {
        return self::$unjsonable ??= new \stdClass();
    }

    protected function normalizeForJson(mixed $value, int $depth = 0): mixed
    {
        if ($depth > 25) {
            return null;
        }

        if ($value === null || is_bool($value) || is_int($value) || is_float($value) || is_string($value)) {
            return $value;
        }

        if ($value instanceof \JsonSerializable) {
            return $this->normalizeForJson($value->jsonSerialize(), $depth + 1);
        }

        if (interface_exists(\Illuminate\Contracts\Support\Arrayable::class)
            && $value instanceof \Illuminate\Contracts\Support\Arrayable) {
            return $this->normalizeForJson($value->toArray(), $depth + 1);
        }

        if ($value instanceof \UnitEnum) {
            return $value instanceof \BackedEnum ? $value->value : $value->name;
        }

        if ($value instanceof \DateTimeInterface) {
            return $value->format(DATE_ATOM);
        }

        if ($value instanceof \Stringable) {
            return (string) $value;
        }

        if (is_array($value)) {
            $out = [];
            foreach ($value as $key => $item) {
                $normalized = $this->normalizeForJson($item, $depth + 1);
                $out[$key] = $normalized === $this->unjsonable() ? null : $normalized;
            }

            return $out;
        }

        if (is_object($value)) {
            if (method_exists($value, 'toArray')) {
                try {
                    return $this->normalizeForJson($value->toArray(), $depth + 1);
                } catch (\Throwable) {
                }
            }

            try {
                return $this->normalizeForJson(get_object_vars($value), $depth + 1);
            } catch (\Throwable) {
                return $this->unjsonable();
            }
        }

        return $this->unjsonable();
    }

    /**
     * @return array{columns: list<string>, rows: list<list<mixed>}>|null
     */
    protected function tabularFrom(mixed $value): ?array
    {
        $list = $value;

        if (is_object($value)) {
            if (method_exists($value, 'toArray')) {
                try {
                    $list = $value->toArray();
                } catch (\Throwable) {
                    return null;
                }
            } elseif ($value instanceof \Traversable) {
                $list = iterator_to_array($value);
            } else {
                return null;
            }
        }

        if (! is_array($list) || $list === []) {
            return null;
        }

        if (! array_is_list($list)) {
            if ($this->isAssocRow($list)) {
                $list = [$list];
            } else {
                return null;
            }
        }

        $columns = [];
        $assocRows = [];

        foreach ($list as $item) {
            if (is_object($item)) {
                if (method_exists($item, 'toArray')) {
                    try {
                        $item = $item->toArray();
                    } catch (\Throwable) {
                        return null;
                    }
                } else {
                    $item = get_object_vars($item);
                }
            }

            if (! is_array($item) || ! $this->isAssocRow($item)) {
                return null;
            }

            foreach (array_keys($item) as $column) {
                $name = (string) $column;
                if (! in_array($name, $columns, true)) {
                    $columns[] = $name;
                }
            }

            $assocRows[] = $item;
        }

        if ($columns === []) {
            return null;
        }

        $rows = [];
        foreach ($assocRows as $row) {
            $cells = [];
            foreach ($columns as $column) {
                $normalized = $this->normalizeForJson($row[$column] ?? null);
                $cells[] = $normalized === $this->unjsonable() ? null : $normalized;
            }
            $rows[] = $cells;
        }

        return [
            'columns' => $columns,
            'rows' => $rows,
        ];
    }

    protected function isAssocRow(array $row): bool
    {
        if ($row === []) {
            return false;
        }

        foreach (array_keys($row) as $key) {
            if (is_int($key)) {
                return false;
            }
        }

        return true;
    }

    protected function removeComments(string $code): string
    {
        if (trim($code) === '') {
            return '';
        }

        $decoded = base64_decode($code, true);

        if ($decoded === false) {
            $decoded = $code;
        }

        $cleanedCode = '';

        foreach (token_get_all($decoded) as $token) {
            if (is_string($token)) {
                $cleanedCode .= $token;

                continue;
            }

            if (in_array($token[0], [T_COMMENT, T_DOC_COMMENT, T_OPEN_TAG, T_CLOSE_TAG])) {
                continue;
            }

            $cleanedCode .= $token[1];
        }

        return $cleanedCode;
    }
}
