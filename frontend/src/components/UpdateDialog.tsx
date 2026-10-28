import { Component, Show } from 'solid-js';
import { useGeneralStore } from '../stores/general';
import { useUpdateStore } from '../stores/update';
import { DownloadUpdate, OpenReleasePage } from '../../wailsjs/go/updater/Updater';
import { Quit } from '../../wailsjs/runtime/runtime';
import { Info } from '../../wailsjs/go/dialog/Dialog';
import { createSignal } from 'solid-js';
import LoaderCircle from './icons/LoaderCircle';

const UpdateDialog: Component<{ onClose: () => void }> = props => {
    const [generalStore] = useGeneralStore();
    const [updateStore] = useUpdateStore();
    const [downloading, setDownloading] = createSignal(false);
    const info = () => updateStore.info;

    const download = async () => {
        const url = info()?.url;
        if (!url) {
            await OpenReleasePage(info()?.releaseUrl || '');
            return;
        }
        setDownloading(true);
        try {
            await DownloadUpdate(url);
            Quit();
        } catch (error) {
            await Info(error instanceof Error ? error.message : 'Error downloading update.');
            setDownloading(false);
        }
    };

    return (
        <div
            class="fixed inset-0 z-[100] flex items-center justify-center p-6"
            style={{ 'background-color': 'color-mix(in srgb, black 45%, transparent)' }}
            on:click={props.onClose}
        >
            <div
                class="w-full max-w-lg rounded-lg border shadow-xl flex flex-col max-h-[80vh]"
                style={{
                    'background-color': generalStore.themeInfo.colors.background,
                    'border-color': generalStore.themeInfo.colors.secondary,
                    color: generalStore.themeInfo.colors.primary,
                }}
                on:click={e => e.stopPropagation()}
            >
                <div class="px-5 pt-5 pb-3 border-b" style={{ 'border-color': generalStore.themeInfo.colors.secondary }}>
                    <h2 class="text-base font-semibold m-0">Update available</h2>
                    <p class="text-xs opacity-70 mt-1 mb-0">
                        {info()?.version} is on GitHub Releases
                        <Show when={info()?.assetName}>
                            {' '}
                            · {info()!.assetName}
                        </Show>
                    </p>
                </div>

                <pre
                    class="px-5 py-3 text-xs whitespace-pre-wrap overflow-y-auto soft-scrollbar grow m-0 opacity-90"
                    style={{ 'background-color': 'transparent' }}
                >
                    {info()?.body || 'A newer version of Tinkerpad is available.'}
                </pre>

                <div
                    class="px-5 py-3 flex flex-wrap gap-2 justify-end border-t"
                    style={{ 'border-color': generalStore.themeInfo.colors.secondary }}
                >
                    <button
                        type="button"
                        class="px-3 py-1.5 text-xs rounded border hover:brightness-110"
                        style={{ 'border-color': generalStore.themeInfo.colors.secondary }}
                        on:click={props.onClose}
                    >
                        Later
                    </button>
                    <button
                        type="button"
                        class="px-3 py-1.5 text-xs rounded border hover:brightness-110"
                        style={{ 'border-color': generalStore.themeInfo.colors.secondary }}
                        on:click={() => OpenReleasePage(info()?.releaseUrl || '')}
                    >
                        View on GitHub
                    </button>
                    <button
                        type="button"
                        class="px-3 py-1.5 text-xs rounded font-semibold flex items-center gap-1.5 hover:brightness-110"
                        style={{
                            'background-color': generalStore.themeInfo.colors.primary,
                            color: generalStore.themeInfo.colors.background,
                        }}
                        disabled={downloading()}
                        on:click={download}
                    >
                        <Show when={downloading()}>
                            <LoaderCircle class="w-3 h-3 animate-spin" />
                        </Show>
                        {info()?.url ? 'Download & install' : 'Open releases'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateDialog;
