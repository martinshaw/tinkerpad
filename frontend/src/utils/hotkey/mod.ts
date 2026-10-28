/** True for macOS / iOS webviews where the primary accelerator is ⌘. */
export const isApplePlatform = () =>
    /Mac|iPhone|iPod|iPad/i.test(navigator.platform) || /Mac OS X/i.test(navigator.userAgent);

/** ⌘ on Apple platforms, Ctrl elsewhere — matches Wails CmdOrCtrl. */
export const modSymbol = () => (isApplePlatform() ? '⌘' : 'Ctrl');

export const shortcutLabel = (...parts: string[]) =>
    parts
        .map(part => {
            if (part === 'mod') {
                return modSymbol();
            }
            if (part === 'shift') {
                return isApplePlatform() ? '⇧' : 'Shift';
            }
            if (part === 'alt') {
                return isApplePlatform() ? '⌥' : 'Alt';
            }
            return part.toUpperCase();
        })
        .join(isApplePlatform() ? '' : '+');
