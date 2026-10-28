import { Component, For, Show } from 'solid-js';
import { TabResult } from '../../stores/code';
import { useGeneralStore } from '../../stores/general';

const QueryLog: Component<{ result: TabResult }> = props => {
    const [generalStore] = useGeneralStore();

    return (
        <div
            class="h-full overflow-auto soft-scrollbar px-3 py-2 text-xs"
            style={{ color: generalStore.themeInfo.colors.primary }}
        >
            <Show
                when={props.result.queries?.length}
                fallback={
                    <div class="opacity-70 p-2">
                        No queries were recorded. Turn on query log and run a snippet against a
                        booted Laravel app.
                    </div>
                }
            >
                <For each={props.result.queries}>
                    {query => (
                        <div
                            class="border-b py-2 font-mono"
                            style={{ 'border-color': generalStore.themeInfo.colors.secondary }}
                        >
                            <div class="whitespace-pre-wrap">{query.query}</div>
                            <div class="opacity-70 mt-1">
                                {JSON.stringify(query.bindings)} · {Number(query.time).toFixed(2)} ms
                            </div>
                        </div>
                    )}
                </For>
            </Show>
        </div>
    );
};

export default QueryLog;
