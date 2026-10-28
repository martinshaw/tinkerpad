import { createSignal } from 'solid-js';
import { projects as projectModels } from '../../wailsjs/go/models';
import { GetAll } from '../../wailsjs/go/projects/Projects';

const [projectList, setProjectList] = createSignal<projectModels.Project[]>([]);

export const loadProjects = async () => {
    setProjectList((await GetAll()) ?? []);
};

export const useProjects = () => projectList;
