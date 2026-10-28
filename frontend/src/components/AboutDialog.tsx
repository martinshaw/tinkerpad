import { Component, createResource, createSignal, Show } from 'solid-js';
import { GetAppVersion } from '../../wailsjs/go/settings/Settings';
import { CheckUpdate, ReleasesURL } from '../../wailsjs/go/updater/Updater';
import { BrowserOpenURL } from '../../wailsjs/runtime/runtime';
import { useGeneralStore } from '../stores/general';
import logo from '../assets/logo.png';

const REPO_URL = 'https://github.com/martinshaw/tinkerpad';

const AboutDialog: Component<{ onClose: () => void }> = props => {
    const [generalStore] = useGeneralStore();
    const [appVersion] = createResource(async () => await GetAppVersion());
    const [releasesUrl] = createResource(async () => await ReleasesURL());
    const [checking, setChecking] = createSignal(false);

    const openReleases = () => {
        BrowserOpenURL(releasesUrl() || `${REPO_URL}/releases`);
    };

    const openRepo = () => {
        BrowserOpenURL(REPO_URL);
    };

    const checkUpdates = async () => {
        setChecking(true);
        try {
            await CheckUpdate();
        } finally {
            setChecking(false);
        }
    };

    const buttonClass =
        'px-3 py-1.5 text-xs rounded border hover:brightness-110 disabled:opacity-50';

    return (
        <div
            class="fixed inset-0 z-[110] flex items-center justify-center p-6"
            style={{ 'background-color': 'color-mix(in srgb, black 45%, transparent)' }}
            on:click={props.onClose}
            on:keydown={(e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    props.onClose();
                }
            }}
        >
            <div
                class="w-full max-w-sm rounded-lg border shadow-xl flex flex-col items-center px-6 pt-6 pb-5 gap-3"
                style={{
                    'background-color': generalStore.themeInfo.colors.background,
                    'border-color': generalStore.themeInfo.colors.secondary,
                    color: generalStore.themeInfo.colors.primary,
                }}
                on:click={e => e.stopPropagation()}
                role="dialog"
                aria-label="About Tinkerpad"
            >
                <img class="w-20 h-20 object-contain" src={logo} alt="" />
                <div class="text-center">
                    <h2 class="text-base font-semibold m-0">Tinkerpad</h2>
                    <p class="text-xs opacity-70 mt-1 mb-0">
                        Version {appVersion() || '…'}
                    </p>
                </div>
                <p class="text-[11px] opacity-70 text-center m-0 leading-snug">
                    A desktop PHP playground for local, SSH, and Docker workspaces.
                </p>
                <p class="text-[11px] opacity-60 text-center m-0">
                    Martin Shaw &lt;hello@martinshaw.co&gt;
                </p>

                <div class="flex flex-col w-full gap-2 mt-1">
                    <button
                        type="button"
                        class={buttonClass}
                        style={{ 'border-color': generalStore.themeInfo.colors.secondary }}
                        disabled={checking()}
                        on:click={() => void checkUpdates()}
                    >
                        <Show when={!checking()} fallback="Checking…">
                            Check for updates
                        </Show>
                    </button>
                    <button
                        type="button"
                        class={buttonClass}
                        style={{ 'border-color': generalStore.themeInfo.colors.secondary }}
                        on:click={openReleases}
                    >
                        GitHub Releases
                    </button>
                    <button
                        type="button"
                        class={buttonClass}
                        style={{ 'border-color': generalStore.themeInfo.colors.secondary }}
                        on:click={openRepo}
                    >
                        View on GitHub
                    </button>
                </div>

                <button
                    type="button"
                    class="mt-1 px-4 py-1.5 text-xs font-semibold rounded border hover:brightness-110"
                    style={{
                        'border-color': generalStore.themeInfo.colors.secondary,
                        'background-color': generalStore.themeInfo.colors.secondary,
                    }}
                    on:click={props.onClose}
                >
                    OK
                </button>
            </div>
        </div>
    );
};

export default AboutDialog;
