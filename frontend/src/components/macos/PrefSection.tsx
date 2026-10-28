import { Component, JSX, Show } from 'solid-js';
import { useGeneralStore } from '../../stores/general';

const PrefSection: Component<{
    title?: string;
    footer?: string;
    children: JSX.Element;
}> = props => {
    const [generalStore] = useGeneralStore();
    const cardBg = () =>
        `color-mix(in srgb, ${generalStore.themeInfo.colors.secondary} 35%, ${generalStore.themeInfo.colors.background})`;

    return (
        <div class="mb-5 max-w-2xl">
            <Show when={props.title}>
                <div class="text-[11px] uppercase tracking-wide opacity-55 font-semibold px-3 mb-1.5">
                    {props.title}
                </div>
            </Show>
            <div
                class="rounded-[10px] border overflow-hidden flex flex-col [&>*:not(:last-child)]:border-b"
                style={{
                    'background-color': cardBg(),
                    'border-color': generalStore.themeInfo.colors.secondary,
                    '--pref-row-border': generalStore.themeInfo.colors.secondary,
                }}
            >
                {props.children}
            </div>
            <Show when={props.footer}>
                <p class="text-[11px] opacity-55 px-3 mt-1.5 mb-0 leading-snug">{props.footer}</p>
            </Show>
        </div>
    );
};

export default PrefSection;
