import { Component } from 'solid-js';
import Plus from '../../icons/Plus';
import { useCodeStore } from '../../../stores/code';
import { createTooltip } from '../../../utils/tooltip/create';
import { useGeneralStore } from '../../../stores/general';
import { shortcutLabel } from '../../../utils/hotkey/mod';

const NewTab: Component<{ compact?: boolean; paneId?: string }> = props => {
    const [generalStore] = useGeneralStore();
    const [codeStore] = useCodeStore();
    const label = () => `New tab (${shortcutLabel('mod', 'T')})`;

    const buttonId = () =>
        props.compact
            ? 'new-tab-button-title'
            : props.paneId
              ? `new-tab-button-${props.paneId}`
              : 'new-tab-button';

    createTooltip(`#${buttonId()}`, label());

    return (
        <button
            type="button"
            id={buttonId()}
            on:click={() => codeStore.createNewTab(false, props.paneId)}
            classList={{
                'min-w-7 max-w-7 h-7 grow hover:brightness-110 flex items-center justify-center':
                    !props.compact,
                'p-0.5 rounded-md flex items-center hover:brightness-110': !!props.compact,
            }}
            style={{
                color: generalStore.themeInfo.colors.primary,
                'background-color': generalStore.themeInfo.colors.background,
                '--wails-draggable': 'no-drag',
            }}
            title={label()}
        >
            <Plus class={props.compact ? 'h-4 w-4' : 'h-4'} />
        </button>
    );
};

export default NewTab;
