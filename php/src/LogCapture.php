<?php

namespace Tinkerpad\Php;

/**
 * Hooks Laravel logging so Log::… calls appear interleaved in Tree output.
 *
 * Uses Log::listen, MessageLogged, and a Monolog handler together, with
 * per-request dedupe so the same line is not captured twice.
 */
class LogCapture
{
    protected static bool $listening = false;

    /** @var array<string, true> */
    protected static array $seen = [];

    public static function beginRequest(): void
    {
        self::$seen = [];
        self::install();
    }

    public static function install(): void
    {
        if (self::$listening) {
            return;
        }

        $bound = false;

        if (class_exists(\Illuminate\Support\Facades\Log::class)) {
            try {
                \Illuminate\Support\Facades\Log::listen(static function (object $event): void {
                    self::captureEvent($event);
                });
                $bound = true;
            } catch (\Throwable) {
            }
        }

        if (! $bound && class_exists(\Illuminate\Log\Events\MessageLogged::class)) {
            try {
                \Illuminate\Support\Facades\Event::listen(
                    \Illuminate\Log\Events\MessageLogged::class,
                    static function (object $event): void {
                        self::captureEvent($event);
                    },
                );
                $bound = true;
            } catch (\Throwable) {
            }
        }

        self::installMonologHandler();
        self::$listening = true;
    }

    protected static function captureEvent(object $event): void
    {
        $level = self::stringifyLevel($event->level ?? 'info');
        $message = self::stringify($event->message ?? '');
        $context = is_array($event->context ?? null) ? $event->context : [];
        self::record($level, $message, $context);
    }

    public static function record(string $level, string $message, mixed $context = []): void
    {
        $level = strtolower(trim($level) ?: 'info');
        $context = is_array($context) ? $context : [];
        $key = md5($level . "\0" . $message . "\0" . serialize($context));

        if (isset(self::$seen[$key])) {
            return;
        }

        self::$seen[$key] = true;

        try {
            $runner = Runner::getInstance();
            if (! $runner->dumpsLogs()) {
                return;
            }
            $runner->addLog($level, $message, $context);
        } catch (\Throwable) {
        }
    }

    protected static function installMonologHandler(): void
    {
        try {
            if (! function_exists('app') || ! app()->bound('log')) {
                return;
            }

            $logger = app('log');
            $driver = method_exists($logger, 'driver') ? $logger->driver() : $logger;
            $monolog = method_exists($driver, 'getLogger') ? $driver->getLogger() : $driver;

            if (! is_object($monolog) || ! method_exists($monolog, 'pushHandler')) {
                return;
            }

            if (! class_exists(\Monolog\Handler\AbstractProcessingHandler::class)) {
                return;
            }

            $monolog->pushHandler(new class extends \Monolog\Handler\AbstractProcessingHandler
            {
                protected function write(mixed $record): void
                {
                    if (is_object($record) && isset($record->message)) {
                        $level = 'info';
                        if (isset($record->level)) {
                            $level = method_exists($record->level, 'getName')
                                ? $record->level->getName()
                                : (string) $record->level;
                        } elseif (isset($record->levelName)) {
                            $level = (string) $record->levelName;
                        }

                        LogCapture::record(
                            strtolower($level),
                            (string) $record->message,
                            is_array($record->context ?? null) ? $record->context : [],
                        );

                        return;
                    }

                    if (is_array($record)) {
                        LogCapture::record(
                            strtolower((string) ($record['level_name'] ?? $record['level'] ?? 'info')),
                            (string) ($record['message'] ?? ''),
                            is_array($record['context'] ?? null) ? $record['context'] : [],
                        );
                    }
                }
            });
        } catch (\Throwable) {
        }
    }

    protected static function stringifyLevel(mixed $level): string
    {
        if (is_object($level) && method_exists($level, 'getName')) {
            return (string) $level->getName();
        }

        if (is_object($level) && method_exists($level, 'name')) {
            return (string) $level->name();
        }

        if ($level instanceof \UnitEnum) {
            return $level instanceof \BackedEnum ? (string) $level->value : $level->name;
        }

        return (string) $level;
    }

    protected static function stringify(mixed $message): string
    {
        if (is_string($message)) {
            return $message;
        }

        if ($message instanceof \Stringable) {
            return (string) $message;
        }

        if (is_scalar($message) || $message === null) {
            return (string) $message;
        }

        return json_encode($message, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE) ?: '';
    }
}
