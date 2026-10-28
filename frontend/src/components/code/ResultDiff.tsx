import { Component, createEffect, onCleanup, onMount } from 'solid-js';
import * as monaco from 'monaco-editor';
import { Tab } from '../../stores/code';
import { resultText } from '../../utils/result/parse';
import { defineThemes } from '../../utils/editor/themes';
import { useGeneralStore } from '../../stores/general';
import { useSettingsStore } from '../../stores/settings';

const ResultDiff: Component<{ tab: Tab }> = props => {
    const [generalStore] = useGeneralStore();
    const [settingsStore] = useSettingsStore();
    let container!: HTMLDivElement;
    let diff: monaco.editor.IStandaloneDiffEditor;
    let original: monaco.editor.ITextModel;
    let modified: monaco.editor.ITextModel;

    onMount(() => {
        defineThemes();
        original = monaco.editor.createModel(resultText(props.tab.previousResult), 'php');
        modified = monaco.editor.createModel(resultText(props.tab.result), 'php');
        diff = monaco.editor.createDiffEditor(container, {
            readOnly: true,
            automaticLayout: true,
            renderSideBySide: true,
            fontSize: settingsStore.app.editor.fontSize,
            fontFamily: settingsStore.app.editor.fontFamily,
            lineHeight: settingsStore.app.editor.lineHeight,
            theme: generalStore.themeInfo.name,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
        });
        diff.setModel({ original, modified });
    });

    createEffect(() => {
        original?.setValue(resultText(props.tab.previousResult));
        modified?.setValue(resultText(props.tab.result));
    });

    createEffect(() => {
        diff?.updateOptions({
            fontSize: settingsStore.app.editor.fontSize,
            fontFamily: settingsStore.app.editor.fontFamily,
            lineHeight: settingsStore.app.editor.lineHeight,
        });
    });

    onCleanup(() => {
        diff?.dispose();
        original?.dispose();
        modified?.dispose();
    });

    return (
        <div
            class="h-full w-full"
            style={{ 'background-color': generalStore.themeInfo.colors.background }}
            ref={container}
        ></div>
    );
};

export default ResultDiff;
