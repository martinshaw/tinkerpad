import { Component, For } from 'solid-js';
import { OutputType, useCodeStore } from '../../../stores/code';
import { useGeneralStore } from '../../../stores/general';
import { shortcutLabel } from '../../../utils/hotkey/mod';

export const OUTPUT_MODE_OPTIONS: {
    type: OutputType;
    label: string;
    shortcut: [string, string, string];
    title: () => string;
}[] = [
    {
        type: OutputType.Structured,
        label: 'Tree',
        shortcut: ['mod', 'alt', '1'],
        title: () => `Structured dump (${shortcutLabel('mod', 'alt', '1')})`,
    },
    {
        type: OutputType.Raw,
        label: 'Raw',
        shortcut: ['mod', 'alt', '2'],
        title: () => `Raw text dump (${shortcutLabel('mod', 'alt', '2')})`,
    },
    {
        type: OutputType.Json,
        label: 'JSON',
        shortcut: ['mod', 'alt', '3'],
        title: () => `JSON (${shortcutLabel('mod', 'alt', '3')})`,
    },
    {
        type: OutputType.Table,
        label: 'Table',
        shortcut: ['mod', 'alt', '4'],
        title: () => `Table (${shortcutLabel('mod', 'alt', '4')})`,
    },
    {
        type: OutputType.Queries,
        label: 'SQL',
        shortcut: ['mod', 'alt', '5'],
        title: () => `Query log (${shortcutLabel('mod', 'alt', '5')})`,
    },
];

const ResultTypeControl: Component = () => {
    const [generalStore] = useGeneralStore();
    const [codeStore] = useCodeStore();

    return (
        <div
            class="flex items-center self-center p-0.5 mx-1 h-6 rounded shrink-0 max-w-[min(100%,22rem)] overflow-x-auto soft-scrollbar"
            style={{
                'background-color': generalStore.themeInfo.colors.secondary,
            }}
        >
            <For each={OUTPUT_MODE_OPTIONS}>
                {option => (
                    <button
                        type="button"
                        title={option.title()}
                        class="px-1.5 py-0.5 rounded text-[11px] tracking-wide select-none whitespace-nowrap shrink-0"
                        classList={{
                            'font-semibold brightness-110': codeStore.outputType === option.type,
                            'opacity-70 hover:opacity-100': codeStore.outputType !== option.type,
                        }}
                        style={{
                            'background-color':
                                codeStore.outputType === option.type
                                    ? generalStore.themeInfo.colors.background
                                    : 'transparent',
                        }}
                        on:click={() => codeStore.setOutputType(option.type)}
                    >
                        {option.label}
                    </button>
                )}
            </For>
        </div>
    );
};

export default ResultTypeControl;
