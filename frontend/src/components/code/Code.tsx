import { Component, createEffect, For, onCleanup, Show } from 'solid-js';
import CodePane from './CodePane';
import StatusBar from './status-bar/StatusBar';
import FileTree, { FileTreeRail } from './FileTree';
import TitleBar from '../TitleBar';
import { useCodeStore } from '../../stores/code';
import { useGeneralStore } from '../../stores/general';
import Split from 'split.js';

const Code: Component = () => {
    const [codeStore] = useCodeStore();
    const [generalStore] = useGeneralStore();
    var paneHost!: HTMLDivElement;
    var paneSplit: Split.Instance | undefined;

    const showTreeChrome = () => Boolean(codeStore.currentTab?.filePath);
    const multiPane = () => codeStore.panes.length > 1;
    const titleBarAbovePanes = () => !generalStore.shouldShowTitleBar() && multiPane();

    createEffect(() => {
        const panes = codeStore.panes;
        if (panes.length !== 2 || !paneHost) {
            return;
        }
        const children = Array.from(paneHost.children) as HTMLElement[];
        if (children.length < 2) {
            return;
        }

        paneSplit = Split(children.slice(0, 2), {
            sizes: [...codeStore.paneSizes],
            direction: codeStore.paneOrientation === 'row' ? 'horizontal' : 'vertical',
            gutterSize: 4,
            onDragEnd: sizes =>
                codeStore.setPaneSizes([sizes[0], sizes[1]] as [number, number]),
        });

        onCleanup(() => {
            paneSplit?.destroy();
            paneSplit = undefined;
        });
    });

    return (
        <div class="flex flex-col flex-1 min-h-0 w-full overflow-hidden">
            <Show when={titleBarAbovePanes()}>
                <TitleBar showNewTab />
            </Show>
            <div class="flex flex-1 min-h-0 min-w-0">
                <Show
                    when={
                        showTreeChrome() && codeStore.showFileTree
                            ? codeStore.currentTab
                            : undefined
                    }
                    keyed
                >
                    {tab => <FileTree tab={tab} />}
                </Show>
                <Show when={showTreeChrome() && !codeStore.showFileTree}>
                    <FileTreeRail />
                </Show>
                <div
                    ref={paneHost}
                    class="flex flex-1 min-h-0 min-w-0"
                    classList={{
                        'flex-col': multiPane() && codeStore.paneOrientation === 'column',
                    }}
                >
                    <For each={codeStore.panes}>
                        {(pane, index) => (
                            <CodePane
                                pane={pane}
                                showTitleBar={
                                    !generalStore.shouldShowTitleBar() &&
                                    !multiPane() &&
                                    index() === 0
                                }
                            />
                        )}
                    </For>
                </div>
            </div>
            <Show when={codeStore.currentTab} keyed>
                {tab => <StatusBar tab={tab} />}
            </Show>
        </div>
    );
};

export default Code;
