import { Component, Show } from 'solid-js';
import { OutputType, Tab, useCodeStore } from '../../../stores/code';
import StatusPopover, { menuItemClass, menuSectionClass } from './StatusPopover';
import MoreHorizontal from '../../icons/MoreHorizontal';
import Square from '../../icons/Square';
import SquareCode from '../../icons/SquareCode';
import SquareSplitHorizontal from '../../icons/SquareSplitHorizontal';
import SquareSplitVertical from '../../icons/SquareSplitVertical';
import GitCompare from '../../icons/GitCompare';
import { shortcutLabel } from '../../../utils/hotkey/mod';

const onOff = (on: boolean) => (
    <span
        class="text-[10px] uppercase tracking-wide shrink-0 w-7 text-right"
        classList={{ 'opacity-90 font-semibold': on, 'opacity-45': !on }}
    >
        {on ? 'On' : 'Off'}
    </span>
);

const hint = (...parts: string[]) => (
    <span class="opacity-45 text-[10px] tracking-wide shrink-0 tabular-nums">
        {shortcutLabel(...parts)}
    </span>
);

const ViewMenu: Component<{ tab: Tab }> = props => {
    const [codeStore] = useCodeStore();
    const outputOn = () => !!codeStore.showResult;
    const dumpOn = () => !!props.tab.dumpAssignments;
    const dumpLogsOn = () => props.tab.dumpLogs !== false;
    const alignOn = () => !!props.tab.alignAssignmentOutput;

    return (
        <StatusPopover title="View" label={<MoreHorizontal class="w-4" />} align="right" wide>
            <div class={menuSectionClass}>Panel</div>
            <button
                type="button"
                data-keep-open
                class={menuItemClass}
                on:click={() => codeStore.toggleResult()}
            >
                <Show when={outputOn()} fallback={<Square class="w-3.5 opacity-70" />}>
                    <SquareCode class="w-3.5 opacity-70" />
                </Show>
                <span class="grow text-left">Show output</span>
                {onOff(outputOn())}
                {hint('mod', 'U')}
            </button>
            <Show when={outputOn()}>
                <button
                    type="button"
                    data-keep-open
                    class={menuItemClass}
                    on:click={() => codeStore.toggleLayout()}
                >
                    <Show
                        when={codeStore.isHorizontalLayout}
                        fallback={<SquareSplitVertical class="w-3.5 opacity-70" />}
                    >
                        <SquareSplitHorizontal class="w-3.5 opacity-70" />
                    </Show>
                    <span class="grow text-left">
                        {codeStore.isHorizontalLayout ? 'Horizontal layout' : 'Vertical layout'}
                    </span>
                    {hint('mod', 'L')}
                </button>
            </Show>

            <div class={menuSectionClass}>Output</div>
            <button
                type="button"
                data-keep-open
                class={menuItemClass}
                on:click={() => codeStore.setDumpLogs(props.tab.id, !dumpLogsOn())}
            >
                <span class="grow text-left">Dump logs</span>
                {onOff(dumpLogsOn())}
                {hint('mod', 'shift', 'O')}
            </button>
            <button
                type="button"
                data-keep-open
                class={menuItemClass}
                on:click={() => codeStore.setDumpAssignments(props.tab.id, !dumpOn())}
            >
                <span class="grow text-left">Dump assignments</span>
                {onOff(dumpOn())}
                {hint('mod', 'shift', 'I')}
            </button>
            <Show when={dumpOn()}>
                <button
                    type="button"
                    data-keep-open
                    class={`${menuItemClass} pl-7`}
                    title="Positions Tree dumps and logs next to their source lines"
                    on:click={() => {
                        const next = !alignOn();
                        codeStore.setAlignAssignmentOutput(props.tab.id, next);
                        if (next) {
                            codeStore.setOutputType(OutputType.Structured);
                            if (!codeStore.showResult) {
                                codeStore.toggleResult();
                            }
                        }
                    }}
                >
                    <span class="grow text-left">Align with editor</span>
                    {onOff(alignOn())}
                </button>
            </Show>
            <button
                type="button"
                data-keep-open
                class={menuItemClass}
                on:click={() => codeStore.setQueryLog(props.tab.id, !props.tab.queryLog)}
            >
                <span class="grow text-left">Query log</span>
                {onOff(!!props.tab.queryLog)}
                {hint('mod', 'shift', 'Q')}
            </button>
            <button
                type="button"
                data-keep-open
                class={menuItemClass}
                on:click={() => codeStore.toggleCompare()}
            >
                <GitCompare class="w-3.5 opacity-70" />
                <span class="grow text-left">Compare runs</span>
                {onOff(!!codeStore.compareResults)}
                {hint('mod', 'shift', 'D')}
            </button>
        </StatusPopover>
    );
};

export default ViewMenu;
