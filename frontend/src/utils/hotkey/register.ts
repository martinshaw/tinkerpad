import { onCleanup, onMount } from 'solid-js';
import { runMenuCommand, type MenuCommand } from '../menu/commands';
import { isApplePlatform } from './mod';

type OptionalConfig = Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'shiftKey' | 'metaKey'>;

interface HotkeyConfig extends Partial<OptionalConfig> {
    key: KeyboardEvent['key'];
    /** Cmd on macOS, Ctrl on Windows/Linux */
    modKey?: boolean;
    /** Option on macOS, Alt elsewhere */
    altMod?: boolean;
    targetElement?: HTMLElement;
}

type HotkeyAction = (e: KeyboardEvent) => void;

const registerHotkey = (action: HotkeyAction, config: HotkeyConfig) => {
    const targetElement = config.targetElement || document;

    const eventHandler = (e: KeyboardEvent) => {
        const { key, ctrlKey, altKey, shiftKey, metaKey } = e;
        if (config.key !== key) return;

        if (config.modKey) {
            const hasMod = isApplePlatform() ? metaKey : ctrlKey;
            if (!hasMod) return;
        } else {
            if (config.ctrlKey && !ctrlKey) return;
            if (config.metaKey && !metaKey) return;
        }

        if (config.altMod) {
            if (!altKey) return;
        } else if (config.altKey && !altKey) {
            return;
        }

        if (config.shiftKey === true && !shiftKey) return;
        if (config.shiftKey === false && shiftKey) return;

        e.preventDefault();
        action(e);
    };

    onMount(() =>
        targetElement.addEventListener('keydown', eventHandler as EventListener, true),
    );
    onCleanup(() =>
        targetElement.removeEventListener('keydown', eventHandler as EventListener, true),
    );
};

const command =
    (name: MenuCommand, extras?: Partial<HotkeyConfig>): [HotkeyAction, HotkeyConfig] => [
        () => void runMenuCommand(name),
        { shiftKey: false, ...extras },
    ];

const registerHotkeys = () => {
    const bindings: [HotkeyAction, HotkeyConfig][] = [
        command('run', { key: 'r', modKey: true }),
        command('run-until-line', { key: 'Enter', modKey: true, shiftKey: false }),
        command('new-tab', { key: 't', modKey: true }),
        command('close-tab', { key: 'w', modKey: true }),
        command('open-php-file', { key: 'o', modKey: true }),
        command('open-directory', { key: 'o', modKey: true, shiftKey: true }),
        command('save', { key: 's', modKey: true }),
        command('save-as', { key: 's', modKey: true, shiftKey: true }),
        command('save-as', { key: 'a', modKey: true, shiftKey: true }),
        command('toggle-layout', { key: 'l', modKey: true }),
        command('toggle-result', { key: 'u', modKey: true }),
        command('toggle-persistent', { key: 'p', modKey: true, shiftKey: true }),
        command('reset-session', { key: 'r', modKey: true, shiftKey: true }),
        command('toggle-query-log', { key: 'q', modKey: true, shiftKey: true }),
        command('toggle-dump-assignments', { key: 'i', modKey: true, shiftKey: true }),
        command('toggle-dump-logs', { key: 'o', modKey: true, shiftKey: true }),
        command('toggle-compare', { key: 'd', modKey: true, shiftKey: true }),
        command('screen-code', { key: '1', modKey: true }),
        command('screen-favorites', { key: '2', modKey: true }),
        command('screen-history', { key: '3', modKey: true }),
        command('screen-projects', { key: '4', modKey: true }),
        command('screen-ssh', { key: '5', modKey: true }),
        command('screen-docker', { key: '6', modKey: true }),
        command('screen-database', { key: '7', modKey: true }),
        command('screen-settings', { key: ',', modKey: true }),
        command('output-structured', { key: '1', modKey: true, altMod: true }),
        command('output-raw', { key: '2', modKey: true, altMod: true }),
        command('output-json', { key: '3', modKey: true, altMod: true }),
        command('output-table', { key: '4', modKey: true, altMod: true }),
        command('output-queries', { key: '5', modKey: true, altMod: true }),
        command('zoom-in', { key: '=', modKey: true }),
        command('zoom-in', { key: '+', modKey: true, shiftKey: true }),
        command('zoom-out', { key: '-', modKey: true }),
        command('zoom-reset', { key: '0', modKey: true }),
        command('toggle-file-tree', { key: 'b', modKey: true }),
    ];

    for (const [action, config] of bindings) {
        registerHotkey(action, config);
    }
};

export { registerHotkeys };
