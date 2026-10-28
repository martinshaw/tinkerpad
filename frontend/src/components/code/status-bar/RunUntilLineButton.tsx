import { Component, Show } from 'solid-js';
import { Tab, useCodeStore } from '../../../stores/code';
import { useGeneralStore } from '../../../stores/general';
import LoaderCircle from '../../icons/LoaderCircle';
import SquarePlayUntil from '../../icons/SquarePlayUntil';
import { createTooltip } from '../../../utils/tooltip/create';
import { shortcutLabel } from '../../../utils/hotkey/mod';
import { executeUntilSelectedLine } from '../../../utils/editor/actions';

const RunUntilLineButton: Component<{ tab: Tab }> = props => {
    const [generalStore] = useGeneralStore();
    const [codeStore] = useCodeStore();

    createTooltip(
        '#run-until-line-button',
        `Execute until selected line (${shortcutLabel('mod', 'Enter')})`,
    );

    return (
        <div
            id="run-until-line-button"
            on:click={() => {
                if (props.tab.loading || codeStore.currentTabId !== props.tab.id) {
                    return;
                }
                executeUntilSelectedLine();
            }}
            class="h-full px-4 flex items-center whitespace-nowrap hover:brightness-110 select-none cursor-pointer"
            style={{ 'background-color': generalStore.themeInfo.colors.background }}
        >
            <Show
                when={props.tab.loading === false}
                fallback={<LoaderCircle class="w-4 animate-spin" />}
            >
                <SquarePlayUntil class="w-4" />
            </Show>
        </div>
    );
};

export default RunUntilLineButton;
