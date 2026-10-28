import { Component, createMemo, createResource, createSignal, For, Show } from 'solid-js';
import HistoryIcon from './../icons/History';
import { GetAll } from '../../../wailsjs/go/history/History';
import ViewHistoryLog from './View';
import SideShell, { SideNavButton } from '../macos/SideShell';

const basename = (path: string) => path.split('/').filter(Boolean).pop() || path;

const History: Component = () => {
    const [currentIndex, setCurrentIndex] = createSignal(0);
    const [logs] = createResource(async () => {
        const logs = await GetAll();
        setCurrentIndex(Math.max(0, logs.length - 1));
        return logs;
    });
    const currentLog = createMemo(() => (!logs.loading ? logs()?.[currentIndex()] : undefined));

    const contentTitle = () => {
        const log = currentLog();
        if (!log) {
            return 'History';
        }
        return new Date(log.timestamp).toLocaleString();
    };

    return (
        <SideShell
            title="History"
            titleIcon={<HistoryIcon class="h-4 w-4" />}
            contentTitle={contentTitle()}
            sidebarWidth="15rem"
            sidebar={
                <For
                    each={logs() ?? []}
                    fallback={<div class="px-2.5 py-1.5 opacity-50">No history yet.</div>}
                >
                    {(log, index) => (
                        <SideNavButton
                            active={currentIndex() === index()}
                            title={log.workingDir}
                            onClick={() => setCurrentIndex(index())}
                        >
                            <span class="flex flex-col min-w-0 leading-tight">
                                <span class="truncate">
                                    {new Date(log.timestamp).toLocaleString()}
                                </span>
                                <span class="truncate text-[11px] opacity-55 font-normal">
                                    {basename(log.workingDir)}
                                </span>
                            </span>
                        </SideNavButton>
                    )}
                </For>
            }
        >
            <Show keyed when={currentLog()} fallback={<div class="opacity-55">You have no history log yet.</div>}>
                {log => <ViewHistoryLog log={log} />}
            </Show>
        </SideShell>
    );
};

export default History;
