import { Component, createSignal, Show } from 'solid-js';
import { useSettingsStore } from '../../stores/settings';
import { settings } from '../../../wailsjs/go/models';
import FolderOpen from '../icons/FolderOpen';
import { SelectDir, SelectDockerBinary, SelectPhpBinary } from '../../../wailsjs/go/dialog/Dialog';
import {
    IsValidDockerBinaryPath,
    IsValidPhpBinaryPath,
} from '../../../wailsjs/go/settings/Settings';
import { Theme } from '../../utils/editor/themes';
import { useGeneralStore } from '../../stores/general';
import PrefSection from '../macos/PrefSection';
import PrefRow from '../macos/PrefRow';
import { PrefButton, PrefTextField } from '../macos/PrefControl';
import ThemeGallery from './ThemeGallery';

const General: Component = () => {
    const [generalStore] = useGeneralStore();
    const [settingsStore] = useSettingsStore();
    const [settings, setSettings] = createSignal(settingsStore.app);
    const [theme, setTheme] = createSignal(generalStore.themeInfo.name);
    const [errors, setErrors] = createSignal({} as Record<string, string>);

    const save = () => {
        settingsStore.saveApp(settings());
        setSettings(settingsStore.app);
        generalStore.setTheme(theme());
    };

    const hasErrors = () => Object.values(errors()).some(e => e);
    const isDirty = () => settingsStore.app != settings() || generalStore.themeInfo.name != theme();

    const folderBtn = (onClick: () => void) => (
        <button
            type="button"
            class="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:brightness-110 opacity-70"
            on:click={onClick}
        >
            <FolderOpen class="w-3.5 h-3.5" />
        </button>
    );

    return (
        <div>
            <PrefSection title="Environment">
                <PrefRow label="PHP Binary Path" error={errors().phpBinaryPath}>
                    <PrefTextField
                        value={settings().phpBinaryPath}
                        type="text"
                        trailing={folderBtn(async () => {
                            const dir = await SelectPhpBinary();
                            if (dir) {
                                setSettings({ ...settings(), phpBinaryPath: dir } as settings.App);
                                setErrors({ ...errors(), phpBinaryPath: '' });
                            } else {
                                setErrors({
                                    ...errors(),
                                    phpBinaryPath: 'Invalid PHP binary path',
                                });
                            }
                        })}
                        on:input={async e => {
                            const phpBinaryPath = e.currentTarget.value;
                            if (!phpBinaryPath) {
                                setErrors({
                                    ...errors(),
                                    phpBinaryPath: 'Invalid PHP binary path',
                                });
                                return;
                            }
                            const isValid = await IsValidPhpBinaryPath(phpBinaryPath);
                            if (!isValid) {
                                setErrors({
                                    ...errors(),
                                    phpBinaryPath: 'Invalid PHP binary path',
                                });
                                return;
                            }
                            setSettings({ ...settings(), phpBinaryPath } as settings.App);
                            setErrors({ ...errors(), phpBinaryPath: '' });
                        }}
                    />
                </PrefRow>
                <PrefRow label="Docker Binary Path" error={errors().dockerBinaryPath}>
                    <PrefTextField
                        value={settings().dockerBinaryPath}
                        type="text"
                        trailing={folderBtn(async () => {
                            const file = await SelectDockerBinary();
                            if (file) {
                                setSettings({
                                    ...settings(),
                                    dockerBinaryPath: file,
                                } as settings.App);
                                setErrors({ ...errors(), dockerBinaryPath: '' });
                            } else {
                                setErrors({
                                    ...errors(),
                                    dockerBinaryPath: 'Invalid Docker binary path',
                                });
                            }
                        })}
                        on:input={async e => {
                            const dockerBinaryPath = e.currentTarget.value;
                            if (!dockerBinaryPath) {
                                setErrors({
                                    ...errors(),
                                    dockerBinaryPath: 'Invalid Docker binary path',
                                });
                                return;
                            }
                            const isValid = await IsValidDockerBinaryPath(dockerBinaryPath);
                            if (!isValid) {
                                setErrors({
                                    ...errors(),
                                    dockerBinaryPath: 'Invalid Docker binary path',
                                });
                                return;
                            }
                            setSettings({ ...settings(), dockerBinaryPath } as settings.App);
                            setErrors({ ...errors(), dockerBinaryPath: '' });
                        }}
                    />
                </PrefRow>
                <PrefRow label="Auto Complete Port" error={errors().autoCompletePort}>
                    <PrefTextField
                        class="!max-w-[8rem] text-right"
                        value={settings().autoCompletePort}
                        type="number"
                        on:input={e => {
                            const port = Number(e.currentTarget.value);
                            if (port <= 0 || port > 65535) {
                                setErrors({ ...errors(), autoCompletePort: 'Invalid port' });
                                return;
                            }
                            setSettings({
                                ...settings(),
                                autoCompletePort: port,
                            } as settings.App);
                            setErrors({ ...errors(), autoCompletePort: '' });
                        }}
                    />
                </PrefRow>
            </PrefSection>

            <PrefSection title="Defaults">
                <PrefRow label="Default Project" error={errors().defaultWorkingDir}>
                    <PrefTextField
                        value={settings().defaultWorkingDir}
                        type="text"
                        trailing={folderBtn(async () => {
                            const dir = await SelectDir();
                            if (dir) {
                                setSettings({
                                    ...settings(),
                                    defaultWorkingDir: dir,
                                } as settings.App);
                            }
                        })}
                        on:input={e => {
                            const dir = e.currentTarget.value;
                            if (dir) {
                                setSettings({
                                    ...settings(),
                                    defaultWorkingDir: dir,
                                } as settings.App);
                                setErrors({ ...errors(), defaultWorkingDir: '' });
                            } else {
                                setErrors({
                                    ...errors(),
                                    defaultWorkingDir: 'Invalid directory',
                                });
                            }
                        }}
                    />
                </PrefRow>
            </PrefSection>

            <PrefSection title="Appearance" footer="Themes apply when you save.">
                <div class="p-3.5">
                    <ThemeGallery value={theme() as Theme} onChange={setTheme} />
                </div>
            </PrefSection>

            <div class="flex items-center gap-3 max-w-2xl px-1">
                <PrefButton
                    variant="primary"
                    on:click={save}
                    disabled={!isDirty() || hasErrors()}
                >
                    Save
                </PrefButton>
                <Show when={isDirty() && !hasErrors()}>
                    <span class="text-[12px] opacity-55">Unsaved changes</span>
                </Show>
            </div>
        </div>
    );
};

export default General;
