import { Component, For } from 'solid-js';
import { Theme } from '../../utils/editor/themes';
import { ThemePreview, themesGrouped } from '../../utils/theme/catalog';
import { useGeneralStore } from '../../stores/general';

const ThemeCard: Component<{
    preview: ThemePreview;
    selected: boolean;
    onSelect: () => void;
}> = props => {
    const [generalStore] = useGeneralStore();

    return (
        <button
            type="button"
            class="text-left rounded-[10px] border overflow-hidden transition-[box-shadow,filter] hover:brightness-[1.03]"
            classList={{
                'ring-2 ring-offset-1': props.selected,
            }}
            style={{
                'border-color': props.selected
                    ? '#0a84ff'
                    : generalStore.themeInfo.colors.secondary,
                'box-shadow': props.selected
                    ? '0 0 0 1px color-mix(in srgb, #0a84ff 35%, transparent)'
                    : 'none',
                '--tw-ring-color': '#0a84ff',
                '--tw-ring-offset-color': generalStore.themeInfo.colors.background,
            } as Record<string, string>}
            on:click={() => props.onSelect()}
        >
            <div
                class="px-2.5 pt-2.5 pb-2"
                style={{ 'background-color': props.preview.background }}
            >
                <div
                    class="rounded-[6px] border px-2 py-1.5 mb-2"
                    style={{
                        'border-color': props.preview.selection,
                        'background-color': `color-mix(in srgb, ${props.preview.background} 88%, ${props.preview.foreground})`,
                    }}
                >
                    <div class="flex gap-1 mb-1.5">
                        <For each={props.preview.swatches}>
                            {color => (
                                <span
                                    class="h-2 flex-1 rounded-sm"
                                    style={{ 'background-color': color }}
                                />
                            )}
                        </For>
                    </div>
                    <div
                        class="font-mono text-[10px] leading-tight truncate"
                        style={{ color: props.preview.swatches[0] }}
                    >
                        <span style={{ color: props.preview.swatches[0] }}>fn</span>{' '}
                        <span style={{ color: props.preview.swatches[3] }}>boot</span>
                        <span style={{ color: props.preview.foreground }}>()</span>
                    </div>
                    <div
                        class="font-mono text-[10px] leading-tight truncate"
                        style={{ color: props.preview.swatches[1] }}
                    >
                        "tinkerpad"
                    </div>
                </div>
                <div class="flex items-center justify-between gap-2">
                    <span
                        class="text-[12px] font-medium truncate"
                        style={{ color: props.preview.foreground }}
                    >
                        {props.preview.label}
                    </span>
                    <span class="flex gap-0.5 shrink-0">
                        <For each={props.preview.swatches.slice(0, 4)}>
                            {color => (
                                <span
                                    class="w-2.5 h-2.5 rounded-full border"
                                    style={{
                                        'background-color': color,
                                        'border-color': `color-mix(in srgb, ${props.preview.foreground} 25%, transparent)`,
                                    }}
                                />
                            )}
                        </For>
                    </span>
                </div>
            </div>
        </button>
    );
};

const ThemeGallery: Component<{
    value: Theme;
    onChange: (theme: Theme) => void;
}> = props => {
    const groups = themesGrouped();

    const sections: { key: keyof typeof groups; label: string }[] = [
        { key: 'light', label: 'Light' },
        { key: 'dark', label: 'Dark' },
        { key: 'contrast', label: 'High contrast' },
    ];

    return (
        <div class="flex flex-col gap-4">
            <For each={sections}>
                {section => (
                    <div>
                        <div class="text-[11px] uppercase tracking-wide opacity-55 font-semibold mb-2 px-0.5">
                            {section.label}
                        </div>
                        <div class="grid grid-cols-2 gap-2.5">
                            <For each={groups[section.key]}>
                                {preview => (
                                    <ThemeCard
                                        preview={preview}
                                        selected={props.value === preview.id}
                                        onSelect={() => props.onChange(preview.id)}
                                    />
                                )}
                            </For>
                        </div>
                    </div>
                )}
            </For>
        </div>
    );
};

export default ThemeGallery;
