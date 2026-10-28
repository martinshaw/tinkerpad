import { createStore, SetStoreFunction } from 'solid-js/store';
import { GetData, Save } from '../../wailsjs/go/store/Store';
import { createEffect } from 'solid-js';
import { v4 } from 'uuid';
import { useSettingsStore } from './settings';
import { Screen, useGeneralStore } from './general';
import * as models from '../../wailsjs/go/models';
import {
    GetDockerFrameworkInfo,
    GetFrameworkInfo,
    GetRemoteFrameworkInfo,
    RunCode,
    RunDockerCode,
    RunRemoteCode,
    SessionExec,
    StopSession,
} from '../../wailsjs/go/php/Php';
import { AddLog } from '../../wailsjs/go/history/History';
import { Connect as ConnectSsh, ConnExists, GetAll as GetSshConfigs, RemoveConn } from '../../wailsjs/go/ssh/Ssh';
import {
    Connect as ConnectDocker,
    GetAll as GetDockerContainers,
    GetContainerPhpBinaryPath,
    Save as SaveDockerContainers,
} from '../../wailsjs/go/docker/Docker';
import { FrameworkInfo } from '../components/code/status-bar/FrameworkInfoLabel';
import { parseRunResult, RunEnvelope, TabResult } from '../utils/result/parse';
import { sessionSpec } from '../utils/session/spec';
import { codeUntilLine } from '../utils/editor/code-range';
import { projects } from '../../wailsjs/go/models';
import {
    Error as ShowError,
    OpenPhpFile,
    ReadTextFile,
    SavePhpFile,
    WriteTextFile,
} from '../../wailsjs/go/dialog/Dialog';
import { ListHerdSites } from '../../wailsjs/go/settings/Settings';

export enum Layout {
    Vertical = 'vertical',
    Horizontal = 'horizontal',
}

export enum OutputType {
    Raw = 'raw',
    Structured = 'structured',
    Json = 'json',
    Table = 'table',
    Queries = 'queries',
}

export type { QueryEntry, SqlColumn, TabResult } from '../utils/result/parse';

const [settingsStore] = useSettingsStore();
const [generalStore] = useGeneralStore();

export type PaneEdge = 'left' | 'right' | 'top' | 'bottom';

export type Pane = {
    id: string;
    tabIds: string[];
    activeTabId: string;
};

export type PaneOrientation = 'row' | 'column';

const makePane = (tabIds: string[], activeTabId?: string): Pane => ({
    id: v4(),
    tabIds: [...tabIds],
    activeTabId:
        activeTabId && tabIds.includes(activeTabId) ? activeTabId : tabIds[0] ?? '',
});

const getDefaultData = () => {
    const tab = getNewTab();
    const pane = makePane([tab.id], tab.id);

    return {
        tabs: [tab],
        currentTabId: tab.id,
        panes: [pane],
        focusedPaneId: pane.id,
        paneOrientation: 'row' as PaneOrientation,
        paneSizes: [50, 50] as [number, number],
        layout: Layout.Horizontal,
        showResult: false,
        outputType: OutputType.Structured,
        compareResults: false,
        showFileTree: true,
        recentDirs: [] as string[],
        recentFiles: [] as string[],
    };
};

const getNewTab = (): Tab => {
    return {
        id: v4(),
        workingDir: settingsStore.app.defaultWorkingDir,
        code: '<?php\n\n',
        loading: false,
        size: 50,
        persistent: true,
        queryLog: false,
        dumpAssignments: false,
        dumpLogs: true,
        alignAssignmentOutput: false,
        allowWrites: false,
        phpBinaryPath: '',
        pinned: false,
        filePath: '',
        dirty: false,
    };
};

const rawData = await GetData(models.store.StoreName.Code);

const dirname = (path: string) => {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/') || '/';
};

const basename = (path: string) => path.split('/').filter(Boolean).pop() || path;

const rememberDir = (workingDir: string) => {
    if (!workingDir) {
        return;
    }
    const next = [workingDir, ...(store.recentDirs || []).filter(dir => dir !== workingDir)].slice(
        0,
        12,
    );
    setStore('recentDirs', next);
};

const rememberFile = (filePath: string) => {
    if (!filePath) {
        return;
    }
    const next = [filePath, ...(store.recentFiles || []).filter(path => path !== filePath)].slice(
        0,
        12,
    );
    setStore('recentFiles', next);
};

const pinnedFirst = (tabs: Tab[]) => {
    const pinned = tabs.filter(tab => tab.pinned);
    const rest = tabs.filter(tab => !tab.pinned);
    return [...pinned, ...rest];
};

const pinnedFirstIds = (tabIds: string[], tabs: Tab[]) => {
    const byId = new Map(tabs.map(tab => [tab.id, tab]));
    const pinned = tabIds.filter(id => byId.get(id)?.pinned);
    const rest = tabIds.filter(id => !byId.get(id)?.pinned);
    return [...pinned, ...rest];
};

const findPaneIndexForTab = (panes: Pane[], tabId: string) =>
    panes.findIndex(pane => pane.tabIds.includes(tabId));

const syncCurrentFromFocused = () => {
    const pane = store.panes.find(item => item.id === store.focusedPaneId) ?? store.panes[0];
    if (!pane) {
        return;
    }
    const active =
        pane.activeTabId && pane.tabIds.includes(pane.activeTabId)
            ? pane.activeTabId
            : pane.tabIds[0];
    if (active) {
        setStore('currentTabId', active);
        if (pane.activeTabId !== active) {
            setStore('panes', p => p.id === pane.id, 'activeTabId', active);
        }
    }
};

