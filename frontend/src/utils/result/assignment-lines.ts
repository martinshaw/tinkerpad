const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const LOG_RAW_RE = /^\[([A-Za-z]+)\]\s+/;

/** 1-based editor lines that assign to `label` (e.g. `$a`, `$_`). */
export const findAssignmentLines = (code: string, label: string): number[] => {
    if (!label) {
        return [];
    }

    const pattern = new RegExp(
        `^\\s*${escapeRegExp(label)}\\s*(?:\\+\\=|\\-\\=|\\*\\=|\\/\\=|\\.\\=|\\?\\=|\\=)`,
    );
    const lines: number[] = [];

    code.split('\n').forEach((line, index) => {
        if (pattern.test(line)) {
            lines.push(index + 1);
        }
    });

    return lines;
};

/** 1-based editor lines that call `Log::{level}(` (and FQCN facade form). */
export const findLogLines = (code: string, level: string): number[] => {
    if (!level) {
        return [];
    }

    const pattern = new RegExp(
        `^\\s*(?:\\\\?Illuminate\\\\Support\\\\Facades\\\\)?Log::${escapeRegExp(level)}\\s*\\(`,
        'i',
    );
    const lines: number[] = [];

    code.split('\n').forEach((line, index) => {
        if (pattern.test(line)) {
            lines.push(index + 1);
        }
    });

    return lines;
};

const logLevelOf = (output: {
    kind?: string;
    level?: string;
    raw?: string;
}): string | undefined => {
    if (output.kind === 'log') {
        return (output.level || 'info').toLowerCase();
    }
    const match = (output.raw || '').match(LOG_RAW_RE);
    return match ? match[1].toLowerCase() : undefined;
};

/**
 * Match outputs to editor lines in order (each source line used once).
 * Assignments pin by variable label; logs pin by Log::{level}( call site.
 */
export const resolveOutputLines = (
    code: string,
    outputs: { label?: string; kind?: string; level?: string; raw?: string }[],
): (number | undefined)[] => {
    const assignPools = new Map<string, number[]>();
    const logPools = new Map<string, number[]>();

    return outputs.map(output => {
        const level = logLevelOf(output);
        if (level) {
            let pool = logPools.get(level);
            if (!pool) {
                pool = findLogLines(code, level);
                logPools.set(level, pool);
            }
            return pool.shift();
        }

        const label = output.label;
        if (!label) {
            return undefined;
        }

        let pool = assignPools.get(label);
        if (!pool) {
            pool = findAssignmentLines(code, label);
            assignPools.set(label, pool);
        }

        return pool.shift();
    });
};
