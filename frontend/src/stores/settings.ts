import { createStore, SetStoreFunction } from 'solid-js/store';
import { GetData, Save } from '../../wailsjs/go/settings/Settings';
import { settings } from '../../wailsjs/go/models';
import { createEffect } from 'solid-js';

const app = await GetData();

export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 28;
export const FONT_SIZE_DEFAULT = 14;

const clampFontSize = (size: number) =>
    Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(size)));

const newSettingsStore: SettingsStore = {
    app,
    saveApp: app => setStore('app', app),
    saveEditor: editor => setStore('app', { ...store.app, editor }),
    adjustFontSize(delta: number) {
        const next = clampFontSize((store.app.editor.fontSize || FONT_SIZE_DEFAULT) + delta);
        if (next === store.app.editor.fontSize) {
            return;
        }
        setStore('app', 'editor', 'fontSize', next);
    },
    resetFontSize() {
        if (store.app.editor.fontSize === FONT_SIZE_DEFAULT) {
            return;
        }
        setStore('app', 'editor', 'fontSize', FONT_SIZE_DEFAULT);
    },
};

const [store, setStore] = createStore(newSettingsStore);

createEffect(() => Save(store.app));

export interface SettingsStore {
    app: settings.App;
    saveApp: (app: settings.App) => void;
    saveEditor: (editor: settings.Editor) => void;
    adjustFontSize: (delta: number) => void;
    resetFontSize: () => void;
}

export const useSettingsStore = (): [SettingsStore, SetStoreFunction<SettingsStore>] => [
    store,
    setStore,
];
