import { Component, createEffect, For, onMount } from 'solid-js';
import { Tab, useCodeStore } from '../../../stores/code';
import { Screen, useGeneralStore } from '../../../stores/general';
import { loadProjects, useProjects } from '../../../stores/projects';
import { Error as ShowError } from '../../../../wailsjs/go/dialog/Dialog';
import { createTooltip } from '../../../utils/tooltip/create';

const ProjectButton: Component<{ tab: Tab }> = props => {
    const [generalStore] = useGeneralStore();
    const [codeStore] = useCodeStore();
    const projects = useProjects();

    onMount(() => loadProjects());
    createEffect(() => createTooltip('#project-picker', 'Saved project'));

    const apply = async (value: string) => {
        if (value === '__manage') {
            generalStore.setCurrentScreen(Screen.Projects);
            return;
        }
        if (!value) {
            return;
        }
        const project = projects().find(item => item.uuid === value);
        if (!project) {
            return;
        }
        try {
            await codeStore.applyProject(props.tab.id, project);
        } catch (error) {
            await ShowError(error instanceof Error ? error.message : String(error));
        }
    };

    return (
        <div
            id="project-picker"
            class="flex items-center px-2"
            style={{ 'background-color': generalStore.themeInfo.colors.background }}
        >
            <select
                class="bg-transparent max-w-40 truncate py-1"
                value={props.tab.projectId ?? ''}
                on:change={e => apply(e.currentTarget.value)}
            >
                <option value="">No project</option>
                <For each={projects()}>
                    {project => <option value={project.uuid}>{project.name}</option>}
                </For>
                <option value="__manage">Manage projects…</option>
            </select>
        </div>
    );
};

export default ProjectButton;
