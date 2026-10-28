import * as monaco from 'monaco-editor';
import { useCodeStore } from '../../stores/code';
import { selectedLineNumber } from './code-range';

export const EXECUTE_UNTIL_LINE_ACTION_ID = 'tinkerpad.executeUntilSelectedLine';

const [codeStore] = useCodeStore();

export const registerEditorActions = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editor.addAction({
        id: EXECUTE_UNTIL_LINE_ACTION_ID,
        label: 'Execute Until Selected Line',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 0.5,
        precondition: undefined,
        run: ed => {
            const tab = codeStore.currentTab;
            if (!tab || tab.loading) {
                return;
            }
            const line =
                selectedLineNumber(ed.getSelection()) ?? ed.getPosition()?.lineNumber ?? null;
            if (line == null) {
                return;
            }
            void codeStore.runCodeUntilLine(tab, line);
        },
    });
};

export const getActiveCodeEditor = (): monaco.editor.IStandaloneCodeEditor | null => {
    const editors = monaco.editor.getEditors() as monaco.editor.IStandaloneCodeEditor[];
    const writable = editors.filter(ed => !ed.getOption(monaco.editor.EditorOption.readOnly));
    return writable.find(ed => ed.hasTextFocus()) ?? writable[0] ?? null;
};

export const executeUntilSelectedLine = () => {
    const tab = codeStore.currentTab;
    if (!tab || tab.loading) {
        return;
    }
    const editor = getActiveCodeEditor();
    const line =
        selectedLineNumber(editor?.getSelection() ?? null) ??
        editor?.getPosition()?.lineNumber ??
        null;
    if (line == null) {
        return;
    }
    void codeStore.runCodeUntilLine(tab, line);
};
