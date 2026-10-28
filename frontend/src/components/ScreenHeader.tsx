import { Component, JSX } from 'solid-js';
import { Screen, useGeneralStore } from '../stores/general';
import XMark from './icons/XMark';

const ScreenHeader: Component<{
    title: JSX.Element;
    trailing?: JSX.Element;
}> = props => {
    const [generalStore] = useGeneralStore();

    return (
        <div
            class="flex items-center gap-2 mb-4 min-h-9 -mx-1 px-1 pb-3 border-b"
            style={{
                'border-color': generalStore.themeInfo.colors.secondary,
                'font-family':
                    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
            }}
        >
            <button
                type="button"
                class="p-1 rounded-md hover:brightness-110 shrink-0 opacity-70"
                title="Back to editor"
                on:click={() => generalStore.setCurrentScreen(Screen.Code)}
            >
                <XMark class="w-4 h-4" />
            </button>
            <h1 class="text-[13px] font-semibold flex items-center gap-1.5 m-0 grow min-w-0 tracking-tight">
                {props.title}
            </h1>
            {props.trailing}
        </div>
    );
};

export default ScreenHeader;
