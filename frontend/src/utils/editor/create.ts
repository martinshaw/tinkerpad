import * as monaco from 'monaco-editor';
import { defineThemes } from './themes';
import { Tab, useCodeStore } from '../../stores/code';
import { useSettingsStore } from '../../stores/settings';
import { registerPHP } from './languages/php';
import { useGeneralStore } from '../../stores/general';
import { setContextMenu } from './context-menu';
import { registerEditorActions } from './actions';

export const createEditor = (
    container: HTMLElement,
    file: string,
    tab: Tab,
    result: boolean = false,
): monaco.editor.IStandaloneCodeEditor => {
    registerPHP();
    defineThemes();

    const [generalStore] = useGeneralStore();
    const [codeStore] = useCodeStore();
    const [settingsStore] = useSettingsStore();

    const editor = monaco.editor.create(container, {
        readOnly: result,
        fontSize: settingsStore.app.editor.fontSize,
        fontFamily: settingsStore.app.editor.fontFamily,
        lineHeight: settingsStore.app.editor.lineHeight,
        lineNumbers: result ? 'off' : settingsStore.app.editor.lineNumbers ? 'on' : 'off',
        tabSize: settingsStore.app.editor.tabSize || 4,
        minimap: {
            enabled: false,
        },
        scrollbar: {
            horizontalScrollbarSize: 5,
            verticalScrollbarSize: 5,
        },
        wordWrap: result || settingsStore.app.editor.wordWrap ? 'on' : 'off',
        theme: generalStore.themeInfo.name,
        stickyScroll: {
            enabled: false,
        },
        automaticLayout: true,
        glyphMargin: false,
        scrollBeyondLastLine: false,
        renderLineHighlight: result ? 'none' : 'line',
        folding: !result,
    });

    setContextMenu(editor);
    if (!result) {
        registerEditorActions(editor);
    }

    let editorModel = monaco.editor.getModel(monaco.Uri.file(file));

    const getParsedResult = () => {
        try {
            if (typeof tab.result === 'string') {
                return JSON.parse(tab.result)
                    .map((v: any) => v.raw)
                    .join('\n') as string;
            }

            return tab.result!.outputs.map(v => v.raw).join('\n');
        } catch (error) {
            return '';
        }
    };

    if (editorModel === null) {
        const code = result ? getParsedResult() : tab.code;
        editorModel = monaco.editor.createModel(
            code,
            result ? 'plaintext' : 'php',
            monaco.Uri.file(file),
        );
    } else if (result) {
        monaco.editor.setModelLanguage(editorModel, 'plaintext');
        editorModel.setValue(getParsedResult());
    }

    editor.setModel(editorModel);

    if (result) {
        return editor;
    }

    editor.onDidChangeModelContent(() => {
        codeStore.setTabCode(tab.id, editor.getValue());
    });

    const lineCount = editorModel.getLineCount();

    editor.setPosition({
        lineNumber: lineCount,
        column: editorModel.getLineContent(lineCount).length + 1,
    });

    editor.focus();

    return editor;
};
