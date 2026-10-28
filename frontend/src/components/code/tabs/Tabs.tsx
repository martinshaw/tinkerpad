import { Component, createSignal, For, Show } from 'solid-js';
import Tab from './Tab';
import NewTab from './NewTab';
import { Tab as StoreTab, useCodeStore } from '../../../stores/code';
import { useGeneralStore } from '../../../stores/general';
import TitleBar from '../../TitleBar';
import {
    clearTabDrag,
    draggingTabId,
    dropZone,
    edgeFromPoint,
    setDraggingTabId,
    setDropZone,
} from '../tab-drag';

const DRAG_THRESHOLD_PX = 4;

const Tabs: Component<{
    paneId: string;
    tabs: StoreTab[];
    currentTab?: StoreTab;
    showTitleBar?: boolean;
}> = props => {
    const [generalStore] = useGeneralStore();
    const [codeStore] = useCodeStore();
    const [draggingId, setDraggingId] = createSignal<string | null>(null);
    const tabEls = new Map<string, HTMLElement>();
    let stripEl!: HTMLElement;

    const showTabBar = () => props.tabs.length > 1 || codeStore.panes.length > 1;
    const titleBarInTabsRow = () => !!props.showTitleBar;

    const registerEl = (id: string, el: HTMLElement | undefined) => {
        if (el) {
            tabEls.set(id, el);
        } else {
            tabEls.delete(id);
        }
    };

    const onDragStart = (tabId: string, _event: PointerEvent) => {
        if (codeStore.tabs.length < 2) {
            return;
        }

        const startX = _event.clientX;
        const startY = _event.clientY;
        let active = false;
        let moved = false;

        const onMove = (ev: PointerEvent) => {
            if (!active) {
                if (
                    Math.abs(ev.clientX - startX) < DRAG_THRESHOLD_PX &&
                    Math.abs(ev.clientY - startY) < DRAG_THRESHOLD_PX
                ) {
                    return;
                }
                active = true;
                moved = true;
                setDraggingId(tabId);
                setDraggingTabId(tabId);
                codeStore.setCurrentTab(tabId);
                document.body.style.cursor = 'grabbing';
            }

            const pane = codeStore.panes.find(item => item.id === props.paneId);
            if (!pane) {
                return;
            }
            const tabs = props.tabs;
            const fromIndex = pane.tabIds.indexOf(tabId);
            if (fromIndex < 0) {
                return;
            }
            const dragging = tabs.find(tab => tab.id === tabId);
            if (!dragging) {
                return;
            }

            // Prefer strip reorder when pointer is over this strip.
            if (stripEl) {
                const stripRect = stripEl.getBoundingClientRect();
                const overStrip =
                    ev.clientY >= stripRect.top - 8 &&
                    ev.clientY <= stripRect.bottom + 8 &&
                    ev.clientX >= stripRect.left &&
                    ev.clientX <= stripRect.right;

                if (overStrip) {
                    setDropZone({ kind: 'strip', paneId: props.paneId, index: fromIndex });

                    if (fromIndex < pane.tabIds.length - 1) {
                        const nextId = pane.tabIds[fromIndex + 1];
                        const next = tabs.find(tab => tab.id === nextId);
                        if (next && !!next.pinned === !!dragging.pinned) {
                            const nextEl = tabEls.get(next.id);
                            if (nextEl) {
                                const rect = nextEl.getBoundingClientRect();
                                if (ev.clientX > rect.left + rect.width / 2) {
                                    codeStore.moveTab(tabId, fromIndex + 1);
                                    return;
                                }
                            }
                        }
                    }

                    if (fromIndex > 0) {
                        const prevId = pane.tabIds[fromIndex - 1];
                        const prev = tabs.find(tab => tab.id === prevId);
                        if (prev && !!prev.pinned === !!dragging.pinned) {
                            const prevEl = tabEls.get(prev.id);
                            if (prevEl) {
                                const rect = prevEl.getBoundingClientRect();
                                if (ev.clientX < rect.left + rect.width / 2) {
                                    codeStore.moveTab(tabId, fromIndex - 1);
                                }
                            }
                        }
                    }
                    return;
                }
            }

            const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
            const otherStrip = el?.closest('[data-pane-tabs]') as HTMLElement | null;
            if (otherStrip) {
                const targetPaneId = otherStrip.dataset.paneTabs;
                if (targetPaneId && targetPaneId !== props.paneId) {
                    const targetPane = codeStore.panes.find(p => p.id === targetPaneId);
                    if (targetPane) {
                        let insertAt = targetPane.tabIds.length;
                        for (let i = 0; i < targetPane.tabIds.length; i++) {
                            const tEl = otherStrip.querySelector(
                                `[data-tab-id="${targetPane.tabIds[i]}"]`,
                            ) as HTMLElement | null;
                            if (!tEl) {
                                continue;
                            }
                            const rect = tEl.getBoundingClientRect();
                            if (ev.clientX < rect.left + rect.width / 2) {
                                insertAt = i;
                                break;
                            }
                        }
                        setDropZone({
                            kind: 'strip',
                            paneId: targetPaneId,
                            index: insertAt,
                        });
                        return;
                    }
                }
            }

            const body = el?.closest('[data-pane-body]') as HTMLElement | null;
            if (body?.dataset.paneBody) {
                const rect = body.getBoundingClientRect();
                const edge = edgeFromPoint(ev.clientX, ev.clientY, rect);
                if (edge) {
                    setDropZone({
                        kind: 'edge',
                        paneId: body.dataset.paneBody,
                        edge,
                    });
                    return;
                }
            }

            setDropZone(null);
        };

        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            document.body.style.cursor = '';

            const zone = dropZone();
            const dragId = draggingTabId();
            if (dragId && zone?.kind === 'strip' && zone.paneId !== props.paneId) {
                codeStore.moveTabToPane(dragId, zone.paneId, zone.index);
            } else if (dragId && zone?.kind === 'edge') {
                codeStore.splitPaneWithTab(dragId, zone.edge, zone.paneId);
            }

            setDraggingId(null);
            clearTabDrag();

            if (moved) {
                const suppress = (click: MouseEvent) => {
                    click.stopPropagation();
                    click.preventDefault();
                    window.removeEventListener('click', suppress, true);
                };
                window.addEventListener('click', suppress, true);
            }
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
    };

    return (
        <Show when={showTabBar() || titleBarInTabsRow()}>
            <div
                class="border-b flex items-stretch shrink-0"
                style={{ 'border-color': generalStore.themeInfo.colors.secondary }}
                classList={{
                    'justify-between': titleBarInTabsRow(),
                    'border-t': !generalStore.isLinux && showTabBar(),
                }}
            >
                <Show when={showTabBar()}>
                    <nav
                        ref={stripEl}
                        data-pane-tabs={props.paneId}
                        class="flex text-xs grow min-w-0 items-stretch relative"
                        classList={{
                            'cursor-grabbing': draggingId() !== null || draggingTabId() !== null,
                        }}
                        on:pointerenter={() => {
                            const dragId = draggingTabId();
                            if (dragId && props.paneId) {
                                setDropZone({
                                    kind: 'strip',
                                    paneId: props.paneId,
                                    index: props.tabs.length,
                                });
                            }
                        }}
                    >
                        <For each={props.tabs}>
                            {(tab, index) => (
                                <Tab
                                    tab={tab}
                                    isActive={tab.id === props.currentTab?.id}
                                    index={index()}
                                    dragging={
                                        draggingId() === tab.id || draggingTabId() === tab.id
                                    }
                                    registerEl={registerEl}
                                    onDragStart={onDragStart}
                                />
                            )}
                        </For>
                        <Show when={!titleBarInTabsRow()}>
                            <NewTab paneId={props.paneId} />
                        </Show>
                        <Show
                            when={
                                draggingTabId() &&
                                dropZone()?.kind === 'strip' &&
                                dropZone()?.paneId === props.paneId &&
                                !props.tabs.some(t => t.id === draggingTabId())
                            }
                        >
                            <div
                                class="absolute inset-0 pointer-events-none opacity-20"
                                style={{
                                    'background-color': generalStore.themeInfo.colors.primary,
                                }}
                            />
                        </Show>
                    </nav>
                </Show>
                <Show when={titleBarInTabsRow()}>
                    <TitleBar showNewTab />
                </Show>
            </div>
        </Show>
    );
};

export default Tabs;
