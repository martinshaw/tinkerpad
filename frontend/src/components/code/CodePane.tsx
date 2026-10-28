import { Component, createEffect, Match, onCleanup, Show, Switch } from 'solid-js';
import Editor from './Editor';
import Tabs from './tabs/Tabs';
import { OutputType, Pane, useCodeStore } from '../../stores/code';
import Result from './Result';
import ResultDiff from './ResultDiff';
import QueryLog from './QueryLog';
import Split from 'split.js';
import StructuredResult from './StructuredResult';
import JsonResult from './JsonResult';
import TableResult from './TableResult';
import { draggingTabId, dropZone } from './tab-drag';
import { useGeneralStore } from '../../stores/general';

const CodePane: Component<{
    pane: Pane;
    showTitleBar?: boolean;
}> = props => {
    const [codeStore] = useCodeStore();
    const [generalStore] = useGeneralStore();
    var leftPane!: HTMLDivElement;
    var rightPane!: HTMLDivElement;
    var split: Split.Instance;

    const paneTabs = () =>
        props.pane.tabIds
            .map(id => codeStore.tabs.find(tab => tab.id === id))
            .filter((tab): tab is NonNullable<typeof tab> => !!tab);

    const activeTab = () =>
        paneTabs().find(tab => tab.id === props.pane.activeTabId) ?? paneTabs()[0];

    createEffect(() => {
        const tab = activeTab();
        if (!tab || !codeStore.showResult || !tab.result) {
            return;
        }

        split = Split([leftPane, rightPane], {
            sizes: [tab.size ?? 50, 100 - (tab.size ?? 50)],
            direction: codeStore.isHorizontalLayout ? 'horizontal' : 'vertical',
            onDragEnd: ([size]) => codeStore.setTabSize(tab.id, size),
        });

        onCleanup(() => split.destroy());
    });

    return (
        <div
            class="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden"
            on:pointerdown={() => codeStore.focusPane(props.pane.id)}
        >
            <Tabs
                paneId={props.pane.id}
                tabs={paneTabs()}
                currentTab={activeTab()}
                showTitleBar={props.showTitleBar}
            />
            <div
                data-pane-body={props.pane.id}
                class="relative flex flex-1 min-h-0 min-w-0"
                classList={{ 'flex-col': !codeStore.isHorizontalLayout }}
            >
                <Show when={activeTab()} keyed>
                    {tab => (
                        <>
                            <div class="flex-1 min-h-0 min-w-0" ref={leftPane}>
                                <Editor tab={tab} />
                            </div>
                            <Show when={codeStore.showResult}>
                                <Show when={tab.result} keyed>
                                    {result => (
                                        <div
                                            class="flex-1 min-h-0 min-w-0 flex flex-col"
                                            ref={rightPane}
                                        >
                                            <Show when={result.error}>
                                                <div class="px-3 py-2 text-xs text-red-400 whitespace-pre-wrap border-b max-h-32 overflow-auto shrink-0">
                                                    {result.error}
                                                </div>
                                            </Show>
                                            <div class="flex-1 min-h-0 min-w-0 overflow-hidden">
                                                <Switch>
                                                    <Match
                                                        when={
                                                            codeStore.compareResults &&
                                                            codeStore.outputType ===
                                                                OutputType.Raw
                                                        }
                                                    >
                                                        <ResultDiff tab={tab} />
                                                    </Match>
                                                    <Match
                                                        when={
                                                            codeStore.outputType ===
                                                            OutputType.Raw
                                                        }
                                                    >
                                                        <Result tab={tab} />
                                                    </Match>
                                                    <Match
                                                        when={
                                                            codeStore.outputType ===
                                                            OutputType.Structured
                                                        }
                                                    >
                                                        <StructuredResult
                                                            result={result}
                                                            tab={tab}
                                                        />
                                                    </Match>
                                                    <Match
                                                        when={
                                                            codeStore.outputType ===
                                                            OutputType.Json
                                                        }
                                                    >
                                                        <JsonResult tab={tab} />
                                                    </Match>
                                                    <Match
                                                        when={
                                                            codeStore.outputType ===
                                                            OutputType.Table
                                                        }
                                                    >
                                                        <TableResult tab={tab} />
                                                    </Match>
                                                    <Match
                                                        when={
                                                            codeStore.outputType ===
                                                            OutputType.Queries
                                                        }
                                                    >
                                                        <QueryLog result={result} />
                                                    </Match>
                                                </Switch>
                                            </div>
                                        </div>
                                    )}
                                </Show>
                            </Show>
                        </>
                    )}
                </Show>
                <Show
                    when={
                        draggingTabId() &&
                        dropZone()?.kind === 'edge' &&
                        dropZone()?.paneId === props.pane.id
                            ? dropZone()
                            : undefined
                    }
                >
                    {zone => {
                        const edge = () => (zone().kind === 'edge' ? zone().edge : 'right');
                        return (
                            <div
                                class="pointer-events-none absolute z-30 opacity-40"
                                style={{
                                    'background-color': generalStore.themeInfo.colors.primary,
                                    ...(edge() === 'left'
                                        ? { left: 0, top: 0, bottom: 0, width: '22%' }
                                        : edge() === 'right'
                                          ? { right: 0, top: 0, bottom: 0, width: '22%' }
                                          : edge() === 'top'
                                            ? { left: 0, right: 0, top: 0, height: '22%' }
                                            : { left: 0, right: 0, bottom: 0, height: '22%' }),
                                }}
                            />
                        );
                    }}
                </Show>
            </div>
        </div>
    );
};

export default CodePane;
