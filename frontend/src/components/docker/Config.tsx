import { Component, createResource, createSignal, For, Show } from 'solid-js';
import { Screen, useGeneralStore } from '../../stores/general';
import { useCodeStore } from '../../stores/code';
import StatusBar from '../code/status-bar/StatusBar';
import { docker } from '../../../wailsjs/go/models';
import Docker from '../icons/Docker';
import { Connect, GetAll, Save } from '../../../wailsjs/go/docker/Docker';
import { RemoveConn } from '../../../wailsjs/go/ssh/Ssh';
import Refresh from '../icons/Refresh';
import { createTooltip } from '../../utils/tooltip/create';
import Edit from './Edit';
import SideShell, { SideNavButton } from '../macos/SideShell';
import { PrefButton } from '../macos/PrefControl';

const Config: Component = () => {
    const [selectedContainer, setSelectedContainer] = createSignal<
        docker.ContainerInfo | undefined
    >(undefined);
    const [containers, { mutate, refetch }] = createResource(async () => await GetAll());
    const [generalStore] = useGeneralStore();
    const [codeStore] = useCodeStore();

    const saveInfo = async (info: docker.ContainerInfo, connect: boolean = false) => {
        if (connect) {
            const phpRunnerPath = await Connect(info);
            info.phpRunnerPath = phpRunnerPath;
        }

        const newContainers = containers()!
            .filter(c => c.id !== info.id)
            .concat([info]);
        mutate(newContainers);
        await Save(containers()!);
        await refetch();

        if (!connect) {
            setSelectedContainer(info);
            return;
        }

        if (codeStore.currentTab.sshConn) {
            await RemoveConn(codeStore.currentTab.sshConn.uuid);
            codeStore.setTabSshConnection(codeStore.currentTabId);
        }
        codeStore.setTabContainerInfo(codeStore.currentTabId, info);
        generalStore.setCurrentScreen(Screen.Code);
    };

    createTooltip('#refresh-containers-button', 'Refresh containers');

    return (
        <div class="flex flex-col grow min-h-0">
            <SideShell
                title="Docker"
                titleIcon={<Docker class="h-4 w-4" />}
                contentTitle={selectedContainer()?.name || 'Containers'}
                sidebarWidth="15rem"
                trailing={
                    <PrefButton
                        id="refresh-containers-button"
                        on:click={() => refetch()}
                        disabled={containers.loading}
                    >
                        <span class="inline-flex items-center gap-1.5">
                            <Refresh
                                class="w-3.5"
                                classList={{ 'animate-spin': containers.loading }}
                            />
                            Refresh
                        </span>
                    </PrefButton>
                }
                sidebar={
                    <For
                        each={containers() ?? []}
                        fallback={
                            <div class="px-2.5 py-1.5 opacity-50">No running containers.</div>
                        }
                    >
                        {info => (
                            <SideNavButton
                                active={selectedContainer()?.id === info.id}
                                title={info.name}
                                onClick={() => setSelectedContainer(info)}
                                icon={<Docker class="w-3.5" />}
                            >
                                {info.name}
                            </SideNavButton>
                        )}
                    </For>
                }
            >
                <Show
                    keyed
                    when={selectedContainer()}
                    fallback={
                        <div class="opacity-55">Select a running container to configure it.</div>
                    }
                >
                    {info => <Edit info={info} saveInfo={saveInfo} />}
                </Show>
            </SideShell>
            <Show when={codeStore.currentTab} keyed>
                {tab => <StatusBar tab={tab} />}
            </Show>
        </div>
    );
};

export default Config;
