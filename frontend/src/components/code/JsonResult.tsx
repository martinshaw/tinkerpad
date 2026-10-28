import { Component, createEffect, onCleanup, onMount } from 'solid-js';
import * as monaco from 'monaco-editor';
import { Tab } from '../../stores/code';
import { createEditor } from '../../utils/editor/create';
import { useGeneralStore } from '../../stores/general';
import { useSettingsStore } from '../../stores/settings';
import { jsonViewText } from '../../utils/result/parse';

const JsonResult: Component<{ tab: Tab }> = props => {
    const [generalStore] = useGeneralStore();
    const [settingsStore] = useSettingsStore();
    let editor: monaco.editor.IStandaloneCodeEditor;
    let container!: HTMLDivElement;

    onMount(async () => {
        const dir = props.tab.workingDir;
        const file = dir + `/result-json-${props.tab.id}.json`;
        editor = createEditor(container, file, props.tab, true);
        editor.updateOptions({ readOnly: true });
        monaco.editor.setModelLanguage(editor.getModel()!, 'json');
    });

    createEffect(() => {
        const fontSize = settingsStore.app.editor.fontSize;
        const fontFamily = settingsStore.app.editor.fontFamily;
        const lineHeight = settingsStore.app.editor.lineHeight;
        editor?.updateOptions({ fontSize, fontFamily, lineHeight, readOnly: true });
    });

    createEffect(() => {
        const text = jsonViewText(props.tab.result?.outputs ?? []);
        editor?.setValue(text || 'null');
    });

    onCleanup(async () => editor?.dispose());

    return (
        <div
            class="h-full w-full"
            style={{ 'background-color': generalStore.themeInfo.colors.background }}
            ref={container}
        />
    );
};

export default JsonResult;
