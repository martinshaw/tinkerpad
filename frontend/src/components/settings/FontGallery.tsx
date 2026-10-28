import { Component, For, Show, createMemo, createSignal } from 'solid-js';
import { useGeneralStore } from '../../stores/general';
import { FontOption, fontsGrouped, matchFontOption } from '../../utils/editor/fonts';
import { PrefTextField } from '../macos/PrefControl';

const SAMPLE = 'User::query()->pluck("id");';
const SAMPLE_SUB = 'abcdefghijklmnopqrstuvwxyz 0123456789';
const ACCENT = '#0a84ff';

const FontCard: Component<{
    font: FontOption;
    selected: boolean;
    onSelect: () => void;
}> = props => {
    const [generalStore] = useGeneralStore();
    const [hovered, setHovered] = createSignal(false);
    const accented = () => props.selected || hovered();

    return (
        <button
            type="button"
            class="text-left rounded-[10px] border overflow-hidden transition-[border-color,box-shadow]"
            classList={{ 'ring-2 ring-offset-1': props.selected }}
            style={
                {
                    'border-color': accented()
                        ? ACCENT
                        : generalStore.themeInfo.colors.secondary,
                    'box-shadow': props.selected
                        ? `0 0 0 1px color-mix(in srgb, ${ACCENT} 35%, transparent)`
                        : hovered()
                          ? `0 0 0 1px color-mix(in srgb, ${ACCENT} 22%, transparent)`
                          : 'none',
                    'background-color': generalStore.themeInfo.colors.background,
                    '--tw-ring-color': ACCENT,
                    '--tw-ring-offset-color': generalStore.themeInfo.colors.background,
                } as Record<string, string>
            }
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            on:click={() => props.onSelect()}
        >
            <div class="px-3 pt-2.5 pb-2.5">
                <div class="flex items-baseline justify-between gap-2 mb-1.5">
                    <span class="text-[12px] font-semibold truncate">{props.font.label}</span>
                    <Show when={props.font.kind === 'monospace'}>
                        <span class="text-[9px] uppercase tracking-wide opacity-45 shrink-0">
                            Mono
                        </span>
                    </Show>
                </div>
                <div
                    class="text-[13px] leading-snug truncate mb-1"
                    style={{ 'font-family': props.font.family }}
                >
                    {SAMPLE}
                </div>
                <div
                    class="text-[11px] leading-snug opacity-55 truncate"
                    style={{ 'font-family': props.font.family }}
                >
                    {SAMPLE_SUB}
                </div>
            </div>
        </button>
    );
};

const FontGallery: Component<{
    value: string;
    onChange: (family: string) => void;
}> = props => {
    const [generalStore] = useGeneralStore();
    const groups = createMemo(() => fontsGrouped(true));
    const matched = createMemo(() => matchFontOption(props.value));
    const isCustom = createMemo(() => !matched());

    return (
        <div class="flex flex-col gap-4">
            <For each={groups()}>
                {group => (
                    <div>
                        <div class="text-[11px] uppercase tracking-wide opacity-55 font-semibold mb-2 px-0.5">
                            {group.label}
                            <Show when={group.kind === 'monospace'}>
                                <span class="ml-1.5 opacity-70 normal-case tracking-normal font-normal">
                                    · recommended for code
                                </span>
                            </Show>
                        </div>
                        <div class="grid grid-cols-2 gap-2.5">
                            <For each={group.fonts}>
                                {font => (
                                    <FontCard
                                        font={font}
                                        selected={matched()?.id === font.id}
                                        onSelect={() => props.onChange(font.family)}
                                    />
                                )}
                            </For>
                        </div>
                    </div>
                )}
            </For>

            <div
                class="rounded-[10px] border px-3 py-2.5"
                style={{ 'border-color': generalStore.themeInfo.colors.secondary }}
            >
                <div class="text-[11px] uppercase tracking-wide opacity-55 font-semibold mb-1.5">
                    Custom
                </div>
                <PrefTextField
                    class="!max-w-none"
                    value={props.value}
                    placeholder="Menlo, monospace"
                    on:input={e => props.onChange(e.currentTarget.value)}
                />
                <Show when={isCustom() && props.value.trim()}>
                    <div
                        class="mt-2 text-[13px] truncate opacity-80"
                        style={{ 'font-family': props.value }}
                    >
                        {SAMPLE}
                    </div>
                </Show>
            </div>
        </div>
    );
};

export default FontGallery;
