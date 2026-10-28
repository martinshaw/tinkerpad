import { Component, createResource, createSignal, For, Show } from 'solid-js';
import { Screen, useGeneralStore } from '../../stores/general';
import { useCodeStore } from '../../stores/code';
import { loadProjects, useProjects } from '../../stores/projects';
import { projects, ssh, docker } from '../../../wailsjs/go/models';
import { Save } from '../../../wailsjs/go/projects/Projects';
import { GetAll as GetSsh } from '../../../wailsjs/go/ssh/Ssh';
import { GetAll as GetDocker } from '../../../wailsjs/go/docker/Docker';
import {
    Confirm,
    Error as ShowError,
    SelectDir,
    SelectPhpBinary,
} from '../../../wailsjs/go/dialog/Dialog';
import { v4 } from 'uuid';
import FolderCode from '../icons/FolderCode';
import FolderOpen from '../icons/FolderOpen';
import Plus from '../icons/Plus';
import Trash from '../icons/Trash';
import SideShell, { SideNavButton } from '../macos/SideShell';
import PrefSection from '../macos/PrefSection';
import PrefRow from '../macos/PrefRow';
import { PrefButton, PrefSelect, PrefTextField } from '../macos/PrefControl';

const emptyProject = (): projects.Project =>
    new projects.Project({
        uuid: '',
        name: '',
        color: '#5e81ac',
        runtime: 'local',
        workingDir: '',
        phpBinaryPath: '',
        sshConfigUuid: '',
        sshConfigName: '',
        dockerContainerId: '',
        dockerContainerName: '',
    });

