import { Component, createResource, createSignal, For, Show } from 'solid-js';
import { ListDirectory } from '../../../wailsjs/go/dialog/Dialog';
import { Tab, useCodeStore } from '../../stores/code';
import { useGeneralStore } from '../../stores/general';
import FolderCode from '../icons/FolderCode';
import FolderOpen from '../icons/FolderOpen';
import FileJson from '../icons/FileJson';
import { shortcutLabel } from '../../utils/hotkey/mod';

type DirEntry = { name: string; path: string; isDir: boolean };

const basename = (path: string) => path.split('/').filter(Boolean).pop() || path;

const dirname = (path: string) => {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/') || '/';
};

const isUnder = (child: string, parent: string) => {
    if (!child || !parent) {
        return false;
    }
    const prefix = parent.endsWith('/') ? parent : `${parent}/`;
    return child === parent || child.startsWith(prefix);
};

const treeRootFor = (tab: Tab) => {
    if (!tab.filePath) {
        return tab.workingDir;
    }
    if (tab.workingDir && isUnder(tab.filePath, tab.workingDir)) {
        return tab.workingDir;
    }
    return dirname(tab.filePath);
};

const TreeNode: Component<{
    entry: DirEntry;
    depth: number;
    activePath?: string;
    onOpenFile: (path: string) => void;
}> = props => {
    const [generalStore] = useGeneralStore();
    const [expanded, setExpanded] = createSignal(false);
    const [children] = createResource(
        () => (props.entry.isDir && expanded() ? props.entry.path : null),
        async path => (path ? ((await ListDirectory(path)) as DirEntry[]) : []),
    );

    const selected = () => props.activePath === props.entry.path;
    const isPhp = () => props.entry.name.toLowerCase().endsWith('.php');

    return (
        <div>
            <button
                type="button"
                class="w-full flex items-center gap-1 pr-2 py-[3px] text-left text-[11px] leading-tight hover:brightness-125 truncate"
                classList={{ 'font-semibold': selected() }}
                style={{
                    'padding-left': `${6 + props.depth * 12}px`,
                    'background-color': selected()
                        ? generalStore.themeInfo.colors.secondary
                        : 'transparent',
                }}
                title={props.entry.path}
                on:click={() => {
                    if (props.entry.isDir) {
                        setExpanded(!expanded());
                        return;
                    }
                    if (isPhp()) {
                        props.onOpenFile(props.entry.path);
                    }
                }}
            >
                <Show when={props.entry.isDir} fallback={<span class="w-3 shrink-0" />}>
                    <span
                        class="w-3 shrink-0 text-[9px] opacity-60 inline-flex justify-center transition-transform"
                        classList={{ 'rotate-90': expanded() }}
                    >
                        ▸
                    </span>
                </Show>
                <Show
                    when={props.entry.isDir}
                    fallback={
                        <FileJson
                            class="w-3 h-3 shrink-0"
                            classList={{ 'opacity-70': isPhp(), 'opacity-35': !isPhp() }}
                        />
                    }
                >
                    <Show when={expanded()} fallback={<FolderCode class="w-3 h-3 shrink-0 opacity-70" />}>
                        <FolderOpen class="w-3 h-3 shrink-0 opacity-70" />
                    </Show>
                </Show>
                <span class="truncate min-w-0">{props.entry.name}</span>
            </button>
            <Show when={props.entry.isDir && expanded()}>
                <Show when={children.loading}>
                    <div
                        class="text-[10px] opacity-50 py-0.5"
                        style={{ 'padding-left': `${18 + props.depth * 12}px` }}
                    >
                        Loading…
                    </div>
                </Show>
                <For each={children() || []}>
                    {child => (
                        <TreeNode
                            entry={child}
                            depth={props.depth + 1}
                            activePath={props.activePath}
                            onOpenFile={props.onOpenFile}
                        />
                    )}
                </For>
            </Show>
        </div>
    );
};

const FileTree: Component<{ tab: Tab }> = props => {
    const [generalStore] = useGeneralStore();
    const [codeStore] = useCodeStore();
    const root = () => treeRootFor(props.tab);

    const [entries, { refetch }] = createResource(root, async path => {
        if (!path) {
            return [] as DirEntry[];
        }
        return (await ListDirectory(path)) as DirEntry[];
    });

    const openFile = (path: string) => {
        void codeStore.openPhpFile(path, false, true);
    };

    return (
        <aside
            class="flex flex-col shrink-0 min-h-0 border-r"
            style={{
                width: '13.5rem',
                'border-color': generalStore.themeInfo.colors.secondary,
                'background-color': generalStore.themeInfo.colors.background,
                color: generalStore.themeInfo.colors.primary,
            }}
        >
            <div
                class="flex items-center gap-1 px-2 h-7 border-b shrink-0 text-[11px]"
                style={{ 'border-color': generalStore.themeInfo.colors.secondary }}
            >
                <FolderCode class="w-3.5 h-3.5 opacity-70 shrink-0" />
                <span class="truncate grow font-medium" title={root()}>
                    {basename(root())}
                </span>
                <button
                    type="button"
                    class="opacity-60 hover:opacity-100 px-1 text-[10px]"
                    title="Refresh"
                    on:click={() => refetch()}
                >
                    ↻
                </button>
                <button
                    type="button"
                    class="opacity-60 hover:opacity-100 px-1 text-[10px]"
                    title={`Hide file tree (${shortcutLabel('mod', 'B')})`}
                    on:click={() => codeStore.toggleFileTree()}
                >
                    ⟨
                </button>
            </div>
            <div class="flex-1 min-h-0 overflow-auto py-1">
                <Show when={entries.error}>
                    <div class="px-2 py-1 text-[10px] opacity-60">Could not read folder</div>
                </Show>
                <Show when={entries.loading && !entries()}>
                    <div class="px-2 py-1 text-[10px] opacity-50">Loading…</div>
                </Show>
                <For each={entries() || []}>
                    {entry => (
                        <TreeNode
                            entry={entry}
                            depth={0}
                            activePath={props.tab.filePath}
                            onOpenFile={openFile}
                        />
                    )}
                </For>
            </div>
        </aside>
    );
};

export const FileTreeRail: Component = () => {
    const [generalStore] = useGeneralStore();
    const [codeStore] = useCodeStore();

    return (
        <button
            type="button"
            class="shrink-0 border-r flex items-center justify-center w-5 hover:brightness-110 text-[10px] opacity-70"
            style={{
                'border-color': generalStore.themeInfo.colors.secondary,
                'background-color': generalStore.themeInfo.colors.background,
                color: generalStore.themeInfo.colors.primary,
            }}
            title={`Show file tree (${shortcutLabel('mod', 'B')})`}
            on:click={() => codeStore.toggleFileTree()}
        >
            ⟩
        </button>
    );
};

export default FileTree;
