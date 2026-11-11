import { Component } from 'solid-js';
import { favorites } from '../../../wailsjs/go/models';
import Input from '../Input';
import { useCodeStore } from '../../stores/code';
import Code from './Code';
import { Screen, useGeneralStore } from '../../stores/general';
import Button from '../Button';
import { GetAll as GetProjects } from '../../../wailsjs/go/projects/Projects';
import { Error as ShowError } from '../../../wailsjs/go/dialog/Dialog';

const View: Component<{ favorite: favorites.Favorite }> = props => {
    const [codeStore] = useCodeStore();
    const [generalStore] = useGeneralStore();

    const applyTarget = async (asNewTab: boolean) => {
        // Resolve project before creating/switching tabs so the editor mounts
        // with the final working dir + code (not an empty stub).
        let project;
        if (props.favorite.projectId) {
            const projects = await GetProjects();
            project = projects.find(item => item.uuid === props.favorite.projectId);
        }

        if (asNewTab) {
            codeStore.createNewTab(false, undefined, false);
        }

        const tabId = codeStore.currentTabId;
        if (project) {
            try {
                await codeStore.applyProject(tabId, project);
            } catch (error) {
                await ShowError(error instanceof Error ? error.message : String(error));
            }
        } else if (props.favorite.workingDir) {
            codeStore.setTabWorkingDir(tabId, props.favorite.workingDir);
        }

        codeStore.setTabCode(tabId, props.favorite.code);
        generalStore.setCurrentScreen(Screen.Code);
    };

    return (
        <div class="py-2 flex flex-col gap-5">
            <Input label="Name" value={props.favorite.name} type="text" class="!max-w-[90%]" disabled />
            <Input
                label="Folder"
                value={props.favorite.folder || ''}
                type="text"
                class="!max-w-[90%]"
                disabled
            />
            <Input
                label="Tags"
                value={(props.favorite.tags ?? []).join(', ')}
                type="text"
                class="!max-w-[90%]"
                disabled
            />
            <Input
                label="Description"
                value={props.favorite.description || ''}
                type="text"
                class="!max-w-[90%]"
                disabled
            />
            <Input
                label="Project"
                value={props.favorite.workingDir}
                type="text"
                disabled
                class="!max-w-[90%]"
            />
            <div
                class="h-96 border"
                style={{ 'border-color': generalStore.themeInfo.colors.secondary }}
            >
                <Code favorite={props.favorite} />
            </div>
            <div class="flex gap-2">
                <Button on:click={() => applyTarget(false)} class="whitespace-nowrap">
                    Apply on current tab
                </Button>
                <Button on:click={() => applyTarget(true)} class="whitespace-nowrap">
                    Apply on new tab
                </Button>
            </div>
        </div>
    );
};

export default View;
