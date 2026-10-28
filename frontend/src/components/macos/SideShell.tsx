import { Component, JSX, Show } from 'solid-js';
import { Screen, useGeneralStore } from '../../stores/general';
import XMark from '../icons/XMark';

export const useSidebarColors = () => {
    const [generalStore] = useGeneralStore();
    return {
        sidebarBg: () =>
            `color-mix(in srgb, ${generalStore.themeInfo.colors.secondary} 55%, ${generalStore.themeInfo.colors.background})`,
        selectedBg: () =>
            `color-mix(in srgb, ${generalStore.themeInfo.colors.primary} 14%, ${generalStore.themeInfo.colors.background})`,
        border: () => generalStore.themeInfo.colors.secondary,
        background: () => generalStore.themeInfo.colors.background,
        primary: () => generalStore.themeInfo.colors.primary,
    };
};

export const SideNavButton: Component<{
    active?: boolean;
    title?: string;
    onClick?: () => void;
    icon?: JSX.Element;
    children: JSX.Element;
    trailing?: JSX.Element;
}> = props => {
    const colors = useSidebarColors();

    return (
        <div class="group relative flex items-center">
            <button
                type="button"
                title={props.title}
                class="w-full flex items-center gap-2 px-2.5 py-[6px] rounded-[7px] text-left transition-[background-color,filter] min-w-0"
                classList={{
                    'font-semibold': !!props.active,
                    'hover:brightness-[1.03]': !props.active,
                    'pr-7': !!props.trailing,
                }}
                style={{
                    'background-color': props.active ? colors.selectedBg() : 'transparent',
                }}
                on:click={() => props.onClick?.()}
            >
                <Show when={props.icon}>
                    <span class="opacity-70 shrink-0 flex w-4 justify-center">{props.icon}</span>
                </Show>
                <span class="truncate grow min-w-0">{props.children}</span>
            </button>
            <Show when={props.trailing}>
                <span class="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100">
                    {props.trailing}
                </span>
            </Show>
        </div>
    );
};

const SideShell: Component<{
    title: string;
    titleIcon?: JSX.Element;
    sidebar: JSX.Element;
    children: JSX.Element;
    contentTitle?: JSX.Element | string;
    trailing?: JSX.Element;
    sidebarWidth?: string;
    contentClass?: string;
}> = props => {
    const [generalStore] = useGeneralStore();
    const colors = useSidebarColors();

    return (
        <div
            class="flex grow min-h-0 w-full overflow-hidden text-[13px] cursor-default select-none"
            style={{
                'background-color': colors.background(),
                color: colors.primary(),
                'font-family':
                    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
            }}
        >
            <aside
                class="shrink-0 flex flex-col border-r min-h-0"
                style={{
                    width: props.sidebarWidth || '14rem',
                    'background-color': colors.sidebarBg(),
                    'border-color': colors.border(),
                }}
            >
                <div class="flex items-center gap-1.5 px-3 h-11 shrink-0">
                    <button
                        type="button"
                        class="p-1 rounded-md hover:brightness-110 shrink-0"
                        title="Back to editor"
                        on:click={() => generalStore.setCurrentScreen(Screen.Code)}
                    >
                        <XMark class="w-4 h-4 opacity-70" />
                    </button>
                    <Show when={props.titleIcon}>
                        <span class="opacity-80 shrink-0 flex items-center">{props.titleIcon}</span>
                    </Show>
                    <h1 class="text-[13px] font-semibold m-0 truncate tracking-tight">
                        {props.title}
                    </h1>
                </div>
                <div class="px-2 pb-3 flex flex-col gap-0.5 min-h-0 grow overflow-auto soft-scrollbar">
                    {props.sidebar}
                </div>
            </aside>

            <section class="flex-1 min-w-0 min-h-0 flex flex-col">
                <header
                    class="h-11 px-6 flex items-center justify-between shrink-0 border-b gap-3"
                    style={{ 'border-color': colors.border() }}
                >
                    <h2 class="text-[13px] font-semibold m-0 tracking-tight truncate min-w-0">
                        {props.contentTitle ?? props.title}
                    </h2>
                    <Show when={props.trailing}>
                        <div class="shrink-0 flex items-center gap-2">{props.trailing}</div>
                    </Show>
                </header>
                <div
                    class={`flex-1 min-h-0 overflow-auto soft-scrollbar ${props.contentClass ?? 'px-6 py-5'}`}
                >
                    {props.children}
                </div>
            </section>
        </div>
    );
};

export default SideShell;
