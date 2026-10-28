import { Component, Show } from 'solid-js';
import { Tab, useCodeStore } from '../../../stores/code';
import { useGeneralStore } from '../../../stores/general';
import LoaderCircle from '../../icons/LoaderCircle';
import SquarePlay from '../../icons/SquarePlay';
import { createTooltip } from '../../../utils/tooltip/create';
import { shortcutLabel } from '../../../utils/hotkey/mod';

const RunCodeButton: Component<{ tab: Tab }> = props => {
    const [generalStore] = useGeneralStore();
    const [codeStore] = useCodeStore();

    createTooltip('#run-code-button', `Run code (${shortcutLabel('mod', 'R')})`);

    return (
        <div
            id="run-code-button"
            on:click={() => props.tab.loading || codeStore.runCode(props.tab)}
            class="h-full px-4 flex items-center whitespace-nowrap hover:brightness-110 select-none cursor-pointer"
            style={{ 'background-color': generalStore.themeInfo.colors.background }}
        >
            <Show
                when={props.tab.loading === false}
                fallback={<LoaderCircle class="w-4 animate-spin" />}
            >
                <SquarePlay class="w-4" />
            </Show>
        </div>
    );
};

export default RunCodeButton;
