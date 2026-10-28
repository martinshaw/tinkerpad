import { Component, Show } from 'solid-js';
import { Tab, useCodeStore } from '../../../stores/code';
import { useGeneralStore } from '../../../stores/general';
import FrameworkInfoLabel from './FrameworkInfoLabel';
import ResultStatsLabel from './ResultStatsLabel';
import RunCodeButton from './RunCodeButton';
import RunUntilLineButton from './RunUntilLineButton';
import RuntimeMenu from './RuntimeMenu';
import ResultTypeControl from './ResultTypeControl';
import WorkspaceMenu from './WorkspaceMenu';
import ViewMenu from './ViewMenu';

const StatusBar: Component<{ tab: Tab }> = props => {
    const [generalStore] = useGeneralStore();
    const [codeStore] = useCodeStore();

    return (
        <div
            class="flex justify-between items-stretch text-xs border-t cursor-default shrink-0"
            style={{
                color: generalStore.themeInfo.colors.primary,
                'border-color': generalStore.themeInfo.colors.secondary,
            }}
        >
            <div class="flex items-stretch min-w-0">
                <WorkspaceMenu tab={props.tab} />
                <RuntimeMenu tab={props.tab} />
                <FrameworkInfoLabel tab={props.tab} />
            </div>

            <div class="flex items-stretch shrink-0">
                <Show when={codeStore.showResult}>
                    <>
                        <ResultStatsLabel tab={props.tab} />
                        <ResultTypeControl />
                    </>
                </Show>
                <ViewMenu tab={props.tab} />
                <RunUntilLineButton tab={props.tab} />
                <RunCodeButton tab={props.tab} />
            </div>
        </div>
    );
};

export default StatusBar;
