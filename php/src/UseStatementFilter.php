<?php

namespace Tinkerpad\Php;

use PhpParser\Node\Name;
use PhpParser\Node\Stmt;
use PhpParser\Node\Stmt\GroupUse;
use PhpParser\Node\Stmt\Use_;
use PhpParser\ParserFactory;
use PhpParser\PrettyPrinter\Standard;

/**
 * In a persistent PsySH session, drop use imports that were already applied so
 * subsequent runs of the full editor buffer only introduce new aliases.
 */
class UseStatementFilter
{
    /** @var array<string, string> alias (lowercase) => FQN */
    protected array $applied = [];

    public function reset(): void
    {
        $this->applied = [];
    }

    public function filter(string $code): string
    {
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

        $kept = [];
        $changed = false;

        foreach ($stmts as $stmt) {
            if ($stmt instanceof Use_) {
                $keptUses = $this->filterUseItems($stmt);
                if ($keptUses === null) {
                    $changed = true;
                    continue;
                }
                if ($keptUses !== $stmt) {
                    $changed = true;
                }
                $kept[] = $keptUses;
                continue;
            }

            if ($stmt instanceof GroupUse) {
                $expanded = $this->expandGroupUse($stmt);
                foreach ($expanded as $useStmt) {
                    $keptUses = $this->filterUseItems($useStmt);
                    if ($keptUses === null) {
                        $changed = true;
                        continue;
                    }
                    $changed = true;
                    $kept[] = $keptUses;
                }
                continue;
            }

            $kept[] = $stmt;
        }

        if (! $changed) {
            return $code;
        }

        if ($kept === []) {
            return '';
        }

        return (new Standard)->prettyPrint($kept);
    }

    /**
     * @return Use_|null Null when every item was already applied.
     */
    protected function filterUseItems(Use_ $stmt): ?Use_
    {
        $type = $stmt->type;
        $items = [];

        foreach ($stmt->uses as $useItem) {
            $alias = strtolower($useItem->getAlias()->toString());
            $fqn = $useItem->name->toString();
            $key = $type . ':' . $alias;

            if (($this->applied[$key] ?? null) === $fqn) {
                continue;
            }

            $this->applied[$key] = $fqn;
            $items[] = $useItem;
        }

        if ($items === []) {
            return null;
        }

        if (count($items) === count($stmt->uses)) {
            return $stmt;
        }

        return new Use_($items, $type, $stmt->getAttributes());
    }

    /**
     * @return list<Use_>
     */
    protected function expandGroupUse(GroupUse $group): array
    {
        $uses = [];

        foreach ($group->uses as $useItem) {
            $name = Name::concat($group->prefix, $useItem->name);
            if ($name === null) {
                continue;
            }

            $item = clone $useItem;
            $item->name = $name;
            $uses[] = new Use_([$item], $group->type);
        }

        return $uses;
    }
}
