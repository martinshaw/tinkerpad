import { createEffect } from 'solid-js';
import { store } from '../../wailsjs/go/models';
import { GetData, Save } from '../../wailsjs/go/store/Store';
import { createStore, SetStoreFunction } from 'solid-js/store';
import { Theme } from '../utils/editor/themes';
import getThemeInfo from '../utils/theme/get-theme-info';
import { systemPreferredTheme } from '../utils/theme/catalog';
import { IsLinux } from '../../wailsjs/go/settings/Settings';
import { WindowSetBackgroundColour } from '../../wailsjs/runtime/runtime';

export enum SettingsTab {
    General = 'General',
    Editor = 'Editor',
}

export enum Screen {
    Code,
    Settings,
    Favorites,
    History,
    Ssh,
    Docker,
    Projects,
    Database,
}

export interface WindowStats {
    width: number;
    height: number;
    x: number;
    y: number;
}

export interface ThemeInfo {
    name: Theme;
    colors: {
        background: string;
        primary: string;
        secondary: string;
        editor: {
            string: string;
            keyword: string;
            variable: string;
        };
    };
}

const normalizeHex = (raw: string) => {
    const value = raw?.startsWith('#') ? raw : raw ? `#${raw}` : '';
    return value;
};

const applyStartupChrome = (colors: ThemeInfo['colors']) => {
    const bg = normalizeHex(colors.background);
    const fg = normalizeHex(colors.primary);
    if (!bg) {
        return;
    }
    try {
        localStorage.setItem('tinkerpad-bg', bg);
        if (fg) {
            localStorage.setItem('tinkerpad-fg', fg);
        }
    } catch {
        // private mode / restricted storage
    }
    document.documentElement.style.background = bg;
    if (fg) {
        document.documentElement.style.color = fg;
    }
    if (document.body) {
        document.body.style.background = bg;
        if (fg) {
            document.body.style.color = fg;
        }
    }
    const hex = bg.replace('#', '');
    const full =
        hex.length === 3
            ? hex
                  .split('')
                  .map(ch => ch + ch)
                  .join('')
            : hex.slice(0, 6);
    if (full.length === 6) {
        const r = parseInt(full.slice(0, 2), 16);
        const g = parseInt(full.slice(2, 4), 16);
        const b = parseInt(full.slice(4, 6), 16);
        if (![r, g, b].some(n => Number.isNaN(n))) {
            WindowSetBackgroundColour(r, g, b, 255);
        }
    }
};

const rawData = await GetData(store.StoreName.General);
const savedGeneral = rawData ? JSON.parse(rawData) : null;
const savedThemeName = savedGeneral?.themeInfo?.name as Theme | undefined;
const initialTheme: Theme =
    savedThemeName && (Object.values(Theme) as string[]).includes(savedThemeName)
        ? savedThemeName
        : systemPreferredTheme();

const initialThemeInfo = await getThemeInfo(initialTheme);
applyStartupChrome(initialThemeInfo.colors);

const newGeneralStore: GeneralStore = {
    ...(savedGeneral ?? {}),
    themeInfo: initialThemeInfo,
    isLinux: await IsLinux(),
    currentScreen: Screen.Code,
    currentSettingsTab: SettingsTab.General,
    setCurrentSettingsTab(tab: SettingsTab) {
        setGeneralStore('currentSettingsTab', tab);
    },
    setCurrentScreen(screen: Screen) {
        setGeneralStore('currentScreen', screen);
    },
    setWindowStats(stats: WindowStats) {
        setGeneralStore('window', stats);
    },
    async setTheme(theme: Theme) {
        const themeInfo = await getThemeInfo(theme);
        setGeneralStore('themeInfo', themeInfo);
        applyStartupChrome(themeInfo.colors);
    },
    shouldShowTitleBar(): boolean {
        return (
            [Screen.Settings, Screen.Favorites, Screen.History, Screen.Projects, Screen.Database].includes(
                this.currentScreen,
            ) ||
            !this.isLinux
        );
    },
};

const [generalStore, setGeneralStore] = createStore(newGeneralStore);

createEffect(() => Save(store.StoreName.General, JSON.stringify({ ...generalStore })));

export interface GeneralStore {
    isLinux: boolean;
    currentScreen: Screen;
    currentSettingsTab: SettingsTab;
    window?: WindowStats;
    themeInfo: ThemeInfo;
    setCurrentSettingsTab: (tab: SettingsTab) => void;
    setCurrentScreen: (screen: Screen) => void;
    setWindowStats: (stats: WindowStats) => void;
    setTheme: (theme: Theme) => Promise<void>;
    shouldShowTitleBar: () => boolean;
}

export const useGeneralStore = (): [GeneralStore, SetStoreFunction<GeneralStore>] => [
    generalStore,
    setGeneralStore,
];
