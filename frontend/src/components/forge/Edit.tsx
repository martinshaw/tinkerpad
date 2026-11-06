import { Component, createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { forge } from '../../../wailsjs/go/models';
import { ListAllSites } from '../../../wailsjs/go/forge/Forge';
import { BrowserOpenURL } from '../../../wailsjs/runtime/runtime';
import { Error as ShowError } from '../../../wailsjs/go/dialog/Dialog';
import Input from '../Input';
import Button from '../Button';
import ForgeIcon from '../icons/Forge';
import LoaderCircle from '../icons/LoaderCircle';
import { useGeneralStore } from '../../stores/general';

export type ForgeProfileDraft = {
    uuid: string;
    name: string;
    color: string;
    token: string;
    tokenMasked: string;
    hasToken: boolean;
};

const Edit: Component<{
    profile?: forge.ProfileView;
    saveProfile: (draft: ForgeProfileDraft, connectSite?: forge.SiteOption) => Promise<void>;
}> = props => {
    const [generalStore] = useGeneralStore();
    const blank = (): ForgeProfileDraft => ({
        uuid: '',
        name: '',
        color: '#f53003',
        token: '',
        tokenMasked: '',
        hasToken: false,
    });

    const fromView = (view?: forge.ProfileView): ForgeProfileDraft =>
        view
            ? {
                  uuid: view.uuid,
                  name: view.name,
                  color: view.color || '#f53003',
                  token: '',
                  tokenMasked: view.tokenMasked,
                  hasToken: view.hasToken,
              }
            : blank();

    const [draft, setDraft] = createStore(fromView(props.profile));
    const [errors, setErrors] = createSignal({} as Record<string, string>);
    const [saving, setSaving] = createSignal(false);

    createEffect(() => setDraft(fromView(props.profile)));

    const [sites, { refetch: refetchSites }] = createResource(
        () => props.profile?.uuid || '',
        async profileUuid => {
            if (!profileUuid) {
                return [] as forge.SiteOption[];
            }
            try {
                return await ListAllSites(profileUuid);
            } catch (error) {
                await ShowError(error instanceof Error ? error.message : String(error));
                return [];
            }
        },
    );

    const isMissingRequired = () =>
        !draft.name.trim() || (!draft.uuid && !draft.token.trim());

    const hasErrors = () =>
        Object.values(errors()).some(Boolean) || isMissingRequired() || saving();

    const isDirty = () => {
        const original = fromView(props.profile);
        return (
            draft.name !== original.name ||
            draft.color !== original.color ||
            draft.token.trim() !== ''
        );
    };

    const persist = async (site?: forge.SiteOption) => {
        setSaving(true);
        try {
            await props.saveProfile({ ...draft }, site);
            if (!site) {
                await refetchSites();
            }
        } catch (error) {
            await ShowError(error instanceof Error ? error.message : String(error));
        }
        setSaving(false);
    };

    return (
        <div class="py-2 flex flex-col gap-4">
            <div class="flex items-end gap-2">
                <Input
                    label="Name"
                    error={errors().name}
                    value={draft.name}
                    type="text"
                    placeholder="Production Forge"
                    vertical
                    on:input={e => {
                        const name = e.currentTarget.value;
                        if (name.trim()) {
                            setDraft('name', name);
                            setErrors({ ...errors(), name: '' });
                        } else {
                            setErrors({ ...errors(), name: 'Invalid name' });
                        }
                    }}
                />
                <div class="w-16">
                    <Input
                        label="Color"
                        error={errors().color}
                        value={draft.color}
                        type="color"
                        class="h-[33px]"
                        vertical
                        on:input={e => {
                            const color = e.currentTarget.value;
                            if (color) {
                                setDraft('color', color);
                                setErrors({ ...errors(), color: '' });
                            } else {
                                setErrors({ ...errors(), color: 'Invalid color' });
                            }
                        }}
                    />
                </div>
            </div>
            <Input
                label="API Token"
                error={errors().token}
                value={draft.token}
                type="password"
                placeholder={
                    draft.hasToken
                        ? `Saved token ${draft.tokenMasked} — leave blank to keep`
                        : 'Forge API token'
                }
                vertical
                on:input={e => setDraft('token', e.currentTarget.value)}
            />
            <button
                type="button"
                class="text-xs opacity-60 text-left hover:opacity-100 w-fit"
                on:click={() => BrowserOpenURL('https://forge.laravel.com/user-profile/api')}
            >
                Create a token in Forge →
            </button>
            <div class="flex gap-2 mt-1">
                <Button
                    on:click={() => void persist()}
                    disabled={hasErrors() || (Boolean(draft.uuid) && !isDirty())}
                    class="whitespace-nowrap"
                >
                    {saving() ? (
                        <span>
                            <LoaderCircle class="w-4 inline mr-1 -mt-0.5 animate-spin" />
                            Saving…
                        </span>
                    ) : draft.uuid ? (
                        'Save'
                    ) : (
                        'Create profile'
                    )}
                </Button>
            </div>

            <Show when={draft.uuid}>
                <div class="flex flex-col gap-2 mt-2">
                    <div class="flex items-center justify-between">
                        <div class="text-xs uppercase tracking-wide opacity-60">Sites</div>
                        <button
                            type="button"
                            class="text-xs opacity-60 hover:opacity-100"
                            on:click={() => void refetchSites()}
                        >
                            Refresh
                        </button>
                    </div>
                    <Show when={sites.loading}>
                        <div class="opacity-50 text-sm flex items-center gap-1.5">
                            <LoaderCircle class="w-3.5 animate-spin" />
                            Loading sites…
                        </div>
                    </Show>
                    <Show when={!sites.loading && (sites() || []).length === 0}>
                        <div class="opacity-50 text-sm">No sites found for this profile.</div>
                    </Show>
                    <For each={sites() || []}>
                        {site => (
                            <button
                                type="button"
                                class="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 hover:brightness-110"
                                style={{
                                    'background-color': generalStore.themeInfo.colors.secondary,
                                }}
                                on:click={() => void persist(site)}
                            >
                                <ForgeIcon class="w-3.5 opacity-70" />
                                <span class="truncate grow">{site.siteName}</span>
                                <span class="opacity-50 text-[10px] truncate max-w-[8rem]">
                                    {site.serverName}
                                </span>
                                <span class="text-[10px] opacity-70 shrink-0">Connect</span>
                            </button>
                        )}
                    </For>
                </div>
            </Show>
        </div>
    );
};

export default Edit;
