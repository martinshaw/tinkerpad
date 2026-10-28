<?php

use Tinkerpad\Php\Runner;

ini_set('display_errors', 'stderr');
ini_set('log_errors', '1');

require __DIR__ . '/src/overrides.php';
require __DIR__ . '/vendor/autoload.php';

$runAt = microtime(true);
$argv = $_SERVER['argv'] ?? [];
$cwd = $argv[1] ?? getcwd();
$session = false;
$code = null;

foreach (array_slice($argv, 2) as $arg) {
    if ($arg === '--session') {
        $session = true;
        continue;
    }

    $code = $arg;
}

$runner = null;
$flags = JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE;

try {
    $runner = (new Runner($cwd, $code, $session))->boot();

    if ($session) {
        $runner->listen();

        return;
    }

    if ($runner->getCode() === null && $runner->getInfo() !== null) {
        echo json_encode($runner->getInfo(), $flags);

        return;
    }

    echo json_encode($runner->run()->payload($runAt), $flags);
} catch (\Throwable $th) {
    $payload = [
        'outputs' => [],
        'error' => $th->getMessage(),
        'time' => 0,
        'peakMemoryUsage' => 0,
        'runAt' => $runAt,
    ];

    if ($runner instanceof Runner) {
        $runner->addOutput($th);
        $payload = $runner->payload($runAt);
        $payload['error'] = $payload['error'] ?? $th->getMessage();
    }

    if ($session) {
        fwrite(STDOUT, json_encode($payload, $flags) . "\n");
        exit(1);
    }

    if ($runner instanceof Runner) {
        echo json_encode($payload, $flags);

        return;
    }

    fwrite(STDERR, $th->getMessage() . PHP_EOL);
    exit(1);
}
