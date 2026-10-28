import { Component, For, Show, createMemo } from 'solid-js';
import { Tab } from '../../stores/code';
import { useGeneralStore } from '../../stores/general';
import { useSettingsStore } from '../../stores/settings';
import { ResultOutput, ResultTable } from '../../utils/result/parse';

const cellText = (value: unknown): string => {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
};

const tablesFromOutputs = (outputs: ResultOutput[]): { label?: string; table: ResultTable }[] => {
    const out: { label?: string; table: ResultTable }[] = [];
    for (const output of outputs) {
        if (output.kind === 'log' || !output.table) {
            continue;
        }
        out.push({ label: output.label, table: output.table });
    }
    return out;
};

const TableResult: Component<{ tab: Tab }> = props => {
    const [generalStore] = useGeneralStore();
    const [settingsStore] = useSettingsStore();
    const tables = createMemo(() => tablesFromOutputs(props.tab.result?.outputs ?? []));
    const colors = () => generalStore.themeInfo.colors;

    return (
        <div
            class="h-full w-full overflow-auto soft-scrollbar px-3 py-3"
            style={{
                'background-color': colors().background,
                color: colors().primary,
                'font-family': settingsStore.app.editor.fontFamily,
                'font-size': `${Math.max(11, settingsStore.app.editor.fontSize - 1)}px`,
            }}
        >
            <Show
                when={tables().length}
                fallback={
                    <div class="text-xs opacity-55 px-1 py-2">
                        No tabular data in this run. Return a list of associative arrays or models.
                    </div>
                }
            >
                <For each={tables()}>
                    {(entry, index) => (
                        <div
                            class="mb-4 last:mb-0 rounded-lg border overflow-hidden"
                            style={{ 'border-color': colors().secondary }}
                        >
                            <Show when={entry.label || tables().length > 1}>
                                <div
                                    class="px-3 py-1.5 text-[11px] opacity-60 border-b"
                                    style={{ 'border-color': colors().secondary }}
                                >
                                    {entry.label || `Table ${index() + 1}`}
                                </div>
                            </Show>
                            <div class="overflow-x-auto">
                                <table class="w-full border-collapse text-left">
                                    <thead>
                                        <tr
                                            style={{
                                                'background-color': `color-mix(in srgb, ${colors().secondary} 40%, ${colors().background})`,
                                            }}
                                        >
                                            <For each={entry.table.columns}>
                                                {column => (
                                                    <th
                                                        class="px-3 py-1.5 font-semibold whitespace-nowrap border-b sticky top-0"
                                                        style={{
                                                            'border-color': colors().secondary,
                                                            'background-color': `color-mix(in srgb, ${colors().secondary} 40%, ${colors().background})`,
                                                        }}
                                                    >
                                                        {column}
                                                    </th>
                                                )}
                                            </For>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <For each={entry.table.rows}>
                                            {row => (
                                                <tr class="hover:brightness-110">
                                                    <For each={row}>
                                                        {cell => (
                                                            <td
                                                                class="px-3 py-1.5 align-top border-b whitespace-pre-wrap break-words max-w-[24rem]"
                                                                style={{
                                                                    'border-color': colors()
                                                                        .secondary,
                                                                    color:
                                                                        cell === null ||
                                                                        cell === undefined
                                                                            ? `color-mix(in srgb, ${colors().primary} 40%, transparent)`
                                                                            : typeof cell ===
                                                                                'string'
                                                                              ? colors().editor
                                                                                    ?.string
                                                                              : colors().primary,
                                                                }}
                                                            >
                                                                {cell === null ||
                                                                cell === undefined
                                                                    ? 'null'
                                                                    : cellText(cell)}
                                                            </td>
                                                        )}
                                                    </For>
                                                </tr>
                                            )}
                                        </For>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </For>
            </Show>
        </div>
    );
};

export default TableResult;
