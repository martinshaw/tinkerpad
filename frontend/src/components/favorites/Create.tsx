import { Component, createSignal } from 'solid-js';
import { favorites } from '../../../wailsjs/go/models';
import Input from '../Input';
import { useCodeStore } from '../../stores/code';
import Code from './Code';
import { useGeneralStore } from '../../stores/general';
import Button from '../Button';
import { v4 } from 'uuid';

const Create: Component<{
    saveFavorite: (favorite: favorites.Favorite) => Promise<void>;
}> = props => {
    const [name, setName] = createSignal('');
    const [folder, setFolder] = createSignal('');
    const [tags, setTags] = createSignal('');
    const [description, setDescription] = createSignal('');
    const [errors, setErrors] = createSignal({} as Record<string, string>);
    const [codeStore] = useCodeStore();
    const [generalStore] = useGeneralStore();

    return (
        <div class="py-2 flex flex-col gap-5">
            <Input
                label="Name"
                error={errors().name}
                value={name()}
                type="text"
                class="!max-w-[90%]"
                on:input={e => {
                    const next = e.currentTarget.value;
                    if (next) {
                        setName(next);
                        setErrors({ ...errors(), name: '' });
                    } else {
                        setErrors({ ...errors(), name: 'Invalid name' });
                    }
                }}
            />
            <Input
                label="Folder"
                value={folder()}
                type="text"
                class="!max-w-[90%]"
                on:input={e => setFolder(e.currentTarget.value)}
            />
            <Input
                label="Tags"
                value={tags()}
                type="text"
                class="!max-w-[90%]"
                on:input={e => setTags(e.currentTarget.value)}
            />
            <Input
                label="Description"
                value={description()}
                type="text"
                class="!max-w-[90%]"
                on:input={e => setDescription(e.currentTarget.value)}
            />
            <Input
                label="Project"
                value={codeStore.currentTab.projectName || codeStore.currentTab.workingDir}
                type="text"
                disabled
                class="!max-w-[90%]"
            />
            <div
                class="h-96 border"
                style={{ 'border-color': generalStore.themeInfo.colors.secondary }}
            >
                <Code tab={codeStore.currentTab} />
            </div>
            <Button
                on:click={() =>
                    props.saveFavorite(
                        new favorites.Favorite({
                            uuid: v4(),
                            name: name(),
                            code: codeStore.currentTab.code,
                            workingDir: codeStore.currentTab.workingDir,
                            timestamp: Date.now(),
                            folder: folder(),
                            description: description(),
                            projectId: codeStore.currentTab.projectId || '',
                            tags: tags()
                                .split(',')
                                .map(tag => tag.trim())
                                .filter(Boolean),
                        }),
                    )
                }
                disabled={!name() || !!errors().name}
            >
                Save
            </Button>
        </div>
    );
};

export default Create;
