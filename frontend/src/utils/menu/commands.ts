import { BrowserOpenURL, EventsOn } from '../../../wailsjs/runtime/runtime';
import { SelectDir } from '../../../wailsjs/go/dialog/Dialog';
import { StopSession } from '../../../wailsjs/go/php/Php';
import { CheckUpdate, ReleasesURL } from '../../../wailsjs/go/updater/Updater';
import { OutputType, useCodeStore } from '../../stores/code';
import { Screen, useGeneralStore } from '../../stores/general';
import { useSettingsStore } from '../../stores/settings';
import { executeUntilSelectedLine } from '../editor/actions';

const [codeStore] = useCodeStore();
const [generalStore] = useGeneralStore();
const [settingsStore] = useSettingsStore();

const REPO_URL = 'https://github.com/martinshaw/tinkerpad';

type AboutListener = () => void;
let aboutListener: AboutListener | undefined;

export const onAboutMenu = (listener: AboutListener) => {
    aboutListener = listener;
    return () => {
        if (aboutListener === listener) {
            aboutListener = undefined;
        }
    };
};

export type MenuCommand =
    | 'new-tab'
    | 'close-tab'
    | 'open-php-file'
    | 'open-directory'
    | 'save'
    | 'save-as'
    | 'run'
    | 'run-until-line'
    | 'toggle-layout'
    | 'toggle-result'
    | 'toggle-persistent'
    | 'reset-session'
    | 'toggle-query-log'
    | 'toggle-dump-assignments'
    | 'toggle-dump-logs'
    | 'toggle-compare'
    | 'output-structured'
    | 'output-raw'
    | 'output-json'
    | 'output-table'
    | 'output-queries'
    | 'screen-code'
    | 'screen-favorites'
    | 'screen-history'
    | 'screen-projects'
    | 'screen-ssh'
    | 'screen-docker'
    | 'screen-database'
    | 'screen-settings'
    | 'use-local-php'
    | 'zoom-in'
    | 'zoom-out'
    | 'zoom-reset'
    | 'toggle-file-tree'
    | 'about'
    | 'check-updates'
    | 'open-releases'
    | 'open-repo';

const toggleScreen = (screen: Screen) => {
    generalStore.setCurrentScreen(
        generalStore.currentScreen === screen ? Screen.Code : screen,
    );
};

export const runMenuCommand = async (command: MenuCommand | string) => {
    const tab = codeStore.currentTab;
    switch (command) {
        case 'new-tab':
            codeStore.createNewTab(true);
            return;
        case 'close-tab':
            await codeStore.closeTab(codeStore.currentTabId);
            return;
        case 'open-php-file':
            generalStore.setCurrentScreen(Screen.Code);
            await codeStore.openPhpFile(undefined);
            return;
        case 'open-directory': {
            const dir = await SelectDir();
            if (!dir || !tab) {
                return;
            }
            generalStore.setCurrentScreen(Screen.Code);
            await codeStore.switchToLocal(tab.id, dir, Boolean(tab.filePath));
            return;
        }
        case 'save':
            await codeStore.saveCurrentTab();
            return;
        case 'save-as':
            await codeStore.saveCurrentTabAs();
            return;
        case 'run':
            if (!tab || tab.loading) {
                return;
            }
            generalStore.setCurrentScreen(Screen.Code);
            void codeStore.runCode(tab);
            return;
        case 'run-until-line':
            if (!tab || tab.loading) {
                return;
            }
            generalStore.setCurrentScreen(Screen.Code);
            executeUntilSelectedLine();
            return;
        case 'toggle-layout':
            codeStore.toggleLayout();
            return;
        case 'toggle-result':
            codeStore.toggleResult();
            return;
        case 'toggle-persistent':
            if (!tab) {
                return;
            }
            codeStore.setPersistent(tab.id, tab.persistent === false);
            return;
        case 'reset-session':
            if (!tab) {
                return;
            }
            await StopSession(tab.id);
            return;
        case 'toggle-query-log':
            if (!tab) {
                return;
            }
            codeStore.setQueryLog(tab.id, !tab.queryLog);
            return;
        case 'toggle-dump-assignments':
            if (!tab) {
                return;
            }
            codeStore.setDumpAssignments(tab.id, !tab.dumpAssignments);
            return;
        case 'toggle-dump-logs':
            if (!tab) {
                return;
            }
            codeStore.setDumpLogs(tab.id, tab.dumpLogs === false);
            return;
        case 'toggle-compare':
            codeStore.toggleCompare();
            return;
        case 'output-structured':
            codeStore.setOutputType(OutputType.Structured);
            if (!codeStore.showResult) {
                codeStore.toggleResult();
            }
            return;
        case 'output-raw':
            codeStore.setOutputType(OutputType.Raw);
            if (!codeStore.showResult) {
                codeStore.toggleResult();
            }
            return;
        case 'output-json':
            codeStore.setOutputType(OutputType.Json);
            if (!codeStore.showResult) {
                codeStore.toggleResult();
            }
            return;
        case 'output-table':
            codeStore.setOutputType(OutputType.Table);
            if (!codeStore.showResult) {
                codeStore.toggleResult();
            }
            return;
        case 'output-queries':
            codeStore.setOutputType(OutputType.Queries);
            if (!codeStore.showResult) {
                codeStore.toggleResult();
            }
            return;
        case 'screen-code':
            generalStore.setCurrentScreen(Screen.Code);
            return;
        case 'screen-favorites':
            toggleScreen(Screen.Favorites);
            return;
        case 'screen-history':
            toggleScreen(Screen.History);
            return;
        case 'screen-projects':
            toggleScreen(Screen.Projects);
            return;
        case 'screen-ssh':
            toggleScreen(Screen.Ssh);
            return;
        case 'screen-docker':
            toggleScreen(Screen.Docker);
            return;
        case 'screen-database':
            toggleScreen(Screen.Database);
            return;
        case 'screen-settings':
            toggleScreen(Screen.Settings);
            return;
        case 'use-local-php':
            if (!tab) {
                return;
            }
            generalStore.setCurrentScreen(Screen.Code);
            await codeStore.switchToLocal(tab.id, undefined, Boolean(tab.filePath));
            return;
        case 'zoom-in':
            settingsStore.adjustFontSize(1);
            return;
        case 'zoom-out':
            settingsStore.adjustFontSize(-1);
            return;
        case 'zoom-reset':
            settingsStore.resetFontSize();
            return;
        case 'toggle-file-tree':
            codeStore.toggleFileTree();
            return;
        case 'about':
            aboutListener?.();
            return;
        case 'check-updates':
            void CheckUpdate();
            return;
        case 'open-releases':
            BrowserOpenURL((await ReleasesURL()) || `${REPO_URL}/releases`);
            return;
        case 'open-repo':
            BrowserOpenURL(REPO_URL);
            return;
    }
};

export const bindMenuCommands = () => {
    return EventsOn('menu:command', (command: string) => {
        void runMenuCommand(command);
    });
};
