import { Component, Match, Switch } from 'solid-js';
import General from './General';
import Editor from './Editor';
import { SettingsTab, useGeneralStore } from '../../stores/general';
import Cog from '../icons/Cog';
import PrefShell from '../macos/PrefShell';

const Settings: Component = () => {
    const [generalStore] = useGeneralStore();

    return (
        <PrefShell
            title="Settings"
            titleIcon={<Cog class="h-4 w-4" />}
            nav={[
                { id: SettingsTab.General, label: SettingsTab.General },
                { id: SettingsTab.Editor, label: SettingsTab.Editor },
            ]}
            activeId={generalStore.currentSettingsTab}
            onNavigate={id => generalStore.setCurrentSettingsTab(id as SettingsTab)}
        >
            <Switch>
                <Match when={generalStore.currentSettingsTab === SettingsTab.General}>
                    <General />
                </Match>
                <Match when={generalStore.currentSettingsTab === SettingsTab.Editor}>
                    <Editor />
                </Match>
            </Switch>
        </PrefShell>
    );
};

export default Settings;
