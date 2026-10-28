import { Component, createEffect, Show } from 'solid-js';
import { Tab, useCodeStore } from '../../../stores/code';
import { Screen, useGeneralStore } from '../../../stores/general';
import { StopSession } from '../../../../wailsjs/go/php/Php';
import { createTooltip } from '../../../utils/tooltip/create';
import Refresh from '../../icons/Refresh';
import Database from '../../icons/Database';
import GitCompare from '../../icons/GitCompare';

const SessionControls: Component<{ tab: Tab }> = props => {
    const [generalStore] = useGeneralStore();
    const [codeStore] = useCodeStore();
    const persistent = () => props.tab.persistent !== false;

    createEffect(() => {
        createTooltip('#session-toggle', persistent() ? 'Persistent session on' : 'Run once');
        createTooltip('#reset-session', 'Reset session');
        createTooltip('#query-log-toggle', 'Laravel query log');
        createTooltip('#compare-results', 'Compare with previous run');
        createTooltip('#open-database', 'Database');
    });

    const buttonClass = 'py-2 px-3 w-min text-center whitespace-nowrap hover:brightness-110 select-none';

    return (
        <>
            <div
                id="session-toggle"
                on:click={() => codeStore.setPersistent(props.tab.id, !persistent())}
                class={buttonClass}
                classList={{ 'font-bold': persistent() }}
                style={{ 'background-color': generalStore.themeInfo.colors.background }}
            >
                Session
            </div>
            <div
                id="reset-session"
                on:click={() => StopSession(props.tab.id)}
                class={buttonClass}
                style={{ 'background-color': generalStore.themeInfo.colors.background }}
            >
                <Refresh class="w-4 inline -mt-0.5" />
            </div>
            <div
                id="query-log-toggle"
                on:click={() => codeStore.setQueryLog(props.tab.id, !props.tab.queryLog)}
                class={buttonClass}
                classList={{ 'font-bold': !!props.tab.queryLog }}
                style={{ 'background-color': generalStore.themeInfo.colors.background }}
            >
                SQL
            </div>
            <div
                id="compare-results"
                on:click={() => codeStore.toggleCompare()}
                class={buttonClass}
                classList={{ 'brightness-125': codeStore.compareResults }}
                style={{ 'background-color': generalStore.themeInfo.colors.background }}
            >
                <GitCompare class="w-4 inline -mt-0.5" />
            </div>
            <div
                id="open-database"
                on:click={() =>
                    generalStore.setCurrentScreen(
                        generalStore.currentScreen === Screen.Database
                            ? Screen.Code
                            : Screen.Database,
                    )
                }
                class={buttonClass}
                style={{ 'background-color': generalStore.themeInfo.colors.background }}
            >
                <Show when={generalStore.currentScreen === Screen.Database} fallback={<Database class="w-4 inline -mt-0.5" />}>
                    <Database class="w-4 inline -mt-0.5" />
                </Show>
            </div>
        </>
    );
};

export default SessionControls;
