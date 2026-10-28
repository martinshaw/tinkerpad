import { Component } from 'solid-js';
import { Tab, useCodeStore } from '../../../stores/code';
import { Screen, useGeneralStore } from '../../../stores/general';
import { StopSession } from '../../../../wailsjs/go/php/Php';
import StatusPopover, { menuItemClass, menuSectionClass } from './StatusPopover';
import MoreHorizontal from '../../icons/MoreHorizontal';
import Refresh from '../../icons/Refresh';
import Database from '../../icons/Database';
import { shortcutLabel } from '../../../utils/hotkey/mod';

const onOff = (on: boolean) => (
    <span
        class="text-[10px] uppercase tracking-wide shrink-0 w-7 text-right"
        classList={{ 'opacity-90 font-semibold': on, 'opacity-45': !on }}
    >
        {on ? 'On' : 'Off'}
    </span>
);

const hint = (...parts: string[]) => (
    <span class="opacity-45 text-[10px] tracking-wide shrink-0 tabular-nums">
        {shortcutLabel(...parts)}
    </span>
);

const RuntimeMenu: Component<{ tab: Tab }> = props => {
    const [generalStore] = useGeneralStore();
    const [codeStore] = useCodeStore();
    const persistent = () => props.tab.persistent !== false;

    return (
        <StatusPopover title="Session tools" label={<MoreHorizontal class="w-4" />} wide>
            <div class={menuSectionClass}>Session</div>
            <button
                type="button"
                data-keep-open
                class={menuItemClass}
                on:click={() => codeStore.setPersistent(props.tab.id, !persistent())}
            >
                <span class="grow text-left">Persistent session</span>
                {onOff(persistent())}
                {hint('mod', 'shift', 'P')}
            </button>
            <button
                type="button"
                class={menuItemClass}
                on:click={() => StopSession(props.tab.id)}
            >
                <Refresh class="w-3.5 opacity-70" />
                <span class="grow text-left">Reset session</span>
                {hint('mod', 'shift', 'R')}
            </button>

            <div class={menuSectionClass}>Tools</div>
            <button
                type="button"
                class={menuItemClass}
                on:click={() =>
                    generalStore.setCurrentScreen(
                        generalStore.currentScreen === Screen.Database
                            ? Screen.Code
                            : Screen.Database,
                    )
                }
            >
                <Database class="w-3.5 opacity-70" />
                <span class="grow text-left">Database</span>
                {hint('mod', '7')}
            </button>
        </StatusPopover>
    );
};

export default RuntimeMenu;