const removeTabFromPanes = (tabId: string) => {
    let panes = store.panes.map(pane => {
        if (!pane.tabIds.includes(tabId)) {
            return pane;
        }
        const tabIds = pane.tabIds.filter(id => id !== tabId);
        let activeTabId = pane.activeTabId;
        if (activeTabId === tabId) {
            const idx = pane.tabIds.indexOf(tabId);
            activeTabId = tabIds[Math.min(idx, tabIds.length - 1)] ?? '';
        }
        return { ...pane, tabIds, activeTabId };
    });

    const emptied = panes.filter(pane => pane.tabIds.length === 0);
    if (emptied.length && panes.length > 1) {
        panes = panes.filter(pane => pane.tabIds.length > 0);
        if (panes.length === 1) {
            setStore('paneOrientation', 'row');
            setStore('paneSizes', [50, 50]);
        }
        if (!panes.some(pane => pane.id === store.focusedPaneId)) {
            setStore('focusedPaneId', panes[0].id);
        }
    }

    setStore('panes', panes);
    syncCurrentFromFocused();
};

const newCodeStore: CodeStore = {
    outputType: OutputType.Structured,
    compareResults: false,
    showFileTree: true,
    recentDirs: [],
    recentFiles: [],
    panes: [],
    focusedPaneId: '',
    paneOrientation: 'row',
    paneSizes: [50, 50],
    ...(rawData ? JSON.parse(rawData) : getDefaultData()),
    createNewTab(atCurrentPosition: boolean = false, paneId?: string) {
        if (generalStore.currentScreen !== Screen.Code) {
            generalStore.setCurrentScreen(Screen.Code);
        }
        const newTab = getNewTab();
        const targetPaneId = paneId || store.focusedPaneId || store.panes[0]?.id;
        const paneIndex = store.panes.findIndex(pane => pane.id === targetPaneId);
        const pane = store.panes[paneIndex] ?? store.panes[0];

        const nextTabs = store.tabs.slice();
        const insertAfterGlobal = store.tabs.findIndex(tab => tab.id === store.currentTabId);
        if (atCurrentPosition && insertAfterGlobal >= 0) {
            nextTabs.splice(insertAfterGlobal + 1, 0, newTab);
        } else {
            nextTabs.push(newTab);
        }
        setStore('tabs', pinnedFirst(nextTabs));

        if (pane) {
            const tabIds = pane.tabIds.slice();
            const activeIdx = tabIds.indexOf(pane.activeTabId);
            if (atCurrentPosition && activeIdx >= 0) {
                tabIds.splice(activeIdx + 1, 0, newTab.id);
            } else {
                tabIds.push(newTab.id);
            }
            setStore('panes', paneIndex >= 0 ? paneIndex : 0, {
                ...pane,
                tabIds: pinnedFirstIds(tabIds, pinnedFirst(nextTabs)),
                activeTabId: newTab.id,
            });
            setStore('focusedPaneId', pane.id);
        } else {
            const created = makePane([newTab.id], newTab.id);
            setStore('panes', [created]);
            setStore('focusedPaneId', created.id);
        }
        setStore('currentTabId', newTab.id);
    },
    setCurrentTab(tabId: string) {
        const paneIndex = findPaneIndexForTab(store.panes, tabId);
        if (paneIndex >= 0) {
            const pane = store.panes[paneIndex];
            setStore('focusedPaneId', pane.id);
            setStore('panes', paneIndex, 'activeTabId', tabId);
        }
        setStore('currentTabId', tabId);
    },
    focusPane(paneId: string) {
        if (!store.panes.some(pane => pane.id === paneId)) {
            return;
        }
        setStore('focusedPaneId', paneId);
        syncCurrentFromFocused();
    },
    setPaneActiveTab(paneId: string, tabId: string) {
        const paneIndex = store.panes.findIndex(pane => pane.id === paneId);
        if (paneIndex < 0) {
            return;
        }
        const pane = store.panes[paneIndex];
        if (!pane.tabIds.includes(tabId)) {
            return;
        }
        setStore('panes', paneIndex, 'activeTabId', tabId);
        setStore('focusedPaneId', paneId);
        setStore('currentTabId', tabId);
    },
    moveTabToPane(tabId: string, targetPaneId: string, index?: number) {
        const sourceIndex = findPaneIndexForTab(store.panes, tabId);
        const targetIndex = store.panes.findIndex(pane => pane.id === targetPaneId);
        if (sourceIndex < 0 || targetIndex < 0) {
            return;
        }
        const source = store.panes[sourceIndex];
        const target = store.panes[targetIndex];
        if (source.id === target.id) {
            if (typeof index === 'number') {
                store.moveTab(tabId, index);
            }
            return;
        }

        const sourceIds = source.tabIds.filter(id => id !== tabId);
        let sourceActive = source.activeTabId;
        if (sourceActive === tabId) {
            const oldIdx = source.tabIds.indexOf(tabId);
            sourceActive = sourceIds[Math.min(oldIdx, sourceIds.length - 1)] ?? '';
        }

        const targetIds = target.tabIds.filter(id => id !== tabId);
        const insertAt =
            typeof index === 'number'
                ? Math.max(0, Math.min(index, targetIds.length))
                : targetIds.length;
        targetIds.splice(insertAt, 0, tabId);

        let panes: Pane[] = store.panes.map((pane, i) => {
            if (i === sourceIndex) {
                return { ...pane, tabIds: sourceIds, activeTabId: sourceActive };
            }
            if (i === targetIndex) {
                return { ...pane, tabIds: targetIds, activeTabId: tabId };
            }
            return pane;
        });

        if (sourceIds.length === 0) {
            panes = panes.filter(pane => pane.id !== source.id);
            setStore('paneOrientation', 'row');
            setStore('paneSizes', [50, 50]);
        }

        setStore('panes', panes);
        setStore('focusedPaneId', target.id);
        setStore('currentTabId', tabId);
    },
    splitPaneWithTab(tabId: string, edge: PaneEdge, overPaneId?: string) {
        const sourceIndex = findPaneIndexForTab(store.panes, tabId);
        if (sourceIndex < 0) {
            return;
        }
        const orientation: PaneOrientation =
            edge === 'left' || edge === 'right' ? 'row' : 'column';
        const placeFirst = edge === 'left' || edge === 'top';

        if (store.panes.length === 1) {
            const source = store.panes[0];
            if (source.tabIds.length < 2) {
                return;
            }
            const remaining = source.tabIds.filter(id => id !== tabId);
            const sourceActive =
                source.activeTabId === tabId
                    ? remaining[0]
                    : remaining.includes(source.activeTabId)
                      ? source.activeTabId
                      : remaining[0];
            const remainingPane: Pane = {
                ...source,
                tabIds: remaining,
                activeTabId: sourceActive,
            };
            const newPane = makePane([tabId], tabId);
            const panes = placeFirst ? [newPane, remainingPane] : [remainingPane, newPane];
            setStore('panes', panes);
            setStore('paneOrientation', orientation);
            setStore('paneSizes', [50, 50]);
            setStore('focusedPaneId', newPane.id);
            setStore('currentTabId', tabId);
            return;
        }

        // Already split: move into the pane toward that edge.
        setStore('paneOrientation', orientation);
        const overIdx = overPaneId
            ? store.panes.findIndex(pane => pane.id === overPaneId)
            : -1;
        let targetIndex = placeFirst ? 0 : store.panes.length - 1;
        if (overIdx >= 0) {
            if (placeFirst && overIdx > 0) {
                targetIndex = overIdx - 1;
            } else if (!placeFirst && overIdx < store.panes.length - 1) {
                targetIndex = overIdx + 1;
            } else {
                targetIndex = overIdx;
            }
        }
        store.moveTabToPane(tabId, store.panes[targetIndex].id);
    },
    setPaneSizes(sizes: [number, number]) {
        setStore('paneSizes', sizes);
    },
    mergePaneInto(sourcePaneId: string, targetPaneId: string) {
        if (sourcePaneId === targetPaneId) {
            return;
        }
        const source = store.panes.find(pane => pane.id === sourcePaneId);
        const target = store.panes.find(pane => pane.id === targetPaneId);
        if (!source || !target) {
            return;
        }
        const moving = source.tabIds.slice();
        for (const tabId of moving) {
            store.moveTabToPane(tabId, targetPaneId);
        }
    },
    async closeTab(tabId: string) {
        const tab = store.tabs.find(item => item.id === tabId);
        if (!tab || tab.pinned) {
            return;
        }

        // Sole open PHP file: detach it and return to a scratchpad in the same workspace.
        if (store.tabs.length === 1) {
            if (tab.filePath) {
                await store.clearFile(tabId);
            }
            return;
        }

        await StopSession(tabId);

        if (tab.sshConn) {
            RemoveConn(tab.sshConn.uuid);
        }

        removeTabFromPanes(tabId);
        setStore(
            'tabs',
            store.tabs.filter(item => item.id !== tabId),
        );
    },
    async clearFile(tabId: string) {
        const tab = store.tabs.find(item => item.id === tabId);
        if (!tab?.filePath) {
            return;
        }
        setStore('tabs', item => item.id === tabId, 'filePath', '');
        setStore('tabs', item => item.id === tabId, 'code', '<?php\n\n');
        setStore('tabs', item => item.id === tabId, 'dirty', false);
    },
    async openScratchpad(tabId: string, workingDir?: string) {
        await store.switchToLocal(tabId, workingDir, false);
        setStore('tabs', item => item.id === tabId, 'code', '<?php\n\n');
        setStore('tabs', item => item.id === tabId, 'dirty', false);
    },
    async closeTabsToLeft(tabId: string) {
        const pane = store.panes.find(item => item.tabIds.includes(tabId));
        if (!pane) {
            return;
        }
        const index = pane.tabIds.indexOf(tabId);
        if (index <= 0) {
            return;
        }
        const byId = new Map(store.tabs.map(tab => [tab.id, tab]));
        const targets = pane.tabIds
            .slice(0, index)
            .map(id => byId.get(id))
            .filter((tab): tab is Tab => !!tab && !tab.pinned);
        for (const tab of targets) {
            await store.closeTab(tab.id);
        }
    },
    async closeTabsToRight(tabId: string) {
        const pane = store.panes.find(item => item.tabIds.includes(tabId));
        if (!pane) {
            return;
        }
        const index = pane.tabIds.indexOf(tabId);
        if (index < 0 || index >= pane.tabIds.length - 1) {
            return;
        }
        const byId = new Map(store.tabs.map(tab => [tab.id, tab]));
        const targets = pane.tabIds
            .slice(index + 1)
            .map(id => byId.get(id))
            .filter((tab): tab is Tab => !!tab && !tab.pinned);
        for (const tab of [...targets].reverse()) {
            await store.closeTab(tab.id);
        }
    },
    async closeOtherTabs(tabId: string) {
        const pane = store.panes.find(item => item.tabIds.includes(tabId));
        if (!pane) {
            return;
        }
        const byId = new Map(store.tabs.map(tab => [tab.id, tab]));
        const targets = pane.tabIds
            .filter(id => id !== tabId)
            .map(id => byId.get(id))
            .filter((tab): tab is Tab => !!tab && !tab.pinned);
        for (const tab of [...targets].reverse()) {
            await store.closeTab(tab.id);
        }
    },
    togglePinTab(tabId: string) {
        const tab = store.tabs.find(item => item.id === tabId);
        if (!tab) {
            return;
        }
        const pinned = !tab.pinned;
        setStore('tabs', item => item.id === tabId, 'pinned', pinned);
        setStore('tabs', pinnedFirst(store.tabs.slice()));
        const paneIndex = findPaneIndexForTab(store.panes, tabId);
        if (paneIndex >= 0) {
            const pane = store.panes[paneIndex];
            setStore('panes', paneIndex, 'tabIds', pinnedFirstIds(pane.tabIds, store.tabs));
        }
    },
    moveTab(tabId: string, toIndex: number) {
        const paneIndex = findPaneIndexForTab(store.panes, tabId);
        if (paneIndex < 0) {
            return;
        }
        const pane = store.panes[paneIndex];
        const fromIndex = pane.tabIds.indexOf(tabId);
        if (fromIndex < 0 || toIndex < 0 || toIndex >= pane.tabIds.length || fromIndex === toIndex) {
            return;
        }
        const tabIds = pane.tabIds.slice();
        const [id] = tabIds.splice(fromIndex, 1);
        const tab = store.tabs.find(item => item.id === id);
        const pinnedCount = tabIds.filter(tid => store.tabs.find(t => t.id === tid)?.pinned).length;
        let target = toIndex;
        if (tab?.pinned) {
            target = Math.min(Math.max(0, toIndex), pinnedCount);
        } else {
            target = Math.min(Math.max(pinnedCount, toIndex), tabIds.length);
        }
        tabIds.splice(target, 0, id);
        setStore('panes', paneIndex, 'tabIds', tabIds);
    },
    setTabCode(tabId: string, code: string) {
        setStore('tabs', tab => tab.id === tabId, 'code', code);
        setStore('tabs', tab => tab.id === tabId, 'dirty', true);
    },
    setTabSize(tabId: string, size: number) {
        setStore('tabs', tab => tab.id === tabId, 'size', size);
    },
    setTabResult(tabId: string, result: RunEnvelope) {
        const current = store.tabs.find(tab => tab.id === tabId);
        if (current?.result) {
            setStore('tabs', tab => tab.id === tabId, 'previousResult', current.result);
        }
        setStore('tabs', tab => tab.id === tabId, 'result', parseRunResult(result));
    },
    setTabLoading(tabId: string, isLoading: boolean) {
        setStore('tabs', tab => tab.id === tabId, 'loading', isLoading);
    },
    setTabWorkingDir(tabId: string, workingDir: string) {
        const current = store.tabs.find(tab => tab.id === tabId);
        if (current && current.workingDir !== workingDir) {
            void StopSession(tabId);
            clearProject(tabId);
        }
        setStore('tabs', tab => tab.id === tabId, 'workingDir', workingDir);
        rememberDir(workingDir);
    },
    setTabSshConnection(tabId: string, sshConn?: SSHConnection) {
        const current = store.tabs.find(tab => tab.id === tabId);
        if (current?.sshConn?.uuid !== sshConn?.uuid) {
            void StopSession(tabId);
            clearProject(tabId);
        }
        setStore('tabs', tab => tab.id === tabId, 'sshConn', sshConn);
    },
    setTabContainerInfo(tabId: string, info?: models.docker.ContainerInfo) {
        const current = store.tabs.find(tab => tab.id === tabId);
        if (
            current?.containerInfo?.id !== info?.id ||
            current?.containerInfo?.workingDir !== info?.workingDir
        ) {
            void StopSession(tabId);
            clearProject(tabId);
        }
        setStore('tabs', tab => tab.id === tabId, 'containerInfo', info);
    },
    async switchToLocal(tabId: string, workingDir?: string, keepFile: boolean = false) {
        const tab = store.tabs.find(item => item.id === tabId);
        if (!tab) {
            return;
        }
        await StopSession(tabId);
        if (tab.sshConn) {
            await RemoveConn(tab.sshConn.uuid);
        }
        clearProject(tabId);
        setStore('tabs', item => item.id === tabId, 'sshConn', undefined);
        setStore('tabs', item => item.id === tabId, 'containerInfo', undefined);
        if (!keepFile) {
            setStore('tabs', item => item.id === tabId, 'filePath', '');
        }
        if (workingDir) {
            setStore('tabs', item => item.id === tabId, 'workingDir', workingDir);
            rememberDir(workingDir);
        }
    },
    async connectSshConfig(tabId: string, config: models.ssh.SshConnectionConfig) {
        const tab = store.tabs.find(item => item.id === tabId);
        if (!tab) {
            return;
        }
        await StopSession(tabId);
        if (tab.sshConn && tab.sshConn.uuid !== config.uuid) {
            await RemoveConn(tab.sshConn.uuid);
        }
        if (tab.containerInfo) {
            setStore('tabs', item => item.id === tabId, 'containerInfo', undefined);
        }
        clearProject(tabId);
        const connUuid = await ConnectSsh(config);
        setStore('tabs', item => item.id === tabId, 'sshConn', {
            uuid: connUuid,
            name: config.name,
            color: config.color,
        });
        if (config.workingDir) {
            setStore('tabs', item => item.id === tabId, 'workingDir', config.workingDir);
            rememberDir(config.workingDir);
        }
    },
    async connectDockerContainer(tabId: string, info: models.docker.ContainerInfo) {
        const tab = store.tabs.find(item => item.id === tabId);
        if (!tab) {
            return;
        }
        await StopSession(tabId);
        if (tab.sshConn) {
            await RemoveConn(tab.sshConn.uuid);
            setStore('tabs', item => item.id === tabId, 'sshConn', undefined);
        }
        clearProject(tabId);

        let phpBinary = info.phpBinaryPath;
        if (!phpBinary) {
            phpBinary = await GetContainerPhpBinaryPath(info);
        }
        const prepared = new models.docker.ContainerInfo({
            ...info,
            phpBinaryPath: phpBinary,
        });
        prepared.phpRunnerPath = await ConnectDocker(prepared);
        const containers = await GetDockerContainers();
        await SaveDockerContainers(
            containers.filter(item => item.id !== prepared.id).concat([prepared]),
        );
        setStore('tabs', item => item.id === tabId, 'containerInfo', prepared);
        if (prepared.workingDir) {
            setStore('tabs', item => item.id === tabId, 'workingDir', prepared.workingDir);
            rememberDir(prepared.workingDir);
        }
    },
    setPersistent(tabId: string, persistent: boolean) {
        setStore('tabs', tab => tab.id === tabId, 'persistent', persistent);
        if (!persistent) {
            setStore('tabs', tab => tab.id === tabId, 'queryLog', false);
            setStore('tabs', tab => tab.id === tabId, 'dumpAssignments', false);
            setStore('tabs', tab => tab.id === tabId, 'alignAssignmentOutput', false);
            void StopSession(tabId);
        }
    },
    setQueryLog(tabId: string, enabled: boolean) {
        setStore('tabs', tab => tab.id === tabId, 'queryLog', enabled);
        if (enabled) {
            setStore('tabs', tab => tab.id === tabId, 'persistent', true);
        }
    },
    setDumpAssignments(tabId: string, enabled: boolean) {
        setStore('tabs', tab => tab.id === tabId, 'dumpAssignments', enabled);
        if (enabled) {
            setStore('tabs', tab => tab.id === tabId, 'persistent', true);
        } else {
            setStore('tabs', tab => tab.id === tabId, 'alignAssignmentOutput', false);
        }
    },
    setDumpLogs(tabId: string, enabled: boolean) {
        setStore('tabs', tab => tab.id === tabId, 'dumpLogs', enabled);
    },
    setAlignAssignmentOutput(tabId: string, enabled: boolean) {
        setStore('tabs', tab => tab.id === tabId, 'alignAssignmentOutput', enabled);
        if (enabled) {
            setStore('tabs', tab => tab.id === tabId, 'dumpAssignments', true);
            setStore('tabs', tab => tab.id === tabId, 'persistent', true);
        }
    },
    setAllowWrites(tabId: string, enabled: boolean) {
        setStore('tabs', tab => tab.id === tabId, 'allowWrites', enabled);
    },
    async applyProject(tabId: string, project: projects.Project) {
        const tab = store.tabs.find(item => item.id === tabId);
        if (!tab) {
            return;
        }

        let sshConn: SSHConnection | undefined;
        let containerInfo: models.docker.ContainerInfo | undefined;
        let workingDir = project.workingDir;
        let phpBinaryPath = project.runtime === 'local' ? project.phpBinaryPath || '' : '';

        if (project.runtime === 'ssh') {
            if (!project.sshConfigUuid) {
                throw new Error('Choose an SSH connection for this project');
            }
            const data = await GetSshConfigs();
            const config = data.configs.find(item => item.uuid === project.sshConfigUuid);
            if (!config) {
                throw new Error('SSH connection saved on this project was not found');
            }
            const next = new models.ssh.SshConnectionConfig({
                ...config,
                workingDir: project.workingDir || config.workingDir,
            });
            const connUuid = await ConnectSsh(next);
            sshConn = { uuid: connUuid, name: config.name, color: config.color };
            workingDir = next.workingDir;
        }

        if (project.runtime === 'docker') {
            if (!project.dockerContainerId && !project.dockerContainerName) {
                throw new Error('Choose a Docker container for this project');
            }
            const containers = await GetDockerContainers();
            const info = containers.find(
                item =>
                    item.id === project.dockerContainerId ||
                    item.name === project.dockerContainerName,
            );
            if (!info) {
                throw new Error('Docker container saved on this project is not running');
            }
            workingDir = project.workingDir || info.workingDir;
            let phpBinary = info.phpBinaryPath;
            if (!phpBinary) {
                phpBinary = await GetContainerPhpBinaryPath(info);
            }
            const prepared = new models.docker.ContainerInfo({
                ...info,
                workingDir,
                phpBinaryPath: phpBinary,
            });
            prepared.phpRunnerPath = await ConnectDocker(prepared);
            await SaveDockerContainers(
                containers.filter(item => item.id !== info.id).concat([prepared]),
            );
            containerInfo = prepared;
            phpBinaryPath = '';
        }

        await StopSession(tabId);
        if (tab.sshConn && tab.sshConn.uuid !== sshConn?.uuid) {
            await RemoveConn(tab.sshConn.uuid);
        }

        setStore('tabs', item => item.id === tabId, 'projectId', project.uuid);
        setStore('tabs', item => item.id === tabId, 'projectName', project.name);
        setStore('tabs', item => item.id === tabId, 'projectColor', project.color);
        setStore('tabs', item => item.id === tabId, 'phpBinaryPath', phpBinaryPath);
        setStore('tabs', item => item.id === tabId, 'workingDir', workingDir);
        setStore('tabs', item => item.id === tabId, 'sshConn', sshConn);
        setStore('tabs', item => item.id === tabId, 'containerInfo', containerInfo);
    },
    async openProject(project: projects.Project, asNewTab: boolean) {
        if (asNewTab) {
            store.createNewTab();
        }
        await store.applyProject(store.currentTabId, project);
    },
    async openPhpFile(path?: string, asNewTab: boolean = false, preserveWorkingDir: boolean = false) {
        const filePath = path || (await OpenPhpFile());
        if (!filePath) {
            return;
        }
        try {
            const content = await ReadTextFile(filePath);
            if (asNewTab || store.tabs.length === 0) {
                store.createNewTab();
            }
            const tabId = store.currentTabId;
            const current = store.tabs.find(tab => tab.id === tabId);
            const keepDir =
                preserveWorkingDir &&
                current?.workingDir &&
                (filePath === current.workingDir ||
                    filePath.startsWith(current.workingDir.endsWith('/')
                        ? current.workingDir
                        : `${current.workingDir}/`));
            const nextDir = keepDir ? current!.workingDir : dirname(filePath);
            await store.switchToLocal(tabId, nextDir, Boolean(preserveWorkingDir && current?.filePath));
            setStore('tabs', tab => tab.id === tabId, 'filePath', filePath);
            setStore('tabs', tab => tab.id === tabId, 'code', content);
            setStore('tabs', tab => tab.id === tabId, 'dirty', false);
            if (!preserveWorkingDir) {
                setStore('tabs', tab => tab.id === tabId, 'projectId', undefined);
                setStore('tabs', tab => tab.id === tabId, 'projectName', undefined);
                setStore('tabs', tab => tab.id === tabId, 'projectColor', undefined);
            }
            rememberFile(filePath);
        } catch (error) {
            await ShowError(error instanceof Error ? error.message : String(error));
        }
    },
    toggleFileTree() {
        setStore('showFileTree', !store.showFileTree);
    },
    async saveCurrentTab() {
        const tab = store.currentTab;
        if (!tab) {
            return;
        }
        let filePath = tab.filePath || '';
        if (!filePath) {
            return store.saveCurrentTabAs();
        }
        try {
            await WriteTextFile(filePath, tab.code);
            setStore('tabs', item => item.id === tab.id, 'dirty', false);
            rememberFile(filePath);
        } catch (error) {
            await ShowError(error instanceof Error ? error.message : String(error));
        }
    },
    async saveCurrentTabAs() {
        const tab = store.currentTab;
        if (!tab) {
            return;
        }
        const suggested = tab.filePath
            ? basename(tab.filePath)
            : `${basename(tab.workingDir) || 'snippet'}.php`;
        const filePath = await SavePhpFile(suggested);
        if (!filePath) {
            return;
        }
        try {
            await WriteTextFile(filePath, tab.code);
            setStore('tabs', item => item.id === tab.id, 'filePath', filePath);
            setStore('tabs', item => item.id === tab.id, 'dirty', false);
            rememberFile(filePath);
            rememberDir(dirname(filePath));
        } catch (error) {
            await ShowError(error instanceof Error ? error.message : String(error));
        }
    },
    toggleLayout() {
        setStore('layout', store.isHorizontalLayout ? Layout.Vertical : Layout.Horizontal);
    },
    toggleResult() {
        setStore('showResult', !store.showResult);
    },
    toggleCompare() {
        setStore('compareResults', !store.compareResults);
    },
    setOutputType(type: OutputType) {
        setStore('outputType', type);
    },
    async getTabFrameworkInfo(tabId: string): Promise<FrameworkInfo> {
        const tab = store.tabs.find(item => item.id === tabId)!;

        const info = tab.containerInfo
            ? await GetDockerFrameworkInfo(tab.containerInfo.id)
            : tab.sshConn
              ? await GetRemoteFrameworkInfo(tab.sshConn.uuid)
              : await GetFrameworkInfo(tab.workingDir);

        return JSON.parse(info) as FrameworkInfo;
    },
    async runCode(tab: Tab, codeOverride?: string) {
        const current = store.tabs.find(item => item.id === tab.id) ?? tab;
        if (current.loading) {
            return;
        }
        const code = codeOverride ?? current.code;
        store.setTabLoading(current.id, true);
        AddLog(
            new models.history.HistoryLog({
                uuid: v4(),
                code,
                workingDir: current.workingDir,
                timestamp: Date.now(),
            }),
        );

        try {
            const useSession =
                current.persistent !== false ||
                current.queryLog === true ||
                current.dumpAssignments === true;
            let result: RunEnvelope;
            if (useSession) {
                result = await SessionExec(
                    current.id,
                    sessionSpec(current),
                    new models.php.SessionRequest({
                        op: 'run',
                        code,
                        queryLog: current.queryLog === true,
                        dumpAssignments: current.dumpAssignments === true,
                        dumpLogs: current.dumpLogs !== false,
                    }),
                );
            } else if (current.containerInfo) {
                await StopSession(current.id);
                result = await RunDockerCode(current.containerInfo.id, code);
            } else if (current.sshConn) {
                await StopSession(current.id);
                result = await RunRemoteCode(current.sshConn.uuid, code);
            } else {
                await StopSession(current.id);
                result = await RunCode(current.workingDir, code, current.phpBinaryPath || '');
            }

            store.setTabResult(current.id, result);
            setStore('showResult', true);
        } catch (error) {
            store.setTabResult(current.id, {
                ok: false,
                output: '',
                error: error instanceof Error ? error.message : String(error),
                exitCode: -1,
            });
            setStore('showResult', true);
        } finally {
            store.setTabLoading(current.id, false);
        }
    },
    async runCodeUntilLine(tab: Tab, lineNumber: number) {
        const current = store.tabs.find(item => item.id === tab.id) ?? tab;
        const code = codeUntilLine(current.code, lineNumber);
        if (!code.trim()) {
            return;
        }
        await store.runCode(current, code);
    },
    get currentTab(): Tab {
        return store.tabs.find(tab => tab.id === store.currentTabId)!;
    },
    get isHorizontalLayout() {
        return store.layout === Layout.Horizontal;
    },
};

