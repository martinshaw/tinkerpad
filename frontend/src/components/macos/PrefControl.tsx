import { Component, JSX, splitProps } from 'solid-js';
import { useGeneralStore } from '../../stores/general';

const fieldStyle = (secondary: string, background: string) => ({
    'background-color': `color-mix(in srgb, ${secondary} 28%, ${background})`,
    'border-color': secondary,
    color: 'inherit',
    'box-shadow': 'inset 0 0.5px 0.5px color-mix(in srgb, black 8%, transparent)',
});

export const PrefTextField: Component<
    JSX.InputHTMLAttributes<HTMLInputElement> & { trailing?: JSX.Element }
> = props => {
    const [generalStore] = useGeneralStore();
    const [local, rest] = splitProps(props, ['class', 'trailing', 'type']);

    return (
        <div class="relative w-full max-w-md">
            <input
                {...rest}
                type={local.type || 'text'}
                class={`w-full rounded-[6px] border px-2.5 py-[5px] text-[13px] outline-none focus:brightness-[1.02] ${local.trailing ? 'pr-9' : ''} ${local.class || ''}`}
                style={fieldStyle(
                    generalStore.themeInfo.colors.secondary,
                    generalStore.themeInfo.colors.background,
                )}
            />
            {local.trailing}
        </div>
    );
};

export const PrefSelect: Component<JSX.SelectHTMLAttributes<HTMLSelectElement>> = props => {
    const [generalStore] = useGeneralStore();
    const [local, rest] = splitProps(props, ['class', 'children']);

    return (
        <select
            {...rest}
            class={`w-full max-w-md rounded-[6px] border px-2 py-[5px] text-[13px] outline-none appearance-none bg-[length:12px] bg-[right_8px_center] bg-no-repeat ${local.class || ''}`}
            style={{
                ...fieldStyle(
                    generalStore.themeInfo.colors.secondary,
                    generalStore.themeInfo.colors.background,
                ),
                'background-image': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                'padding-right': '1.6rem',
            }}
        >
            {local.children}
        </select>
    );
};

export const PrefToggle: Component<JSX.InputHTMLAttributes<HTMLInputElement>> = props => {
    const [generalStore] = useGeneralStore();
    const [local, rest] = splitProps(props, ['checked', 'class']);

    return (
        <label class={`relative inline-flex items-center cursor-pointer shrink-0 ${local.class || ''}`}>
            <input {...rest} type="checkbox" class="sr-only peer" checked={local.checked} />
            <span
                class="w-[2.25rem] h-[1.25rem] rounded-full border transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:shadow-sm after:transition-transform peer-checked:after:translate-x-[1rem]"
                style={{
                    'background-color': local.checked
                        ? '#34c759'
                        : `color-mix(in srgb, ${generalStore.themeInfo.colors.secondary} 80%, #888)`,
                    'border-color': local.checked
                        ? '#34c759'
                        : generalStore.themeInfo.colors.secondary,
                }}
            />
        </label>
    );
};

export const PrefButton: Component<
    JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
        variant?: 'default' | 'primary' | 'destructive';
    }
> = props => {
    const [generalStore] = useGeneralStore();
    const [local, rest] = splitProps(props, ['class', 'variant', 'children', 'disabled']);
    const variant = () => local.variant || 'default';

    return (
        <button
            {...rest}
            type={rest.type || 'button'}
            disabled={local.disabled}
            class={`rounded-[6px] px-3.5 py-[5px] text-[13px] border cursor-default disabled:opacity-40 hover:brightness-[1.03] active:brightness-95 ${local.class || ''}`}
            style={{
                'background-color':
                    variant() === 'primary'
                        ? '#0a84ff'
                        : generalStore.themeInfo.colors.background,
                color: variant() === 'primary' ? '#fff' : generalStore.themeInfo.colors.primary,
                'border-color':
                    variant() === 'primary'
                        ? '#0a84ff'
                        : variant() === 'destructive'
                          ? 'color-mix(in srgb, #c0392b 55%, transparent)'
                          : generalStore.themeInfo.colors.secondary,
                'box-shadow':
                    '0 0.5px 0.5px color-mix(in srgb, black 8%, transparent), inset 0 0.5px 0 color-mix(in srgb, white 35%, transparent)',
            }}
        >
            {local.children}
        </button>
    );
};
