import { Component, createMemo, createResource, createSignal, For, onMount, Show } from 'solid-js';
import { ForgeSite, Tab, useCodeStore } from '../../../stores/code';
import { Screen, useGeneralStore } from '../../../stores/general';
import { loadProjects, useProjects } from '../../../stores/projects';
import { GetAll as GetHistory } from '../../../../wailsjs/go/history/History';
import { GetAll as GetSshConfigs } from '../../../../wailsjs/go/ssh/Ssh';
import { GetAll as GetDockerContainers } from '../../../../wailsjs/go/docker/Docker';
import { GetProfiles, ListAllSites } from '../../../../wailsjs/go/forge/Forge';
import { Error as ShowError, SelectDir } from '../../../../wailsjs/go/dialog/Dialog';
import StatusPopover, { menuItemClass, menuSectionClass } from './StatusPopover';
import FolderCode from '../../icons/FolderCode';
import FolderOpen from '../../icons/FolderOpen';
import Server from '../../icons/Server';
import Docker from '../../icons/Docker';
import Forge from '../../icons/Forge';
import FileJson from '../../icons/FileJson';
import * as models from '../../../../wailsjs/go/models';
import { shortcutLabel } from '../../../utils/hotkey/mod';

const basename = (path: string) => path.split('/').filter(Boolean).pop() || path;
const hintClass = 'opacity-50 text-[10px] tracking-wide shrink-0';

const emptyClass = 'px-3 py-1.5 opacity-50';