const clearProject = (tabId: string) => {
    setStore('tabs', tab => tab.id === tabId, 'projectId', undefined);
    setStore('tabs', tab => tab.id === tabId, 'projectName', undefined);
    setStore('tabs', tab => tab.id === tabId, 'projectColor', undefined);
    setStore('tabs', tab => tab.id === tabId, 'phpBinaryPath', '');
};

if (!Array.isArray(newCodeStore.recentDirs)) {
    newCodeStore.recentDirs = [];
}
if (!Array.isArray(newCodeStore.recentFiles)) {
    newCodeStore.recentFiles = [];
}
if (typeof newCodeStore.showFileTree !== 'boolean') {
    newCodeStore.showFileTree = true;
}
if (typeof newCodeStore.compareResults !== 'boolean') {
    newCodeStore.compareResults = false;
}

newCodeStore.tabs = pinnedFirst(
    await Promise.all(
        newCodeStore.tabs.map(async tab => ({
            ...tab,
            loading: false,
            persistent: tab.persistent !== false,
            queryLog: tab.queryLog === true,
            dumpAssignments: tab.dumpAssignments === true,
            dumpLogs: tab.dumpLogs !== false,
            alignAssignmentOutput: tab.alignAssignmentOutput === true,
            allowWrites: tab.allowWrites === true,
            phpBinaryPath: tab.phpBinaryPath || '',
            pinned: tab.pinned === true,
            filePath: tab.filePath || '',
            dirty: tab.dirty === true,
            sshConn: tab.sshConn
                ? (await ConnExists(tab.sshConn?.uuid))
                    ? tab.sshConn
                    : undefined
                : undefined,
        })),
    ),
);

