import { Component, createEffect, createResource, Show } from 'solid-js';
import { Tab, useCodeStore } from '../../../stores/code';
import { useGeneralStore } from '../../../stores/general';
import LoaderCircle from '../../icons/LoaderCircle';

export type FrameworkInfo = {
    framework_name: string;
    framework_version: string | undefined;
    php_version: string;
};

const FrameworkInfoLabel: Component<{ tab: Tab }> = props => {
    const [generalStore] = useGeneralStore();
    const [codeStore] = useCodeStore();
    const [frameworkInfo, { refetch }] = createResource(props.tab, async tab => {
        return await codeStore.getTabFrameworkInfo(tab.id);
    });

    createEffect(() => refetch([props.tab.workingDir, props.tab.containerInfo, props.tab.sshConn]));

    return (
        <div
            class="h-full px-3 flex items-center max-w-[16rem] truncate whitespace-nowrap select-none opacity-80"
            style={{ 'background-color': generalStore.themeInfo.colors.background }}
            title={
                frameworkInfo()
                    ? `${frameworkInfo()!.framework_name} ${frameworkInfo()!.framework_version ?? ''} · PHP ${frameworkInfo()!.php_version}`
                    : undefined
            }
        >
            <Show
                when={!frameworkInfo.loading}
                fallback={<LoaderCircle class="w-4 inline -mt-0.5 animate-spin" />}
            >
                <Show when={frameworkInfo()} keyed>
                    {info => (
                        <>
                            {info.framework_name}
                            {info.framework_version ? ` ${info.framework_version}` : ''}
                            <span class="opacity-50 mx-1.5">·</span>
                            PHP {info.php_version}
                        </>
                    )}
                </Show>
            </Show>
        </div>
    );
};

export default FrameworkInfoLabel;
