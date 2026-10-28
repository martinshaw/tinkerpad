import { Component, createResource, createSignal, For, Show } from 'solid-js';
import { useGeneralStore } from '../../stores/general';
import Star from './../icons/Star';
import Plus from './../icons/Plus';
import {
    GetAll,
    Save,
    Import,
    Export,
    AddLaravelStarters,
} from '../../../wailsjs/go/favorites/Favorites';
import { OpenJsonFile, SaveJsonFile, Error as ShowError } from '../../../wailsjs/go/dialog/Dialog';
import { favorites } from '../../../wailsjs/go/models';
import Create from './Create';
import View from './View';
import Trash from '../icons/Trash';
import { Confirm } from '../../../wailsjs/go/dialog/Dialog';
import SideShell, { SideNavButton } from '../macos/SideShell';
import { PrefButton, PrefSelect, PrefTextField } from '../macos/PrefControl';

const Favorites: Component = () => {
    const [selectedFavorite, setSelectedFavorite] = createSignal<favorites.Favorite | undefined>(
        undefined,
    );
    const [selectedProject, setSelectedProject] = createSignal('');
    const [selectedFolder, setSelectedFolder] = createSignal('');
    const [search, setSearch] = createSignal('');
    const [favorites, { mutate, refetch }] = createResource(async () => await GetAll());
    const [generalStore] = useGeneralStore();

    const saveFavorite = async (favorite: favorites.Favorite) => {
        mutate([...favorites()!, favorite]);
        await Save(favorites()!);
        await refetch();
        setSelectedFavorite(favorites()?.find(f => f.uuid === favorite.uuid));
    };

    const deleteFavorite = async (favorite: favorites.Favorite) => {
        mutate(favorites()?.filter(f => f.uuid !== favorite.uuid));
        await Save(favorites()!);
        await refetch();
        if (selectedFavorite()?.uuid === favorite.uuid) {
            setSelectedFavorite(undefined);
        }
    };

    const visible = () => {
        const query = search().trim().toLowerCase();
        return (favorites() ?? []).filter(favorite => {
            if (selectedProject() && favorite.workingDir !== selectedProject()) {
                return false;
            }
            if (selectedFolder() && (favorite.folder || '') !== selectedFolder()) {
                return false;
            }
            if (!query) {
                return true;
            }
            const tags = (favorite.tags ?? []).join(' ');
            return [favorite.name, favorite.description, favorite.code, favorite.folder, tags]
                .join('\n')
                .toLowerCase()
                .includes(query);
        });
    };

    const folders = () => [...new Set((favorites() ?? []).map(favorite => favorite.folder || ''))];
    const tags = () => [...new Set((favorites() ?? []).flatMap(favorite => favorite.tags ?? []))];

    const importSnippets = async () => {
        const path = await OpenJsonFile();
        if (!path) {
            return;
        }
        try {
            await Import(path);
            await refetch();
        } catch (error) {
            await ShowError(error instanceof Error ? error.message : String(error));
        }
    };

    const exportSnippets = async () => {
        const path = await SaveJsonFile('tinkerpad-snippets.json');
        if (!path) {
            return;
        }
        try {
            await Export(path);
        } catch (error) {
            await ShowError(error instanceof Error ? error.message : String(error));
        }
    };

    const addStarters = async () => {
        try {
            await AddLaravelStarters();
            await refetch();
        } catch (error) {
            await ShowError(error instanceof Error ? error.message : String(error));
        }
    };

    const contentTitle = () => selectedFavorite()?.name || 'New favorite';

    return (
        <SideShell
            title="Favorites"
            titleIcon={<Star class="h-4 w-4" />}
            contentTitle={contentTitle()}
            sidebarWidth="15rem"
            sidebar={
                <>
                    <div class="flex flex-col gap-1.5 px-0.5 mb-2">
                        <PrefButton class="!w-full !max-w-none" on:click={importSnippets}>
                            Import
                        </PrefButton>
                        <PrefButton class="!w-full !max-w-none" on:click={exportSnippets}>
                            Export
                        </PrefButton>
                        <PrefButton class="!w-full !max-w-none" on:click={addStarters}>
                            Laravel starters
                        </PrefButton>
                    </div>
                    <div class="px-0.5 mb-2">
                        <PrefTextField
                            class="!max-w-none"
                            placeholder="Search"
                            value={search()}
                            on:input={e => setSearch(e.currentTarget.value)}
                        />
                    </div>
                    <SideNavButton
                        active={selectedFavorite() === undefined}
                        icon={<Plus class="w-3.5" />}
                        onClick={() => setSelectedFavorite(undefined)}
                    >
                        Add favorite
                    </SideNavButton>
                    <Show when={favorites()?.length}>
                        <div class="flex flex-col gap-1.5 px-0.5 my-2">
                            <PrefSelect
                                class="!max-w-none"
                                value={selectedProject()}
                                on:input={e => setSelectedProject(e.currentTarget.value)}
                            >
                                <option value="">All projects</option>
                                <For each={[...new Set(favorites()?.map(p => p.workingDir))]}>
                                    {project => <option value={project}>{project}</option>}
                                </For>
                            </PrefSelect>
                            <PrefSelect
                                class="!max-w-none"
                                value={selectedFolder()}
                                on:input={e => setSelectedFolder(e.currentTarget.value)}
                            >
                                <option value="">All folders</option>
                                <For each={folders().filter(Boolean)}>
                                    {folder => <option value={folder}>{folder}</option>}
                                </For>
                            </PrefSelect>
                        </div>
                        <Show when={tags().length}>
                            <div class="flex flex-wrap gap-1 px-1 mb-2">
                                <For each={tags()}>
                                    {tag => (
                                        <button
                                            type="button"
                                            class="px-1.5 py-0.5 rounded text-[11px] hover:brightness-110"
                                            style={{
                                                'background-color':
                                                    generalStore.themeInfo.colors.secondary,
                                            }}
                                            on:click={() => setSearch(tag)}
                                        >
                                            {tag}
                                        </button>
                                    )}
                                </For>
                            </div>
                        </Show>
                    </Show>
                    <For each={visible()} fallback={<div class="px-2.5 py-1.5 opacity-50">No favorites yet.</div>}>
                        {favorite => (
                            <SideNavButton
                                active={selectedFavorite()?.uuid === favorite.uuid}
                                title={favorite.name}
                                onClick={() => setSelectedFavorite(favorite)}
                                trailing={
                                    <button
                                        type="button"
                                        class="p-0.5 rounded hover:brightness-125"
                                        on:click={async e => {
                                            e.stopPropagation();
                                            (await Confirm(
                                                'Are you sure you want to delete this favorite?',
                                            )) && deleteFavorite(favorite);
                                        }}
                                    >
                                        <Trash class="w-3.5" />
                                    </button>
                                }
                            >
                                {favorite.name}
                            </SideNavButton>
                        )}
                    </For>
                </>
            }
        >
            <Show
                keyed
                when={selectedFavorite()}
                fallback={<Create saveFavorite={saveFavorite} />}
            >
                {favorite => <View favorite={favorite} />}
            </Show>
        </SideShell>
    );
};

export default Favorites;