{
    const allIds = newCodeStore.tabs.map(tab => tab.id);
    const idSet = new Set(allIds);
    let panes: Pane[] = Array.isArray(newCodeStore.panes) ? newCodeStore.panes : [];
    panes = panes
        .map(pane => ({
            id: pane.id || v4(),
            tabIds: (pane.tabIds || []).filter(id => idSet.has(id)),
            activeTabId: pane.activeTabId,
        }))
        .filter(pane => pane.tabIds.length > 0)
        .slice(0, 2);
    const assigned = new Set(panes.flatMap(pane => pane.tabIds));
    const orphans = allIds.filter(id => !assigned.has(id));
    if (panes.length === 0) {
        panes = [makePane(allIds, newCodeStore.currentTabId)];
    } else if (orphans.length) {
        panes[0] = {
            ...panes[0],
            tabIds: [...panes[0].tabIds, ...orphans],
        };
    }
    for (const pane of panes) {
        if (!pane.tabIds.includes(pane.activeTabId)) {
            pane.activeTabId = pane.tabIds[0];
        }
    }
    newCodeStore.panes = panes;
    if (!panes.some(pane => pane.id === newCodeStore.focusedPaneId)) {
        newCodeStore.focusedPaneId = panes[0].id;
    }
    if (newCodeStore.paneOrientation !== 'row' && newCodeStore.paneOrientation !== 'column') {
        newCodeStore.paneOrientation = 'row';
    }
    if (
        !Array.isArray(newCodeStore.paneSizes) ||
        newCodeStore.paneSizes.length !== 2 ||
        typeof newCodeStore.paneSizes[0] !== 'number' ||
        typeof newCodeStore.paneSizes[1] !== 'number'
    ) {
        newCodeStore.paneSizes = [50, 50];
    }
    const focused = panes.find(pane => pane.id === newCodeStore.focusedPaneId) ?? panes[0];
    if (focused && !allIds.includes(newCodeStore.currentTabId)) {
        newCodeStore.currentTabId = focused.activeTabId;
    }
}

