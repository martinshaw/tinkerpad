import { Component } from 'solid-js';
import { history } from '../../../wailsjs/go/models';
import { useCodeStore } from '../../stores/code';
import { Screen, useGeneralStore } from '../../stores/general';
import Button from '../Button';
import Code from './Code';

const View: Component<{ log: history.HistoryLog }> = props => {
    const [codeStore] = useCodeStore();
    const [generalStore] = useGeneralStore();

    const applyTarget = (asNewTab: boolean) => {
        if (asNewTab) {
            codeStore.createNewTab(false, undefined, false);
        }
        const tabId = codeStore.currentTabId;
        codeStore.setTabWorkingDir(tabId, props.log.workingDir);
        codeStore.setTabCode(tabId, props.log.code);
        generalStore.setCurrentScreen(Screen.Code);
    };

    return (
        <div class="py-2 flex flex-col gap-5">
            <span>
                <span>Code run at </span>
                <span class="font-bold">{new Date(props.log.timestamp).toLocaleString()} </span>
                <span>in project </span>
                <span class="font-bold">{props.log.workingDir}</span>
            </span>
            <div
                class="h-96 border"
                style={{ 'border-color': generalStore.themeInfo.colors.secondary }}
            >
                <Code log={props.log} />
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
