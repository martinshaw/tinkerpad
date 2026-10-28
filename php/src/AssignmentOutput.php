<?php

namespace Tinkerpad\Php;

use PhpParser\Node;
use PhpParser\Node\Arg;
use PhpParser\Node\Expr;
use PhpParser\Node\Expr\Array_;
use PhpParser\Node\Expr\ArrayDimFetch;
use PhpParser\Node\Expr\ArrayItem;
use PhpParser\Node\Expr\Assign;
use PhpParser\Node\Expr\AssignOp;
use PhpParser\Node\Expr\AssignRef;
use PhpParser\Node\Expr\List_;
use PhpParser\Node\Expr\PropertyFetch;
use PhpParser\Node\Expr\StaticCall;
use PhpParser\Node\Expr\Variable;
use PhpParser\Node\Name;
use PhpParser\Node\Scalar\String_;
use PhpParser\Node\Stmt;
use PhpParser\Node\Stmt\Expression;
use PhpParser\ParserFactory;
use PhpParser\PrettyPrinter\Standard;

/**
 * Injects AssignmentOutput::dump() after every top-level assignment (including
 * the last). When the last statement is an assignment, the PsySH implicit
 * return is suppressed so the value is not shown twice.
 */
class AssignmentOutput
{
    public static bool $suppressReturn = false;

    public static function dump(string $label, mixed $value): void
    {
        if (\ob_get_level() > 0) {
            \ob_flush();
        }

        Runner::getInstance()->addOutput($value, $label);
    }

    public static function inject(string $code): string
    {
        self::$suppressReturn = false;

        if (trim($code) === '') {
            return $code;
        }

        try {
            $parser = (new ParserFactory)->createForNewestSupportedVersion();
            $stmts = $parser->parse('<?php ' . $code);
        } catch (\Throwable) {
            return $code;
        }

        if (! is_array($stmts) || $stmts === []) {
            return $code;
        }

        $lastIndex = count($stmts) - 1;
        $out = [];

        foreach ($stmts as $index => $stmt) {
            $out[] = $stmt;
            $dumps = self::dumpsForStatement($stmt);

            foreach ($dumps as $dump) {
                $out[] = $dump;
            }

            if ($index === $lastIndex && $dumps !== []) {
                self::$suppressReturn = true;
            }
        }

        return (new Standard)->prettyPrint($out);
    }

    /**
     * @return list<Expression>
     */
    protected static function dumpsForStatement(Stmt $stmt): array
    {
        if (! $stmt instanceof Expression) {
            return [];
        }

        $expr = $stmt->expr;

        while ($expr instanceof Assign || $expr instanceof AssignRef) {
            $targets = self::targets($expr->var);
            if ($targets !== []) {
                return array_map(fn (array $target) => self::dumpStmt($target[0], $target[1]), $targets);
            }
            $expr = $expr->expr;
        }

        if ($expr instanceof AssignOp) {
            $targets = self::targets($expr->var);

            return array_map(fn (array $target) => self::dumpStmt($target[0], $target[1]), $targets);
        }

        return [];
    }

    /**
     * @return list<array{0: string, 1: Expr}>
     */
    protected static function targets(Expr $expr): array
    {
        if ($expr instanceof Variable && is_string($expr->name)) {
            return [['$' . $expr->name, new Variable($expr->name)]];
        }

        if ($expr instanceof List_ || $expr instanceof Array_) {
            $targets = [];
            foreach ($expr->items ?? [] as $item) {
                if (! $item instanceof ArrayItem || $item->value === null) {
                    continue;
                }
                $targets = array_merge($targets, self::targets($item->value));
            }

            return $targets;
        }

        if ($expr instanceof PropertyFetch && $expr->name instanceof Node\Identifier) {
            return [[self::label($expr), $expr]];
        }

        if ($expr instanceof ArrayDimFetch && $expr->dim !== null) {
            return [[self::label($expr), $expr]];
        }

        return [];
    }

    protected static function dumpStmt(string $label, Expr $value): Expression
    {
        return new Expression(new StaticCall(
            new Name\FullyQualified('Tinkerpad\\Php\\AssignmentOutput'),
            'dump',
            [
                new Arg(new String_($label)),
                new Arg($value),
            ],
        ));
    }

    protected static function label(Expr $expr): string
    {
        try {
            return (new Standard)->prettyPrintExpr($expr);
        } catch (\Throwable) {
            return 'assigned';
        }
    }
}
