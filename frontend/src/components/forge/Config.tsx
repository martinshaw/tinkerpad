import { Component, createResource, createSignal, For, Show } from 'solid-js';
import { Screen, useGeneralStore } from '../../stores/general';
import { ForgeSite, useCodeStore } from '../../stores/code';
import StatusBar from '../code/status-bar/StatusBar';
import SideShell, { SideNavButton } from '../macos/SideShell';
import Plus from '../icons/Plus';
import Trash from '../icons/Trash';
import ForgeIcon from '../icons/Forge';
import { Confirm, Error as ShowError } from '../../../wailsjs/go/dialog/Dialog';
import {
    DeleteProfile,
    GetProfiles,
    SaveProfile,
} from '../../../wailsjs/go/forge/Forge';
import { forge } from '../../../wailsjs/go/models';
import Edit, { ForgeProfileDraft } from './Edit';

const Config: Component = () => {
    const [selectedUuid, setSelectedUuid] = createSignal<string | undefined>(undefined);
    const [profiles, { refetch }] = createResource(async () => await GetProfiles());
    const [generalStore] = useGeneralStore();
    const [codeStore] = useCodeStore();

    const selectedProfile = () =>
        (profiles() || []).find(profile => profile.uuid === selectedUuid());

    const saveProfile = async (draft: ForgeProfileDraft, connectSite?: forge.SiteOption) => {
        const saved = await SaveProfile(
            draft.uuid,
            draft.name.trim(),
            draft.token.trim(),
            draft.color || '#f53003',
        );
        await refetch();
        setSelectedUuid(saved.uuid);

        if (!connectSite) {
            return;
        }

        const site: ForgeSite = {
            profileUuid: saved.uuid,
            profileName: saved.name,
            orgSlug: connectSite.orgSlug,
            serverId: connectSite.serverId,
            siteId: connectSite.siteId,
            serverName: connectSite.serverName,
            siteName: connectSite.siteName,
        };
        await codeStore.connectForgeSite(codeStore.currentTabId, site);
        generalStore.setCurrentScreen(Screen.Code);
    };

    const deleteProfile = async (profile: forge.ProfileView) => {
        try {
            await DeleteProfile(profile.uuid);
            if (codeStore.currentTab?.forgeSite?.profileUuid === profile.uuid) {
                await codeStore.switchToLocal(codeStore.currentTabId, undefined, true);
            }
            await refetch();
            if (selectedUuid() === profile.uuid) {
                setSelectedUuid(undefined);
            }
        } catch (error) {
            await ShowError(error instanceof Error ? error.message : String(error));
        }
    };

    return (
        <div class="flex flex-col grow min-h-0">
            <SideShell
                title="Forge"
                titleIcon={<ForgeIcon class="h-4 w-4" />}
                contentTitle={selectedProfile()?.name || 'New profile'}
                sidebarWidth="15rem"
                sidebar={
                    <>
                        <SideNavButton
                            active={selectedUuid() === undefined}
                            icon={<Plus class="w-3.5" />}
                            onClick={() => setSelectedUuid(undefined)}
                        >
                            Add profile
                        </SideNavButton>
                        <For
                            each={profiles() ?? []}
                            fallback={
                                <div class="px-2.5 py-1.5 opacity-50">No Forge profiles yet.</div>
                            }
                        >
                            {profile => (
                                <SideNavButton
                                    active={selectedUuid() === profile.uuid}
                                    title={profile.tokenMasked}
                                    onClick={() => setSelectedUuid(profile.uuid)}
                                    icon={
                                        <span
                                            class="w-2 h-2 rounded-full"
                                            style={{
                                                'background-color': profile.color || '#f53003',
                                            }}
                                        />
                                    }
                                    trailing={
                                        <button
                                            type="button"
                                            class="p-0.5 rounded hover:brightness-125"
                                            on:click={async e => {
                                                e.stopPropagation();
                                                (await Confirm(
                                                    'Are you sure you want to delete this Forge profile?',
                                                )) && deleteProfile(profile);
                                            }}
                                        >
                                            <Trash class="w-3.5" />
                                        </button>
                                    }
                                >
                                    {profile.name}
                                </SideNavButton>
                            )}
                        </For>
                    </>
                }
            >
                <Edit profile={selectedProfile()} saveProfile={saveProfile} />
            </SideShell>
            <Show when={codeStore.currentTab} keyed>
                {tab => <StatusBar tab={tab} />}
            </Show>
        </div>
    );
};

export default Config;