const [store, setStore] = createStore(newCodeStore);

const persistableCodeState = () => ({
    tabs: store.tabs.map(tab => ({
        id: tab.id,
        workingDir: tab.workingDir,
        code: tab.code,
        size: tab.size,
        sshConn: tab.sshConn,
        containerInfo: tab.containerInfo,
        projectId: tab.projectId,
        projectName: tab.projectName,
        projectColor: tab.projectColor,
        phpBinaryPath: tab.phpBinaryPath || '',
        persistent: tab.persistent !== false,
        queryLog: tab.queryLog === true,
        dumpAssignments: tab.dumpAssignments === true,
        dumpLogs: tab.dumpLogs !== false,
        alignAssignmentOutput: tab.alignAssignmentOutput === true,
        allowWrites: tab.allowWrites === true,
        pinned: tab.pinned === true,
        filePath: tab.filePath || '',
        dirty: tab.dirty === true,
        result: tab.result,
        previousResult: tab.previousResult,
    })),
    currentTabId: store.currentTabId,
    panes: store.panes.map(pane => ({
        id: pane.id,
        tabIds: pane.tabIds,
        activeTabId: pane.activeTabId,
    })),
    focusedPaneId: store.focusedPaneId,
    paneOrientation: store.paneOrientation,
    paneSizes: store.paneSizes,
    layout: store.layout,
    showResult: store.showResult,
    outputType: store.outputType,
    compareResults: store.compareResults === true,
    showFileTree: store.showFileTree !== false,
    recentDirs: store.recentDirs ?? [],
    recentFiles: store.recentFiles ?? [],
});

