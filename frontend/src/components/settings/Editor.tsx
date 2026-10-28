import { Component, createSignal, Show } from 'solid-js';
import { useSettingsStore } from '../../stores/settings';
import { settings } from '../../../wailsjs/go/models';
import PrefSection from '../macos/PrefSection';
import PrefRow from '../macos/PrefRow';
import { PrefButton, PrefTextField, PrefToggle } from '../macos/PrefControl';
import FontGallery from './FontGallery';

const Editor: Component = () => {
    const [settingsStore] = useSettingsStore();
    const [settings, setSettings] = createSignal(settingsStore.app.editor);
    const [errors, setErrors] = createSignal({} as Record<string, string>);

    const save = () => {
        settingsStore.saveEditor(settings());
        setSettings(settingsStore.app.editor);
    };

    const hasErrors = () => Object.values(errors()).some(e => e);
    const isDirty = () => settingsStore.app.editor != settings();

    const setFontFamily = (fontFamily: string) => {
        if (!fontFamily.trim()) {
            setErrors({ ...errors(), fontFamily: 'Invalid value' });
            return;
        }
        setSettings({ ...settings(), fontFamily } as settings.Editor);
        setErrors({ ...errors(), fontFamily: '' });
    };

    return (
        <div>
            <PrefSection
                title="Font"
                footer="Monospace fonts are listed first. Only faces available on this Mac are shown."
            >
                <div class="p-3.5">
                    <Show when={errors().fontFamily}>
                        <div class="text-[11px] text-red-500 mb-2">{errors().fontFamily}</div>
                    </Show>
                    <FontGallery value={settings().fontFamily} onChange={setFontFamily} />
                </div>
            </PrefSection>

            <PrefSection title="Typography">
                <PrefRow label="Font Size" error={errors().fontSize}>
                    <PrefTextField
                        class="!max-w-[8rem] text-right"
                        value={settings().fontSize}
                        type="number"
                        on:input={e => {
                            const size = Number(e.currentTarget.value);
                            if (size < 10 || size > 28) {
                                setErrors({
                                    ...errors(),
                                    fontSize: 'Use a value between 10 and 28',
                                });
                                return;
                            }
                            setSettings({ ...settings(), fontSize: size } as settings.Editor);
                            setErrors({ ...errors(), fontSize: '' });
                        }}
                    />
                </PrefRow>
                <PrefRow label="Line Height" error={errors().lineHeight}>
                    <PrefTextField
                        class="!max-w-[8rem] text-right"
                        value={settings().lineHeight}
                        type="number"
                        step={0.1}
                        on:input={e => {
                            const size = Number(e.currentTarget.value);
                            if (size <= 0) {
                                setErrors({ ...errors(), lineHeight: 'Invalid value' });
                                return;
                            }
                            setSettings({ ...settings(), lineHeight: size } as settings.Editor);
                            setErrors({ ...errors(), lineHeight: '' });
                        }}
                    />
                </PrefRow>
                <PrefRow label="Tab Size" error={errors().tabSize}>
                    <PrefTextField
                        class="!max-w-[8rem] text-right"
                        value={settings().tabSize || 4}
                        type="number"
                        on:input={e => {
                            const size = Number(e.currentTarget.value);
                            if (size < 1 || size > 8) {
                                setErrors({ ...errors(), tabSize: 'Invalid value' });
                                return;
                            }
                            setSettings({ ...settings(), tabSize: size } as settings.Editor);
                            setErrors({ ...errors(), tabSize: '' });
                        }}
                    />
                </PrefRow>
            </PrefSection>

            <PrefSection title="Display">
                <PrefRow label="Word Wrap">
                    <PrefToggle
                        checked={settings().wordWrap}
                        on:input={e => {
                            setSettings({
                                ...settings(),
                                wordWrap: e.currentTarget.checked,
                            } as settings.Editor);
                        }}
                    />
                </PrefRow>
                <PrefRow label="Line Numbers">
                    <PrefToggle
                        checked={settings().lineNumbers}
                        on:input={e => {
                            setSettings({
                                ...settings(),
                                lineNumbers: e.currentTarget.checked,
                            } as settings.Editor);
                        }}
                    />
                </PrefRow>
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

export default Editor;
