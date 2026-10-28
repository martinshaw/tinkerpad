import { Component, createSignal, Show } from 'solid-js';
import Cog from './icons/Cog';
import {
    WindowIsMaximised,
    WindowMaximise,
    WindowUnmaximise,
} from '../../wailsjs/runtime/runtime';
import { createTooltip } from '../utils/tooltip/create';
import { listener } from '../utils/window-size/boot';
import { Screen, useGeneralStore } from '../stores/general';
import Star from './icons/Star';
import History from './icons/History';
import { useUpdateStore } from '../stores/update';
import UpdateDialog from './UpdateDialog';
import NewTab from './code/tabs/NewTab';
import { useCodeStore } from '../stores/code';
import { shortcutLabel } from '../utils/hotkey/mod';
import XMark from './icons/XMark';

/** Title bar height under native (non-toolbar) macOS traffic lights. */
export const TITLE_BAR_HEIGHT_PX = 44;

const TitleBar: Component<{ showNewTab?: boolean }> = props => {
    const [generalStore] = useGeneralStore();
    const [codeStore] = useCodeStore();
    const [updateStore] = useUpdateStore();
    const [showUpdateDialog, setShowUpdateDialog] = createSignal(false);

    createTooltip('#open-settings-button', `Settings (${shortcutLabel('mod', ',')})`);
    createTooltip('#open-favorites-button', `Favorites (${shortcutLabel('mod', '2')})`);
    createTooltip('#open-history-button', `History (${shortcutLabel('mod', '3')})`);
    createTooltip('#close-file-button', `Close file (${shortcutLabel('mod', 'W')})`);

    const soleFileTab = () =>
        codeStore.tabs.length === 1 && Boolean(codeStore.currentTab?.filePath);

    const titleText = () => {
        if (soleFileTab()) {
            return codeStore.currentTab.filePath || '';
        }
        return generalStore.isLinux ? '' : 'tinkerpad';
    };

    const showPlus = () => props.showNewTab || codeStore.tabs.length <= 1;

    const iconButton = (active: boolean) => ({
        'background-color':
            generalStore.themeInfo.colors[active ? 'primary' : 'background'],
        color: generalStore.themeInfo.colors[active ? 'background' : 'primary'],
        '--wails-draggable': 'no-drag',
    });

    return (
        <div
            on:dblclick={async () =>
                (await WindowIsMaximised()) ? WindowUnmaximise() : WindowMaximise()
            }
            on:mouseup={listener}
            class="relative flex items-center justify-center text-xs font-semibold cursor-default select-none shrink-0"
            classList={{
                // Clear macOS traffic lights (vertically centered in the toolbar).
                'pl-[78px]': !generalStore.isLinux,
            }}
            style={{
                height: `${TITLE_BAR_HEIGHT_PX}px`,
                '--wails-draggable': 'drag',
                'background-color': generalStore.themeInfo.colors.background,
                color: generalStore.themeInfo.colors.primary,
            }}
        >
            <span
                class="leading-none pointer-events-none max-w-[min(40rem,calc(100%-11rem))] truncate px-2"
                classList={{ 'font-medium opacity-90': soleFileTab() }}
                title={soleFileTab() ? codeStore.currentTab.filePath : undefined}
            >
                {titleText()}
            </span>

            <Show when={showUpdateDialog()}>
                <UpdateDialog onClose={() => setShowUpdateDialog(false)} />
            </Show>

            <div
                class="absolute inset-y-0 right-2 flex items-center gap-1"
                style={{ '--wails-draggable': 'no-drag' }}
            >
                <Show when={soleFileTab()}>
                    <button
                        type="button"
                        id="close-file-button"
                        class="p-0.5 rounded flex items-center hover:brightness-110"
                        style={iconButton(false)}
                        title={`Close file (${shortcutLabel('mod', 'W')})`}
                        on:dblclick={e => e.stopPropagation()}
                        on:click={() => void codeStore.closeTab(codeStore.currentTabId)}
                    >
                        <XMark class="h-4 w-4" />
                    </button>
                </Show>
                <Show when={showPlus()}>
                    <NewTab compact />
                </Show>
                <Show when={updateStore.hasUpdate}>
                    <div
                        on:click={() => setShowUpdateDialog(true)}
                        class="flex items-center h-5 text-[10px] px-1.5 font-semibold rounded border hover:brightness-110"
                        title={
                            updateStore.info
                                ? `Update to ${updateStore.info.version}`
                                : 'Update available'
                        }
                    >
                        Update
                    </div>
                </Show>
                <div
                    id="open-history-button"
                    on:dblclick={e => e.stopPropagation()}
                    on:click={() =>
                        generalStore.setCurrentScreen(
                            generalStore.currentScreen === Screen.History
                                ? Screen.Code
                                : Screen.History,
                        )
                    }
                    class="p-0.5 rounded flex items-center hover:brightness-110"
                    style={iconButton(generalStore.currentScreen === Screen.History)}
                >
                    <History class="h-4 w-4" />
                </div>
                <div
                    id="open-favorites-button"
                    on:dblclick={e => e.stopPropagation()}
                    on:click={() =>
                        generalStore.setCurrentScreen(
                            generalStore.currentScreen === Screen.Favorites
                                ? Screen.Code
                                : Screen.Favorites,
                        )
                    }
                    class="p-0.5 rounded flex items-center hover:brightness-110"
                    style={iconButton(generalStore.currentScreen === Screen.Favorites)}
                >
                    <Star class="h-4 w-4" />
                </div>
                <div
                    id="open-settings-button"
                    on:dblclick={e => e.stopPropagation()}
                    on:click={() =>
                        generalStore.setCurrentScreen(
                            generalStore.currentScreen === Screen.Settings
                                ? Screen.Code
                                : Screen.Settings,
                        )
                    }
                    class="p-0.5 rounded flex items-center hover:brightness-110"
                    style={iconButton(generalStore.currentScreen === Screen.Settings)}
                >
                    <Cog class="h-4 w-4" />
                </div>
            </div>
        </div>
    );
};

export default TitleBar;
