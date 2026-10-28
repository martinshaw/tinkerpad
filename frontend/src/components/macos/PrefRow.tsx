import { Component, JSX, Show } from 'solid-js';

const PrefRow: Component<{
    label: string;
    description?: string;
    error?: string;
    children: JSX.Element;
}> = props => {
    return (
        <div
            class="flex items-center gap-4 px-3.5 min-h-[2.4rem] py-2"
            style={{ 'border-color': 'var(--pref-row-border)' }}
        >
            <div class="w-[38%] shrink-0 min-w-0">
                <div class="text-[13px] leading-tight truncate">{props.label}</div>
                <Show when={props.description}>
                    <div class="text-[11px] opacity-55 leading-snug mt-0.5">{props.description}</div>
                </Show>
                <Show when={props.error}>
                    <div class="text-[11px] text-red-500 mt-0.5">{props.error}</div>
                </Show>
            </div>
            <div class="grow min-w-0 flex items-center justify-end gap-2">{props.children}</div>
        </div>
    );
};

export default PrefRow;
