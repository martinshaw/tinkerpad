import * as monaco from 'monaco-editor';
import { EXECUTE_UNTIL_LINE_ACTION_ID } from './actions';

export const setContextMenu = (editor: monaco.editor.IStandaloneCodeEditor) => {
    const keepIds = [
        'editor.action.clipboardCutAction',
        'editor.action.clipboardCopyAction',
        'editor.action.clipboardPasteAction',
        EXECUTE_UNTIL_LINE_ACTION_ID,
    ];
    const contextmenu = editor.getContribution('editor.contrib.contextmenu')! as any;
    const realMethod = contextmenu._getMenuActions;
    contextmenu._getMenuActions = function () {
        const items = realMethod.apply(contextmenu, arguments);
        return items.filter((i: any) => keepIds.includes(i.id));
    };
};
