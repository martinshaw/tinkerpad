export interface QueryEntry {
    query: string;
    bindings: unknown[];
    time: number;
}

export interface SqlColumn {
    name: string;
    type: string;
    nullable: boolean;
}

export interface ResultTable {
    columns: string[];
    rows: unknown[][];
}

export interface ResultOutput {
    html: string;
    raw: string;
    label?: string;
    kind?: 'dump' | 'log' | string;
    level?: string;
    message?: string;
    hasContext?: boolean;
    data?: unknown;
    table?: ResultTable;
}

export interface TabResult {
    outputs: ResultOutput[];
    time: number;
    peakMemoryUsage: number;
    runAt: number;
    error?: string;
    queries?: QueryEntry[];
    tables?: string[];
    columns?: SqlColumn[];
}

export interface RunEnvelope {
    ok: boolean;
    output: string;
    error: string;
    exitCode: number;
}

export interface RunnerPayload {
    outputs?: ResultOutput[];
    time?: number;
    peakMemoryUsage?: number;
    runAt?: number;
    error?: string;
    queries?: QueryEntry[];
    tables?: string[];
    columns?: SqlColumn[];
}

export const parsePayload = (output: string): RunnerPayload | undefined => {
    if (!output) {
        return undefined;
    }

    try {
        return JSON.parse(output) as RunnerPayload;
    } catch {
        return undefined;
    }
};

export const parseRunResult = (result: RunEnvelope): TabResult => {
    const payload = parsePayload(result?.output ?? '');
    const parts = [payload?.error, result?.error].filter(Boolean) as string[];
    const error = parts.length ? parts.join('\n') : undefined;

    if (!payload || !Array.isArray(payload.outputs)) {
        return {
            outputs: [],
            time: 0,
            peakMemoryUsage: 0,
            runAt: Date.now(),
            error: error || result?.output || 'Run failed',
        };
    }

    return {
        outputs: payload.outputs,
        time: payload.time ?? 0,
        peakMemoryUsage: payload.peakMemoryUsage ?? 0,
        runAt: payload.runAt ?? Date.now(),
        error,
        queries: payload.queries,
        tables: payload.tables,
        columns: payload.columns,
    };
};

export const resultText = (result?: TabResult): string => {
    if (!result) {
        return '';
    }

    const body = (result.outputs ?? []).map(output => output.raw).join('\n');

    if (result.error && body) {
        return `${result.error}\n\n${body}`;
    }

    return result.error || body;
};

export const prettyJson = (value: unknown): string => {
    try {
        return JSON.stringify(value, null, 2) ?? 'null';
    } catch {
        return '"[unserializable]"';
    }
};

export const jsonViewText = (outputs: ResultOutput[]): string => {
    const values = outputs.map(output => {
        if (output.kind === 'log') {
            return {
                log: output.level ?? 'info',
                message: output.message ?? output.raw,
                ...(output.data && typeof output.data === 'object' && 'context' in (output.data as object)
                    ? { context: (output.data as { context?: unknown }).context }
                    : {}),
            };
        }
        if (output.data !== undefined) {
            return output.label ? { [output.label]: output.data } : output.data;
        }
        return output.label ? { [output.label]: output.raw } : output.raw;
    });

    if (values.length === 1) {
        return prettyJson(values[0]);
    }

    return prettyJson(values);
};