createEffect(() => {
    void Save(models.store.StoreName.Code, JSON.stringify(persistableCodeState()));
});

// First launch: seed Local menu with Laravel Herd parked sites.
if ((store.recentDirs || []).length === 0) {
    try {
        const sites = await ListHerdSites();
        if (sites?.length) {
            setStore('recentDirs', sites.slice(0, 12));
        }
    } catch {
        // Herd may be absent; leave recentDirs empty.
    }
}

export interface CodeStore {
    tabs: Tab[];
    currentTabId: string;
    currentTab: Tab;
    panes: Pane[];
    focusedPaneId: string;
    paneOrientation: PaneOrientation;
    paneSizes: [number, number];
    layout: Layout;
    isHorizontalLayout: boolean;
    showResult: boolean;
    outputType: OutputType;
    compareResults: boolean;
    showFileTree: boolean;
    recentDirs: string[];
    recentFiles: string[];
    createNewTab(atCurrentPosition?: boolean, paneId?: string): void;
    setCurrentTab(tabId: string): void;
    focusPane(paneId: string): void;
    setPaneActiveTab(paneId: string, tabId: string): void;
    moveTabToPane(tabId: string, targetPaneId: string, index?: number): void;
    splitPaneWithTab(tabId: string, edge: PaneEdge, overPaneId?: string): void;
    setPaneSizes(sizes: [number, number]): void;
    mergePaneInto(sourcePaneId: string, targetPaneId: string): void;
    closeTab(tabId: string): Promise<void>;
    clearFile(tabId: string): Promise<void>;
    openScratchpad(tabId: string, workingDir?: string): Promise<void>;
    closeTabsToLeft(tabId: string): Promise<void>;
    closeTabsToRight(tabId: string): Promise<void>;
    closeOtherTabs(tabId: string): Promise<void>;
    togglePinTab(tabId: string): void;
    moveTab(tabId: string, toIndex: number): void;
    setTabCode(tabId: string, code: string): void;
    setTabSize(tabId: string, size: number): void;
    setTabResult(tabId: string, result: RunEnvelope): void;
    setTabLoading(tabId: string, isLoading: boolean): void;
    setTabWorkingDir(tabId: string, workingDir: string): void;
    setTabSshConnection(tabId: string, connection?: SSHConnection): void;
    setTabContainerInfo(tabId: string, info?: models.docker.ContainerInfo): void;
    switchToLocal(tabId: string, workingDir?: string, keepFile?: boolean): Promise<void>;
    connectSshConfig(tabId: string, config: models.ssh.SshConnectionConfig): Promise<void>;
    connectDockerContainer(tabId: string, info: models.docker.ContainerInfo): Promise<void>;
    setPersistent(tabId: string, persistent: boolean): void;
    setQueryLog(tabId: string, enabled: boolean): void;
    setDumpAssignments(tabId: string, enabled: boolean): void;
    setDumpLogs(tabId: string, enabled: boolean): void;
    setAlignAssignmentOutput(tabId: string, enabled: boolean): void;
    setAllowWrites(tabId: string, enabled: boolean): void;
    applyProject(tabId: string, project: projects.Project): Promise<void>;
    openProject(project: projects.Project, asNewTab: boolean): Promise<void>;
    openPhpFile(path?: string, asNewTab?: boolean, preserveWorkingDir?: boolean): Promise<void>;
    saveCurrentTab(): Promise<void>;
    saveCurrentTabAs(): Promise<void>;
    toggleFileTree(): void;
    toggleLayout(): void;
    toggleResult(): void;
    toggleCompare(): void;
    setOutputType(type: OutputType): void;
    getTabFrameworkInfo(tabId: string): Promise<FrameworkInfo>;
    runCode(tab: Tab, codeOverride?: string): Promise<void>;
    runCodeUntilLine(tab: Tab, lineNumber: number): Promise<void>;
}

export interface SSHConnection {
    uuid: string;
    name: string;
    color: string;
}

export interface Tab {
    id: string;
    workingDir: string;
    code: string;
    result?: TabResult;
    previousResult?: TabResult;
    loading: boolean;
    sshConn?: SSHConnection;
    containerInfo?: models.docker.ContainerInfo;
    size?: number;
    projectId?: string;
    projectName?: string;
    projectColor?: string;
    phpBinaryPath?: string;
    persistent?: boolean;
    queryLog?: boolean;
    dumpAssignments?: boolean;
    dumpLogs?: boolean;
    alignAssignmentOutput?: boolean;
    allowWrites?: boolean;
    pinned?: boolean;
    filePath?: string;
    dirty?: boolean;
}

export const useCodeStore = (): [CodeStore, SetStoreFunction<CodeStore>] => [store, setStore];