const Projects: Component = () => {
    const [generalStore] = useGeneralStore();
    const [codeStore] = useCodeStore();
    const saved = useProjects();
    const [draft, setDraft] = createSignal<projects.Project>(emptyProject());
    const [sshData] = createResource(GetSsh);
    const [containers] = createResource(GetDocker);

    const persist = async (items: projects.Project[]) => {
        await Save(items);
        await loadProjects();
    };

    const save = async () => {
        const project = draft();
        if (!project.name || !project.workingDir) {
            await ShowError('Name and working directory are required');
            return;
        }
        if (project.runtime === 'ssh' && !project.sshConfigUuid) {
            await ShowError('Choose an SSH connection');
            return;
        }
        if (project.runtime === 'docker' && !project.dockerContainerId) {
            await ShowError('Choose a Docker container');
            return;
        }
        const next = new projects.Project({ ...project, uuid: project.uuid || v4() });
        await persist(saved().filter(item => item.uuid !== next.uuid).concat([next]));
        setDraft(saved().find(item => item.uuid === next.uuid) ?? next);
    };

    const remove = async (project: projects.Project) => {
        if (!(await Confirm('Delete this project?'))) {
            return;
        }
        await persist(saved().filter(item => item.uuid !== project.uuid));
        if (draft().uuid === project.uuid) {
            setDraft(emptyProject());
        }
    };

    const open = async (asNewTab: boolean) => {
        try {
            await codeStore.openProject(draft(), asNewTab);
            generalStore.setCurrentScreen(Screen.Code);
        } catch (error) {
            await ShowError(error instanceof Error ? error.message : String(error));
        }
    };

    const folderBtn = (onClick: () => void) => (
        <button
            type="button"
            class="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:brightness-110 opacity-70"
            on:click={onClick}
        >
            <FolderOpen class="w-3.5 h-3.5" />
        </button>
    );

    return (
        <SideShell
            title="Projects"
            titleIcon={<FolderCode class="h-4 w-4" />}
            contentTitle={draft().name || 'New project'}
            sidebarWidth="15rem"
            sidebar={
                <>
                    <SideNavButton
                        active={!draft().uuid}
                        icon={<Plus class="w-3.5" />}
                        onClick={() => setDraft(emptyProject())}
                    >
                        Add project
                    </SideNavButton>
                    <For
                        each={saved()}
                        fallback={<div class="px-2.5 py-1.5 opacity-50">No projects yet.</div>}
                    >
                        {project => (
                            <SideNavButton
                                active={draft().uuid === project.uuid}
                                title={project.name}
                                onClick={() => setDraft(new projects.Project({ ...project }))}
                                icon={
                                    <span
                                        class="w-2 h-2 rounded-full"
                                        style={{
                                            'background-color': project.color || 'currentColor',
                                        }}
                                    />
                                }
                                trailing={
                                    <button
                                        type="button"
                                        class="p-0.5 rounded hover:brightness-125"
                                        on:click={e => {
                                            e.stopPropagation();
                                            remove(project);
                                        }}
                                    >
                                        <Trash class="w-3.5" />
                                    </button>
                                }
                            >
                                {project.name}
                            </SideNavButton>
                        )}
                    </For>
                </>
            }
        >
            <PrefSection title="Project">
                <PrefRow label="Name">
                    <PrefTextField
                        value={draft().name}
                        on:input={e =>
                            setDraft(
                                new projects.Project({ ...draft(), name: e.currentTarget.value }),
                            )
                        }
                    />
                </PrefRow>
                <PrefRow label="Color">
                    <PrefTextField
                        class="!max-w-[6rem]"
                        type="color"
                        value={draft().color}
                        on:input={e =>
                            setDraft(
                                new projects.Project({ ...draft(), color: e.currentTarget.value }),
                            )
                        }
                    />
                </PrefRow>
                <PrefRow label="Runtime">
                    <PrefSelect
                        value={draft().runtime}
                        on:input={e =>
                            setDraft(
                                new projects.Project({
                                    ...draft(),
                                    runtime: e.currentTarget.value,
                                }),
                            )
                        }
                    >
                        <option value="local">Local</option>
                        <option value="docker">Docker</option>
                        <option value="ssh">SSH</option>
                    </PrefSelect>
                </PrefRow>
            </PrefSection>

            <PrefSection title="Connection">
                <Show when={draft().runtime === 'ssh'}>
                    <PrefRow label="SSH connection">
                        <PrefSelect
                            value={draft().sshConfigUuid}
                            on:input={e => {
                                const config = sshData()?.configs.find(
                                    item => item.uuid === e.currentTarget.value,
                                );
                                setDraft(
                                    new projects.Project({
                                        ...draft(),
                                        sshConfigUuid: config?.uuid ?? '',
                                        sshConfigName: config?.name ?? '',
                                        workingDir: draft().workingDir || config?.workingDir || '',
                                    }),
                                );
                            }}
                        >
                            <option value="">Select connection</option>
                            <For each={sshData()?.configs ?? []}>
                                {(config: ssh.SshConnectionConfig) => (
                                    <option value={config.uuid}>{config.name}</option>
                                )}
                            </For>
                        </PrefSelect>
                    </PrefRow>
                </Show>
                <Show when={draft().runtime === 'docker'}>
                    <PrefRow label="Docker container">
                        <PrefSelect
                            value={draft().dockerContainerId}
                            on:input={e => {
                                const info = containers()?.find(
                                    item => item.id === e.currentTarget.value,
                                );
                                setDraft(
                                    new projects.Project({
                                        ...draft(),
                                        dockerContainerId: info?.id ?? '',
                                        dockerContainerName: info?.name ?? '',
                                        workingDir: draft().workingDir || info?.workingDir || '',
                                    }),
                                );
                            }}
                        >
                            <option value="">Select container</option>
                            <For each={containers() ?? []}>
                                {(info: docker.ContainerInfo) => (
                                    <option value={info.id}>{info.name}</option>
                                )}
                            </For>
                        </PrefSelect>
                    </PrefRow>
                </Show>
                <PrefRow label="Working directory">
                    <PrefTextField
                        value={draft().workingDir}
                        trailing={folderBtn(async () => {
                            const dir = await SelectDir();
                            if (dir) {
                                setDraft(new projects.Project({ ...draft(), workingDir: dir }));
                            }
                        })}
                        on:input={e =>
                            setDraft(
                                new projects.Project({
                                    ...draft(),
                                    workingDir: e.currentTarget.value,
                                }),
                            )
                        }
                    />
                </PrefRow>
                <Show when={draft().runtime === 'local'}>
                    <PrefRow label="PHP binary">
                        <PrefTextField
                            value={draft().phpBinaryPath}
                            trailing={folderBtn(async () => {
                                const file = await SelectPhpBinary();
                                if (file) {
                                    setDraft(
                                        new projects.Project({ ...draft(), phpBinaryPath: file }),
                                    );
                                }
                            })}
                            on:input={e =>
                                setDraft(
                                    new projects.Project({
                                        ...draft(),
                                        phpBinaryPath: e.currentTarget.value,
                                    }),
                                )
                            }
                        />
                    </PrefRow>
                </Show>
            </PrefSection>

            <div class="flex gap-2 flex-wrap max-w-2xl px-1">
                <PrefButton variant="primary" on:click={save}>
                    Save
                </PrefButton>
                <PrefButton on:click={() => open(false)} disabled={!draft().uuid}>
                    Open
                </PrefButton>
                <PrefButton on:click={() => open(true)} disabled={!draft().uuid}>
                    Open in new tab
                </PrefButton>
            </div>
        </SideShell>
    );
};

export default Projects;
