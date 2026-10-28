import { createSignal, Match, onCleanup, onMount, Show, Switch, type Component } from 'solid-js';
import { initServices } from 'monaco-languageclient/vscode/services';
import Code from './components/code/Code';
import TitleBar from './components/TitleBar';
import Settings from './components/settings/Settings';
import AboutDialog from './components/AboutDialog';
import { boot } from './utils/window-size/boot';
import { registerHotkeys } from './utils/hotkey/register';
import { bindMenuCommands, onAboutMenu } from './utils/menu/commands';
import { Screen, SettingsTab, useGeneralStore } from './stores/general';
import Favorites from './components/favorites/Favorites';
import History from './components/history/History';
import SshConfig from './components/ssh/Config';
import DockerConfig from './components/docker/Config';
import { CheckUpdate } from '../wailsjs/go/updater/Updater';
import Projects from './components/projects/Projects';
import Database from './components/database/Database';
import { loadProjects } from './stores/projects';

await initServices({
    serviceConfig: {
        debugLogging: true,
    },
});

const App: Component = () => {
    const [generalStore] = useGeneralStore();
    const [showAbout, setShowAbout] = createSignal(false);
    let removeWindowResizeListener: () => void;
    let unbindMenu: (() => void) | undefined;
    let unbindAbout: (() => void) | undefined;

    onMount(() => {
        removeWindowResizeListener = boot();
        unbindMenu = bindMenuCommands();
        unbindAbout = onAboutMenu(() => setShowAbout(true));
        if (!(Object.values(SettingsTab) as string[]).includes(generalStore.currentSettingsTab)) {
            generalStore.setCurrentSettingsTab(SettingsTab.General);
        }
        CheckUpdate();
        loadProjects();
    });
    onCleanup(() => {
        removeWindowResizeListener();
        unbindMenu?.();
        unbindAbout?.();
    });

    registerHotkeys();

    return (
        <div
            class="flex flex-col h-screen max-h-screen overflow-y-hidden snap-none"
            style={{ 'background-color': generalStore.themeInfo.colors.background }}
        >
            <Show when={generalStore.shouldShowTitleBar()}>
                <TitleBar />
            </Show>
            <Switch>
                <Match when={generalStore.currentScreen === Screen.Code}>
                    <Code />
                </Match>
                <Match when={generalStore.currentScreen === Screen.Settings}>
                    <Settings />
                </Match>
                <Match when={generalStore.currentScreen === Screen.Favorites}>
                    <Favorites />
                </Match>
                <Match when={generalStore.currentScreen === Screen.History}>
                    <History />
                </Match>
                <Match when={generalStore.currentScreen === Screen.Ssh}>
                    <SshConfig />
                </Match>
                <Match when={generalStore.currentScreen === Screen.Docker}>
                    <DockerConfig />
                </Match>
                <Match when={generalStore.currentScreen === Screen.Projects}>
                    <Projects />
                </Match>
                <Match when={generalStore.currentScreen === Screen.Database}>
                    <Database />
                </Match>
            </Switch>
            <Show when={showAbout()}>
                <AboutDialog onClose={() => setShowAbout(false)} />
            </Show>
        </div>
    );
};

export default App;
