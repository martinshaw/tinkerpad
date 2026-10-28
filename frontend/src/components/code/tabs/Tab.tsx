import { Component, createSignal, For, onCleanup, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Tab as StoreTab, useCodeStore } from '../../../stores/code';
import XMark from '../../icons/XMark';
import { useGeneralStore } from '../../../stores/general';
import Server from '../../icons/Server';
import Docker from '../../icons/Docker';

type MenuItem = {
    label: string;
    action: () => void | Promise<void>;
    disabled?: boolean;
    sep?: boolean;
};

const Tab: Component<{
    tab: StoreTab;
    isActive: boolean;
    index: number;
    dragging: boolean;
    registerEl: (id: string, el: HTMLElement | undefined) => void;
    onDragStart: (tabId: string, event: PointerEvent) => void;
}> = props => {
    const [generalStore] = useGeneralStore();
    const [codeStore] = useCodeStore();
    const [menu, setMenu] = createSignal<{ x: number; y: number } | null>(null);

    const title = () => {
        if (props.tab.pinned) {
            return '';
        }
        if (props.tab.filePath) {
            return props.tab.filePath.split('/').pop() || props.tab.filePath;
        }
        return (
            props.tab.projectName ??
            props.tab.sshConn?.name ??
            props.tab.containerInfo?.name ??
            props.tab.workingDir.split('/').pop()!
        );
    };

    const closeMenu = () => setMenu(null);

    const onContext = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setMenu({ x: event.clientX, y: event.clientY });
        const onPointer = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (!target?.closest('[data-tab-menu]')) {
                closeMenu();
                document.removeEventListener('mousedown', onPointer);
            }
        };
        document.addEventListener('mousedown', onPointer);
        onCleanup(() => document.removeEventListener('mousedown', onPointer));
    };

    const paneActions = (): MenuItem[] => {
        const paneIndex = codeStore.panes.findIndex(pane =>
            pane.tabIds.includes(props.tab.id),
        );
        if (paneIndex < 0) {
            return [];
        }
        const pane = codeStore.panes[paneIndex];
        const items: MenuItem[] = [];

        if (codeStore.panes.length === 1) {
            const canSplit = pane.tabIds.length > 1;
            items.push(
                {
                    label: 'Move to new pane on the left',
                    action: () => codeStore.splitPaneWithTab(props.tab.id, 'left'),
                    disabled: !canSplit,
                },
                {
                    label: 'Move to new pane on the right',
                    action: () => codeStore.splitPaneWithTab(props.tab.id, 'right'),
                    disabled: !canSplit,
                },
            );
            return items;
        }

        const row = codeStore.paneOrientation === 'row';
        const towardStart = paneIndex > 0;
        const towardEnd = paneIndex < codeStore.panes.length - 1;
        const startDir = row ? 'on the left' : 'above';
        const endDir = row ? 'on the right' : 'below';
        const startPane = towardStart ? codeStore.panes[paneIndex - 1] : undefined;
        const endPane = towardEnd ? codeStore.panes[paneIndex + 1] : undefined;

        if (startPane) {
            items.push({
                label: `Move to pane ${startDir}`,
                action: () => codeStore.moveTabToPane(props.tab.id, startPane.id),
            });
        }
        if (endPane) {
            items.push({
                label: `Move to pane ${endDir}`,
                action: () => codeStore.moveTabToPane(props.tab.id, endPane.id),
            });
        }
        if (startPane) {
            items.push({
                label: `Merge with pane ${startDir}`,
                action: () => codeStore.mergePaneInto(pane.id, startPane.id),
            });
        }
        if (endPane) {
            items.push({
                label: `Merge with pane ${endDir}`,
                action: () => codeStore.mergePaneInto(pane.id, endPane.id),
            });
        }
        return items;
    };

    const items = (): MenuItem[] => {
        const base: MenuItem[] = [
            {
                label: props.tab.pinned ? 'Unpin' : 'Pin',
                action: () => codeStore.togglePinTab(props.tab.id),
            },
            {
                label: props.tab.filePath && codeStore.tabs.length === 1 ? 'Close file' : 'Close',
                action: () => codeStore.closeTab(props.tab.id),
                disabled:
                    !!props.tab.pinned || (codeStore.tabs.length === 1 && !props.tab.filePath),
            },
            {
                label: 'Close others',
                action: () => codeStore.closeOtherTabs(props.tab.id),
            },
            {
                label: 'Close to the left',
                action: () => codeStore.closeTabsToLeft(props.tab.id),
            },
            {
                label: 'Close to the right',
                action: () => codeStore.closeTabsToRight(props.tab.id),
            },
        ];
        const pane = paneActions();
        if (pane.length === 0) {
            return base;
        }
        return [...base, { label: '', action: () => undefined, sep: true }, ...pane];
    };

    return (
        <>
            <div
                ref={el => props.registerEl(props.tab.id, el)}
                data-tab-id={props.tab.id}
                classList={{
                    'relative box-border text-[11px] leading-none h-7 px-2.5 select-none truncate text-center flex items-center group':
                        true,
                    'font-bold border-b': props.isActive,
                    'max-w-56 gap-1 grow min-w-[3.25rem]': !props.tab.pinned,
                    'min-w-7 grow-0 shrink-0 justify-center': !!props.tab.pinned,
                    'cursor-grab active:cursor-grabbing': true,
                    'z-20 opacity-90 shadow-md brightness-110': props.dragging,
                    'transition-[filter] duration-150': !props.dragging,
                    'hover:brightness-110': !props.dragging,
                }}
                style={{
                    'background-color': generalStore.themeInfo.colors.background,
                    color: generalStore.themeInfo.colors.primary,
                    'border-color':
                        props.tab.projectColor ??
                        props.tab.sshConn?.color ??
                        generalStore.themeInfo.colors.primary,
                    'touch-action': 'none',
                }}
                on:click={() => codeStore.setCurrentTab(props.tab.id)}
                on:pointerdown={event => {
                    if (event.button !== 0) {
                        return;
                    }
                    const target = event.target as HTMLElement | null;
                    if (target?.closest('[data-tab-close]')) {
                        return;
                    }
                    props.onDragStart(props.tab.id, event);
                }}
                on:contextmenu={onContext}
                title={
                    props.tab.filePath ||
                    props.tab.projectName ||
                    props.tab.workingDir ||
                    undefined
                }
            >
                <span
                    class="tabular-nums shrink-0 pointer-events-none text-[10px]"
                    classList={{
                        'opacity-40': !props.tab.pinned,
                        'opacity-70 font-semibold': !!props.tab.pinned,
                    }}
                >
                    {props.index + 1}
                </span>
                <Show when={!props.tab.pinned && props.tab.sshConn}>
                    <Server class="w-3 h-3 shrink-0 opacity-70 pointer-events-none" />
                </Show>
                <Show when={!props.tab.pinned && props.tab.containerInfo}>
                    <Docker class="w-3 h-3 shrink-0 opacity-70 pointer-events-none" />
                </Show>
                <Show when={!props.tab.pinned}>
                    <span class="truncate grow text-left pointer-events-none">
                        {title()}
                        <Show when={props.tab.dirty}>
                            <span class="opacity-60"> •</span>
                        </Show>
                    </span>
                </Show>
                <Show when={codeStore.tabs.length > 1 && !props.tab.pinned}>
                    <div
                        data-tab-close
                        on:click={e => {
                            e.stopPropagation();
                            void codeStore.closeTab(props.tab.id);
                        }}
                        on:pointerdown={e => e.stopPropagation()}
                        class="shrink-0 opacity-0 group-hover:opacity-100 hover:brightness-125 cursor-pointer"
                    >
                        <XMark class="w-3 h-3" />
                    </div>
                </Show>
            </div>
            <Show when={menu()}>
                <Portal>
                    <div
                        data-tab-menu
                        class="fixed z-[200] rounded-md border shadow-lg py-1 text-xs"
                        style={{
                            left: `${menu()!.x}px`,
                            top: `${menu()!.y}px`,
                            width: 'max-content',
                            'background-color': generalStore.themeInfo.colors.background,
                            'border-color': generalStore.themeInfo.colors.secondary,
                            color: generalStore.themeInfo.colors.primary,
                        }}
                    >
                        <For each={items()}>
                            {item => (
                                <Show
                                    when={!item.sep}
                                    fallback={
                                        <div
                                            class="my-1 mx-2 h-px"
                                            style={{
                                                'background-color':
                                                    generalStore.themeInfo.colors.secondary,
                                            }}
                                        />
                                    }
                                >
                                    <button
                                        type="button"
                                        class="block w-full text-left px-3 py-1.5 whitespace-nowrap hover:brightness-125 disabled:opacity-40"
                                        disabled={item.disabled}
                                        on:click={() => {
                                            void item.action();
                                            closeMenu();
                                        }}
                                    >
                                        {item.label}
                                    </button>
                                </Show>
                            )}
                        </For>
                    </div>
                </Portal>
            </Show>
        </>
    );
};

export default Tab;
