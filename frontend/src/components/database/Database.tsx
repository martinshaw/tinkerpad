import { Component, createSignal, For, onMount, Show } from 'solid-js';
import { useGeneralStore } from '../../stores/general';
import { useCodeStore } from '../../stores/code';
import { SessionExec } from '../../../wailsjs/go/php/Php';
import { php } from '../../../wailsjs/go/models';
import { sessionSpec } from '../../utils/session/spec';
import { parseRunResult, SqlColumn, TabResult } from '../../utils/result/parse';
import StructuredResult from '../code/StructuredResult';
import DatabaseIcon from '../icons/Database';
import SideShell, { SideNavButton } from '../macos/SideShell';
import { PrefButton } from '../macos/PrefControl';

const Database: Component = () => {
    const [generalStore] = useGeneralStore();
    const [codeStore] = useCodeStore();
    const [tables, setTables] = createSignal<string[]>([]);
    const [table, setTable] = createSignal('');
    const [columns, setColumns] = createSignal<SqlColumn[]>([]);
    const [sql, setSql] = createSignal('select 1');
    const [result, setResult] = createSignal<TabResult>();
    const [error, setError] = createSignal('');
    const [loading, setLoading] = createSignal(false);

    const run = async (request: Record<string, unknown>) => {
        const tab = codeStore.currentTab;
        setLoading(true);
        setError('');
        try {
            const response = await SessionExec(
                tab.id,
                sessionSpec(tab),
                new php.SessionRequest(request),
            );
            const parsed = parseRunResult(response);
            if (parsed.tables) {
                setTables(parsed.tables);
            }
            if (parsed.columns) {
                setColumns(parsed.columns);
            }
            if (parsed.error) {
                setError(parsed.error);
            }
            if (request.op === 'query' || parsed.outputs.length) {
                setResult(parsed);
            }
            return parsed;
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        } finally {
            setLoading(false);
        }
    };

    const loadTables = () => run({ op: 'tables' });
    const loadColumns = async (name: string) => {
        setTable(name);
        if (/^[A-Za-z0-9_]+$/.test(name)) {
            setSql(`select * from \`${name}\` limit 50`);
        }
        await run({ op: 'columns', table: name });
    };

    onMount(() => {
        loadTables();
    });

    const workspace = () =>
        codeStore.currentTab.projectName || codeStore.currentTab.workingDir;

    return (
        <SideShell
            title="Database"
            titleIcon={<DatabaseIcon class="h-4 w-4" />}
            contentTitle={table() || 'Query'}
            sidebarWidth="15rem"
            trailing={
                <label class="flex items-center gap-2 text-[12px]">
                    <input
                        type="checkbox"
                        checked={codeStore.currentTab.allowWrites === true}
                        on:change={e =>
                            codeStore.setAllowWrites(codeStore.currentTabId, e.currentTarget.checked)
                        }
                    />
                    Allow writes
                </label>
            }
            sidebar={
                <>
                    <div class="px-0.5 mb-1">
                        <div class="text-[11px] opacity-55 truncate px-1 mb-1.5" title={workspace()}>
                            {workspace()}
                        </div>
                        <PrefButton
                            class="!w-full !max-w-none"
                            on:click={loadTables}
                            disabled={loading()}
                        >
                            {loading() ? 'Working…' : 'Load tables'}
                        </PrefButton>
                    </div>
                    <For
                        each={tables()}
                        fallback={
                            <div class="px-2.5 py-1.5 opacity-50">
                                Load tables from the booted Laravel app.
                            </div>
                        }
                    >
                        {name => (
                            <SideNavButton
                                active={table() === name}
                                title={name}
                                onClick={() => loadColumns(name)}
                            >
                                {name}
                            </SideNavButton>
                        )}
                    </For>
                </>
            }
        >
            <div class="flex flex-col gap-3 max-w-4xl">
                <Show when={columns().length}>
                    <div class="text-[11px] opacity-70 leading-relaxed">
                        <For each={columns()}>
                            {column => (
                                <span class="mr-3">
                                    {column.name}
                                    <Show when={column.type}> {column.type}</Show>
                                </span>
                            )}
                        </For>
                    </div>
                </Show>
                <textarea
                    class="w-full h-28 rounded-[8px] p-2.5 font-mono text-xs border outline-none"
                    style={{
                        'background-color': `color-mix(in srgb, ${generalStore.themeInfo.colors.secondary} 28%, ${generalStore.themeInfo.colors.background})`,
                        'border-color': generalStore.themeInfo.colors.secondary,
                    }}
                    value={sql()}
                    on:input={e => setSql(e.currentTarget.value)}
                />
                <PrefButton
                    class="!w-full !max-w-none"
                    variant="primary"
                    disabled={loading()}
                    on:click={() =>
                        run({
                            op: 'query',
                            sql: sql(),
                            allowWrites: codeStore.currentTab.allowWrites === true,
                            queryLog: true,
                        })
                    }
                >
                    Run SQL
                </PrefButton>
                <Show when={error()}>
                    <div class="text-xs text-red-400 whitespace-pre-wrap">{error()}</div>
                </Show>
                <Show when={(result()?.outputs.length ?? 0) > 0}>
                    <StructuredResult result={result()!} />
                </Show>
            </div>
        </SideShell>
    );
};

export default Database;