const WorkspaceMenu: Component<{ tab: Tab }> = props => {
    const [generalStore] = useGeneralStore();
    const [codeStore] = useCodeStore();
    const projects = useProjects();

    onMount(() => loadProjects());

    const [sshData, { refetch: refetchSsh }] = createResource(async () => await GetSshConfigs());
    const [containers, { refetch: refetchDocker }] = createResource(
        async () => await GetDockerContainers(),
    );
    const [history] = createResource(async () => await GetHistory());
    const [selectedProfileUuid, setSelectedProfileUuid] = createSignal(
        props.tab.forgeSite?.profileUuid || '',
    );
    const [forgeProfiles, { refetch: refetchForgeProfiles }] = createResource(async () => {
        const profiles = await GetProfiles();
        if (!selectedProfileUuid() && profiles.length > 0) {
            setSelectedProfileUuid(props.tab.forgeSite?.profileUuid || profiles[0].uuid);
        }
        return profiles;
    });
    const [forgeSites, { refetch: refetchForgeSites }] = createResource(
        () => selectedProfileUuid(),
        async profileUuid => {
            if (!profileUuid) {
                return [];
            }
            try {
                return await ListAllSites(profileUuid);
            } catch (error) {
                await ShowError(error instanceof Error ? error.message : String(error));
                return [];
            }
        },
    );
    const runtime = createMemo(() => {
        if (props.tab.forgeSite) {
            return 'forge' as const;
        }
        if (props.tab.containerInfo) {
            return 'docker' as const;
        }
        if (props.tab.sshConn) {
            return 'ssh' as const;
        }
        return 'local' as const;
    });

    const runTargetName = createMemo(() => {
        if (props.tab.projectName) {
            return props.tab.projectName;
        }
        if (props.tab.forgeSite) {
            return `${props.tab.forgeSite.profileName} / ${props.tab.forgeSite.siteName}`;
        }
        if (props.tab.containerInfo) {
            return props.tab.containerInfo.name;
        }
        if (props.tab.sshConn) {
            return props.tab.sshConn.name;
        }
        return basename(props.tab.workingDir);
    });

    const labelName = createMemo(() => {
        if (props.tab.filePath) {
            return basename(props.tab.filePath);
        }
        return runTargetName();
    });

    const runtimeLabel = createMemo(() => {
        if (props.tab.filePath) {
            return `in ${runTargetName()}`;
        }
        if (runtime() === 'forge') {
            return 'Forge';
        }
        if (runtime() === 'docker') {
            return 'Docker';
        }
        if (runtime() === 'ssh') {
            return 'SSH';
        }
        return 'Local';
    });

    const keepFile = () => Boolean(props.tab.filePath);

    const setLocalRunContext = async (workingDir?: string) => {
        try {
            await codeStore.switchToLocal(props.tab.id, workingDir, keepFile());
        } catch (error) {
            await ShowError(error instanceof Error ? error.message : String(error));
        }
    };

    const recentDirs = createMemo(() => {
        const fromHistory = (history() || [])
            .slice()
            .reverse()
            .map(item => item.workingDir)
            .filter(Boolean);
        const fromTabs = codeStore.tabs.map(tab => tab.workingDir);
        const remembered = codeStore.recentDirs || [];
        const seen = new Set<string>();
        const out: string[] = [];
        for (const dir of [...remembered, ...fromTabs, ...fromHistory]) {
            if (!dir || seen.has(dir)) {
                continue;
            }
            seen.add(dir);
            out.push(dir);
            if (out.length >= 12) {
                break;
            }
        }
        return out;
    });

    const applyProject = async (uuid: string) => {
        const project = projects().find(item => item.uuid === uuid);
        if (!project) {
            return;
        }
        try {
            await codeStore.applyProject(props.tab.id, project);
        } catch (error) {
            await ShowError(error instanceof Error ? error.message : String(error));
        }
    };

    const openDirectory = async () => {
        const dir = await SelectDir();
        if (!dir) {
            return;
        }
        await setLocalRunContext(dir);
    };

    const openScratchpadIn = async (dir?: string) => {
        const workingDir = dir || (await SelectDir());
        if (!workingDir) {
            return;
        }
        try {
            await codeStore.openScratchpad(props.tab.id, workingDir);
        } catch (error) {
            await ShowError(error instanceof Error ? error.message : String(error));
        }
    };

    const connectSsh = async (config: models.ssh.SshConnectionConfig) => {
        try {
            await codeStore.connectSshConfig(props.tab.id, config);
            refetchSsh();
        } catch (error) {
            await ShowError(error instanceof Error ? error.message : String(error));
        }
    };

    const connectDocker = async (info: models.docker.ContainerInfo) => {
        try {
            await codeStore.connectDockerContainer(props.tab.id, info);
            refetchDocker();
        } catch (error) {
            await ShowError(error instanceof Error ? error.message : String(error));
        }
    };

    const selectedProfile = createMemo(
        () => (forgeProfiles() || []).find(p => p.uuid === selectedProfileUuid()),
    );

    const connectForge = async (site: models.forge.SiteOption) => {
        const profile = selectedProfile();
        if (!profile) {
            return;
        }
        const next: ForgeSite = {
            profileUuid: profile.uuid,
            profileName: profile.name,
            orgSlug: site.orgSlug,
            serverId: site.serverId,
            siteId: site.siteId,
            serverName: site.serverName,
            siteName: site.siteName,
        };
        try {
            await codeStore.connectForgeSite(props.tab.id, next);
        } catch (error) {
            await ShowError(error instanceof Error ? error.message : String(error));
        }
    };

    return (
        <StatusPopover
            title="Workspace"
            wide
            label={
                <>
                    <Show
                        when={runtime() === 'forge'}
                        fallback={
                            <Show
                                when={runtime() === 'docker'}
                                fallback={
                                    <Show
                                        when={runtime() === 'ssh'}
                                        fallback={<FolderCode class="w-4 min-w-4" />}
                                    >
                                        <Server class="w-4 min-w-4" />
                                    </Show>
                                }
                            >
                                <Docker class="w-4 min-w-4" />
                            </Show>
                        }
                    >
                        <Forge class="w-4 min-w-4" />
                    </Show>
                    <span class="max-w-[8rem] truncate">{labelName()}</span>
                    <span class="opacity-50 text-[10px] uppercase tracking-wide">
                        {runtimeLabel()}
                    </span>
                </>
            }
        >
            <div class={menuSectionClass}>
                <Show when={props.tab.filePath} fallback="Local">
                    Run in
                </Show>
            </div>
            <Show when={props.tab.filePath}>
                <div class={`${emptyClass} !opacity-70 text-[11px]`}>
                    Execute <span class="font-medium">{basename(props.tab.filePath!)}</span> against a
                    directory, project, SSH host, or Docker container
                </div>
            </Show>
            <Show when={recentDirs().length === 0}>
                <div class={emptyClass}>No recent directories</div>
            </Show>
            <For each={recentDirs()}>
                {dir => (
                    <button
                        type="button"
                        class={menuItemClass}
                        classList={{
                            'font-semibold':
                                runtime() === 'local' &&
                                !props.tab.projectId &&
                                props.tab.workingDir === dir,
                        }}
                        title={dir}
                        on:click={() => setLocalRunContext(dir)}
                    >
                        <FolderCode class="w-3.5 min-w-3.5 opacity-70" />
                        <span class="truncate">{basename(dir)}</span>
                    </button>
                )}
            </For>
            <button type="button" class={menuItemClass} on:click={openDirectory}>
                <FolderOpen class="w-3.5" />
                <span class="grow text-left">
                    <Show when={props.tab.filePath} fallback="Open directory…">
                        Choose run directory…
                    </Show>
                </span>
                <span class={hintClass}>{shortcutLabel('mod', 'shift', 'O')}</span>
            </button>
            <Show when={props.tab.filePath}>
                <button type="button" class={menuItemClass} on:click={() => openScratchpadIn()}>
                    <FolderOpen class="w-3.5" />
                    <span class="grow text-left">Open scratchpad in…</span>
                </button>
            </Show>
            <button
                type="button"
                class={menuItemClass}
                classList={{
                    'font-semibold':
                        runtime() === 'local' && !props.tab.projectId && !props.tab.filePath,
                }}
                on:click={() => setLocalRunContext()}
            >
                <FolderCode class="w-3.5" />
                Use local PHP
            </button>

            <div class={menuSectionClass}>PHP files</div>
            <Show when={(codeStore.recentFiles || []).length === 0}>
                <div class={emptyClass}>No recent PHP files</div>
            </Show>
            <For each={codeStore.recentFiles || []}>
                {file => (
                    <button
                        type="button"
                        class={menuItemClass}
                        classList={{ 'font-semibold': props.tab.filePath === file }}
                        title={file}
                        on:click={() => codeStore.openPhpFile(file)}
                    >
                        <FileJson class="w-3.5 min-w-3.5 opacity-70" />
                        <span class="truncate">{basename(file)}</span>
                    </button>
                )}
            </For>
            <button
                type="button"
                class={menuItemClass}
                on:click={() => codeStore.openPhpFile(undefined)}
            >
                <FileJson class="w-3.5" />
                <span class="grow text-left">Open PHP file…</span>
                <span class={hintClass}>{shortcutLabel('mod', 'O')}</span>
            </button>
            <Show when={props.tab.filePath}>
                <button
                    type="button"
                    class={menuItemClass}
                    on:click={() => void codeStore.closeTab(props.tab.id)}
                >
                    <span class="grow text-left">Close file</span>
                    <span class={hintClass}>{shortcutLabel('mod', 'W')}</span>
                </button>
            </Show>

            <div class={menuSectionClass}>Project</div>
            <Show when={projects().length === 0}>
                <div class={emptyClass}>No saved projects</div>
            </Show>
            <For each={projects()}>
                {project => (
                    <button
                        type="button"
                        class={menuItemClass}
                        classList={{ 'font-semibold': props.tab.projectId === project.uuid }}
                        on:click={() => applyProject(project.uuid)}
                    >
                        <span
                            class="w-2 h-2 rounded-full shrink-0"
                            style={{ 'background-color': project.color || 'currentColor' }}
                        />
                        <span class="truncate grow text-left">{project.name}</span>
                        <span class="opacity-50 text-[10px] uppercase">
                            {project.runtime || 'local'}
                        </span>
                    </button>
                )}
            </For>
            <button
                type="button"
                class={menuItemClass}
                on:click={() => generalStore.setCurrentScreen(Screen.Projects)}
            >
                Create / manage projects…
            </button>

            <div class={menuSectionClass}>SSH</div>
            <Show when={(sshData()?.configs || []).length === 0}>
                <div class={emptyClass}>No SSH connections saved</div>
            </Show>
            <For each={sshData()?.configs || []}>
                {config => (
                    <button
                        type="button"
                        class={menuItemClass}
                        classList={{ 'font-semibold': props.tab.sshConn?.name === config.name }}
                        on:click={() => connectSsh(config)}
                    >
                        <Server class="w-3.5 min-w-3.5 opacity-70" />
                        <span class="truncate">{config.name}</span>
                    </button>
                )}
            </For>
            <button
                type="button"
                class={menuItemClass}
                on:click={() => {
                    refetchSsh();
                    generalStore.setCurrentScreen(Screen.Ssh);
                }}
            >
                <Server class="w-3.5" />
                Connect / manage SSH…
            </button>

            <div class={menuSectionClass}>Docker</div>
            <Show when={(containers() || []).length === 0}>
                <div class={emptyClass}>No running containers</div>
            </Show>
            <For each={containers() || []}>
                {container => (
                    <button
                        type="button"
                        class={menuItemClass}
                        classList={{
                            'font-semibold': props.tab.containerInfo?.id === container.id,
                        }}
                        on:click={() => connectDocker(container)}
                    >
                        <Docker class="w-3.5 min-w-3.5 opacity-70" />
                        <span class="truncate">{container.name}</span>
                    </button>
                )}
            </For>
            <button
                type="button"
                class={menuItemClass}
                on:click={() => {
                    refetchDocker();
                    generalStore.setCurrentScreen(Screen.Docker);
                }}
            >
                <Docker class="w-3.5" />
                Connect / manage Docker…
            </button>

            <div class={menuSectionClass}>Forge Commands</div>
            <Show when={(forgeProfiles() || []).length === 0}>
                <div class={emptyClass}>No Forge profiles</div>
            </Show>
            <For each={forgeProfiles() || []}>
                {profile => (
                    <button
                        type="button"
                        data-keep-open
                        class={menuItemClass}
                        classList={{
                            'font-semibold': selectedProfileUuid() === profile.uuid,
                        }}
                        title={profile.tokenMasked}
                        on:click={() => setSelectedProfileUuid(profile.uuid)}
                    >
                        <span
                            class="w-2 h-2 rounded-full shrink-0"
                            style={{ 'background-color': profile.color || '#f53003' }}
                        />
                        <span class="truncate grow text-left">{profile.name}</span>
                        <span class="opacity-50 text-[10px] truncate max-w-[5rem]">
                            {profile.tokenMasked}
                        </span>
                    </button>
                )}
            </For>
            <Show when={selectedProfile()}>
                <div class={`${emptyClass} !opacity-70 text-[11px]`}>
                    Sites · {selectedProfile()!.name}
                </div>
                <Show when={(forgeSites() || []).length === 0}>
                    <div class={emptyClass}>No sites found</div>
                </Show>
                <For each={forgeSites() || []}>
                    {site => (
                        <button
                            type="button"
                            class={menuItemClass}
                            classList={{
                                'font-semibold':
                                    props.tab.forgeSite?.profileUuid === selectedProfileUuid() &&
                                    props.tab.forgeSite?.serverId === site.serverId &&
                                    props.tab.forgeSite?.siteId === site.siteId,
                            }}
                            title={site.label}
                            on:click={() => connectForge(site)}
                        >
                            <Forge class="w-3.5 min-w-3.5 opacity-70" />
                            <span class="truncate">{site.siteName}</span>
                            <span class="opacity-50 text-[10px] truncate max-w-[5rem]">
                                {site.serverName}
                            </span>
                        </button>
                    )}
                </For>
                <button
                    type="button"
                    data-keep-open
                    class={menuItemClass}
                    on:click={() => void refetchForgeSites()}
                >
                    Refresh sites
                </button>
            </Show>
            <button
                type="button"
                class={menuItemClass}
                on:click={() => {
                    void refetchForgeProfiles();
                    generalStore.setCurrentScreen(Screen.Forge);
                }}
            >
                <Forge class="w-3.5" />
                Connect / manage Forge…
            </button>
        </StatusPopover>
    );
};

export default WorkspaceMenu;
