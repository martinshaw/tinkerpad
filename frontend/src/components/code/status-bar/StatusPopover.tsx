import { Component, createEffect, createSignal, JSX, onCleanup, Show } from 'solid-js';
import { useGeneralStore } from '../../../stores/general';

const StatusPopover: Component<{
    label: JSX.Element;
    title?: string;
    align?: 'left' | 'right';
    wide?: boolean;
    children: JSX.Element;
}> = props => {
    const [generalStore] = useGeneralStore();
    const [open, setOpen] = createSignal(false);
    let root!: HTMLDivElement;

    createEffect(() => {
        if (!open()) {
            return;
        }

        const onPointer = (event: MouseEvent) => {
            if (!root.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', onPointer);
        document.addEventListener('keydown', onKey);
        onCleanup(() => {
            document.removeEventListener('mousedown', onPointer);
            document.removeEventListener('keydown', onKey);
        });
    });

    return (
        <div class="relative h-full flex items-stretch" ref={root}>
            <button
                type="button"
                title={props.title}
                class="h-full px-3 flex items-center gap-1.5 whitespace-nowrap hover:brightness-110 select-none"
                style={{ 'background-color': generalStore.themeInfo.colors.background }}
                on:click={() => setOpen(value => !value)}
            >
                {props.label}
            </button>
            <Show when={open()}>
                <div
                    class="absolute bottom-full mb-1 z-50 w-max rounded-md border shadow-lg py-1 text-xs max-h-[70vh] overflow-y-auto soft-scrollbar"
                    classList={{
                        'left-0': props.align !== 'right',
                        'right-0': props.align === 'right',
                        'max-w-[18rem]': !props.wide,
                        'max-w-[22rem]': !!props.wide,
                    }}
                    style={{
                        'background-color': generalStore.themeInfo.colors.background,
                        'border-color': generalStore.themeInfo.colors.secondary,
                        color: generalStore.themeInfo.colors.primary,
                    }}
                    on:click={(event: MouseEvent) => {
                        const target = event.target as HTMLElement | null;
                        if (target?.closest('[data-keep-open]')) {
                            return;
                        }
                        setOpen(false);
                    }}
                >
                    {props.children}
                </div>
            </Show>
        </div>
    );
};

export const menuItemClass =
    'w-full text-left px-3 py-2 flex items-center gap-2 hover:brightness-125 cursor-pointer select-none';

export const menuSectionClass = 'px-3 pt-2.5 pb-1 text-[10px] uppercase tracking-wide opacity-60';

export default StatusPopover;
