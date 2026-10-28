import { Component } from 'solid-js';
import { favorites } from '../../../wailsjs/go/models';
import Input from '../Input';
import { useCodeStore } from '../../stores/code';
import Code from './Code';
import { Screen, useGeneralStore } from '../../stores/general';
import Button from '../Button';
import { getSnippetModel } from '../../utils/editor/model';
import { GetAll as GetProjects } from '../../../wailsjs/go/projects/Projects';
import { Error as ShowError } from '../../../wailsjs/go/dialog/Dialog';

const View: Component<{ favorite: favorites.Favorite }> = props => {
    const [codeStore] = useCodeStore();
    const [generalStore] = useGeneralStore();

    const applyTarget = async (asNewTab: boolean) => {
        if (asNewTab) {
            codeStore.createNewTab();
        }
        if (props.favorite.projectId) {
            const projects = await GetProjects();
            const project = projects.find(item => item.uuid === props.favorite.projectId);
            if (project) {
                try {
                    await codeStore.applyProject(codeStore.currentTabId, project);
                } catch (error) {
                    await ShowError(error instanceof Error ? error.message : String(error));
                }
            } else {
                codeStore.setTabWorkingDir(codeStore.currentTabId, props.favorite.workingDir);
            }
        } else if (props.favorite.workingDir) {
            codeStore.setTabWorkingDir(codeStore.currentTabId, props.favorite.workingDir);
        }
        codeStore.setTabCode(codeStore.currentTabId, props.favorite.code);
        if (!asNewTab) {
            getSnippetModel(codeStore.currentTab)?.setValue(props.favorite.code);
        }
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
