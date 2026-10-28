import { Component, createResource, createSignal, For, Show } from 'solid-js';
import { Screen, useGeneralStore } from '../../stores/general';
import Plus from '../icons/Plus';
import Trash from '../icons/Trash';
import { Confirm } from '../../../wailsjs/go/dialog/Dialog';
import Server from '../icons/Server';
import SaveIcon from '../icons/Save';
import { useCodeStore } from '../../stores/code';
import StatusBar from '../code/status-bar/StatusBar';
import { Connect, GetAll, Save } from '../../../wailsjs/go/ssh/Ssh';
import { ssh } from '../../../wailsjs/go/models';
import Edit from './Edit';
import Ban from '../icons/Ban';
import { v4 } from 'uuid';
import SideShell, { SideNavButton } from '../macos/SideShell';
import { PrefSelect, PrefTextField } from '../macos/PrefControl';

const Config: Component = () => {
    const [selectedConfig, setSelectedConfig] = createSignal<ssh.SshConnectionConfig | undefined>(
        undefined,
    );
    const [creatingGroup, setCreatingGroup] = createSignal(false);
    const [groupName, setGroupName] = createSignal('');
    const [groupColor, setGroupColor] = createSignal('#5e81ac');
    const [selectedGroup, setSelectedGroup] = createSignal('');
    const [data, { mutate, refetch }] = createResource(async () => await GetAll());
    const [generalStore] = useGeneralStore();
    const [codeStore] = useCodeStore();

    const saveConfig = async (config: ssh.SshConnectionConfig, connect: boolean = false) => {
        config.uuid ||= v4();
        const newConfigs = data()
            ?.configs.filter(c => c.uuid !== config.uuid)
            .concat([config]);
        mutate(d => new ssh.Data({ ...d, configs: newConfigs }));
        await Save(data()!);
        await refetch();

        config = data()?.configs.find(c => c.uuid === config.uuid)!;
        setSelectedConfig(config);

        if (!connect) {
            return;
        }

        const connUuid = await Connect(config);
        codeStore.setTabSshConnection(codeStore.currentTabId, {
            uuid: connUuid,
            name: config.name,
            color: config.color,
        });
        if (codeStore.currentTab.containerInfo) {
            codeStore.setTabContainerInfo(codeStore.currentTabId);
        }
        generalStore.setCurrentScreen(Screen.Code);
    };

    const deleteConfig = async (config: ssh.SshConnectionConfig) => {
        mutate(
            d =>
                new ssh.Data({
                    ...d,
                    configs: data()?.configs.filter(c => c.uuid !== config.uuid),
                }),
        );
        await Save(data()!);
        await refetch();
        if (selectedConfig()?.uuid === config.uuid) {
            setSelectedConfig(undefined);
        }
    };

    const saveGroup = async (group: ssh.SshConnectionConfigGroup) => {
        const newGroups = data()
            ?.groups.filter(c => c.uuid !== group.uuid)
            .concat([group]);
        mutate(d => new ssh.Data({ ...d, groups: newGroups }));
        await Save(data()!);
        await refetch();
        setSelectedGroup(group.uuid);
    };

    const deleteGroup = async (groupUuid: string) => {
        mutate(
            d =>
                new ssh.Data({
                    ...d,
                    groups: data()?.groups.filter(g => g.uuid !== groupUuid),
                    configs: data()?.configs.filter(c => c.groupUuid !== groupUuid),
                }),
        );
        await Save(data()!);
        await refetch();
        if (selectedGroup() === groupUuid) {
            setSelectedGroup('');
        }
    };

    return (
        <div class="flex flex-col grow min-h-0">
            <SideShell
                title="SSH"
                titleIcon={<Server class="h-4 w-4" />}
                contentTitle={selectedConfig()?.name || 'New connection'}
                sidebarWidth="15rem"
                sidebar={
                    <>
                        <SideNavButton
                            active={selectedConfig() === undefined}
                            icon={<Plus class="w-3.5" />}
                            onClick={() => setSelectedConfig(undefined)}
                        >
                            Add connection
                        </SideNavButton>
                        <Show
                            when={creatingGroup()}
                            fallback={
                                <SideNavButton
                                    icon={<Plus class="w-3.5" />}
                                    onClick={() => setCreatingGroup(true)}
                                >
                                    Add group
                                </SideNavButton>
                            }
                        >
                            <div class="flex flex-col gap-1.5 px-0.5 my-1">
                                <div class="flex items-center gap-1.5">
                                    <PrefTextField
                                        class="!max-w-[3rem]"
                                        type="color"
                                        value={groupColor()}
                                        on:input={e => setGroupColor(e.currentTarget.value)}
                                    />
                                    <PrefTextField
                                        class="!max-w-none"
                                        placeholder="Group name"
                                        value={groupName()}
                                        on:input={e => setGroupName(e.currentTarget.value)}
                                    />
                                </div>
                                <div class="flex gap-2 justify-end px-0.5">
                                    <button
                                        type="button"
                                        class="p-1 rounded hover:brightness-110"
                                        on:click={() => {
                                            if (!groupName()) {
                                                return;
                                            }
                                            saveGroup(
                                                new ssh.SshConnectionConfigGroup({
                                                    uuid: v4(),
                                                    name: groupName(),
                                                    color: groupColor(),
                                                }),
                                            );
                                            setGroupName('');
                                            setCreatingGroup(false);
                                        }}
                                    >
                                        <SaveIcon class="w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        class="p-1 rounded hover:brightness-110"
                                        on:click={() => setCreatingGroup(false)}
                                    >
                                        <Ban class="w-4" />
                                    </button>
                                </div>
                            </div>
                        </Show>
                        <Show when={data()?.groups.length}>
                            <div class="flex items-center gap-1.5 px-0.5 my-1">
                                <PrefSelect
                                    class="!max-w-none"
                                    value={selectedGroup()}
                                    on:input={e => setSelectedGroup(e.currentTarget.value)}
                                >
                                    <option value="">All groups</option>
                                    <For each={data()?.groups}>
                                        {group => (
                                            <option value={group.uuid}>{group.name}</option>
                                        )}
                                    </For>
                                </PrefSelect>
                                <Show when={selectedGroup()}>
                                    <button
                                        type="button"
                                        class="p-1 rounded hover:brightness-110 shrink-0"
                                        on:click={async () => {
                                            (await Confirm(
                                                "Are you sure you want to delete this group and ALL it's connections?",
                                            )) && deleteGroup(selectedGroup());
                                        }}
                                    >
                                        <Trash class="w-3.5" />
                                    </button>
                                </Show>
                            </div>
                        </Show>
                        <For
                            each={data()?.configs.filter(c =>
                                selectedGroup() ? c.groupUuid === selectedGroup() : true,
                            )}
                            fallback={
                                <div class="px-2.5 py-1.5 opacity-50">No SSH connections yet.</div>
                            }
                        >
                            {config => (
                                <SideNavButton
                                    active={selectedConfig()?.uuid === config.uuid}
                                    title={config.name}
                                    onClick={() => setSelectedConfig(config)}
                                    icon={
                                        <span
                                            class="w-2 h-2 rounded-full"
                                            style={{ 'background-color': config.color }}
                                        />
                                    }
                                    trailing={
                                        <button
                                            type="button"
                                            class="p-0.5 rounded hover:brightness-125"
                                            on:click={async e => {
                                                e.stopPropagation();
                                                (await Confirm(
                                                    'Are you sure you want to delete this connection?',
                                                )) && deleteConfig(config);
                                            }}
                                        >
                                            <Trash class="w-3.5" />
                                        </button>
                                    }
                                >
                                    {config.name}
                                </SideNavButton>
                            )}
                        </For>
                    </>
                }
            >
                <Edit
                    config={selectedConfig()}
                    saveConfig={saveConfig}
                    groups={data()?.groups}
                />
            </SideShell>
            <Show when={codeStore.currentTab} keyed>
                {tab => <StatusBar tab={tab} />}
            </Show>
        </div>
    );
};

export default Config;
