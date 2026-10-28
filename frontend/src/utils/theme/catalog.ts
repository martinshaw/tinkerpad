import Nord from '../../assets/themes/Nord.json';
import Monokai from '../../assets/themes/Monokai.json';
import GithubDark from '../../assets/themes/GithubDark.json';
import Dracula from '../../assets/themes/Dracula.json';
import Eiffel from '../../assets/themes/Eiffel.json';
import Sunburst from '../../assets/themes/Sunburst.json';
import Dawn from '../../assets/themes/Dawn.json';
import Twilight from '../../assets/themes/Twilight.json';
import GithubLight from '../../assets/themes/GithubLight.json';
import SolarizedLight from '../../assets/themes/SolarizedLight.json';
import Tomorrow from '../../assets/themes/Tomorrow.json';
import Clouds from '../../assets/themes/Clouds.json';
import Xcode from '../../assets/themes/Xcode.json';
import Idle from '../../assets/themes/Idle.json';
import ChromeDevTools from '../../assets/themes/ChromeDevTools.json';
import HighContrastDark from '../../assets/themes/HighContrastDark.json';
import HighContrastLight from '../../assets/themes/HighContrastLight.json';
import { Theme } from '../editor/themes';

type ThemeJson = {
    base: string;
    rules: { token: string; foreground?: string; background?: string }[];
    colors: Record<string, string>;
};

const data: Record<Theme, ThemeJson> = {
    [Theme.Nord]: Nord as ThemeJson,
    [Theme.Monokai]: Monokai as ThemeJson,
    [Theme.GithubDark]: GithubDark as ThemeJson,
    [Theme.Dracula]: Dracula as ThemeJson,
    [Theme.Eiffel]: Eiffel as ThemeJson,
    [Theme.Sunburst]: Sunburst as ThemeJson,
    [Theme.Dawn]: Dawn as ThemeJson,
    [Theme.Twilight]: Twilight as ThemeJson,
    [Theme.GithubLight]: GithubLight as ThemeJson,
    [Theme.SolarizedLight]: SolarizedLight as ThemeJson,
    [Theme.Tomorrow]: Tomorrow as ThemeJson,
    [Theme.Clouds]: Clouds as ThemeJson,
    [Theme.Xcode]: Xcode as ThemeJson,
    [Theme.Idle]: Idle as ThemeJson,
    [Theme.ChromeDevTools]: ChromeDevTools as ThemeJson,
    [Theme.HighContrastDark]: HighContrastDark as ThemeJson,
    [Theme.HighContrastLight]: HighContrastLight as ThemeJson,
};

export type ThemeKind = 'light' | 'dark' | 'contrast';

export type ThemePreview = {
    id: Theme;
    label: string;
    kind: ThemeKind;
    background: string;
    foreground: string;
    selection: string;
    swatches: string[];
};

const hex = (value?: string, fallback = '#888888') => {
    if (!value) {
        return fallback;
    }
    return value.startsWith('#') ? value : `#${value}`;
};

const pickForeground = (theme: ThemeJson, tokens: string[], fallback: string) => {
    for (const token of tokens) {
        const rule = theme.rules.find(
            item => item.foreground && (item.token === token || item.token.includes(token)),
        );
        if (rule?.foreground) {
            return hex(rule.foreground, fallback);
        }
    }
    return fallback;
};

export const themeLabel = (theme: Theme): string => {
    switch (theme) {
        case Theme.GithubDark:
            return 'GitHub Dark';
        case Theme.GithubLight:
            return 'GitHub Light';
        case Theme.SolarizedLight:
            return 'Solarized Light';
        case Theme.ChromeDevTools:
            return 'Chrome DevTools';
        case Theme.Idle:
            return 'IDLE';
        case Theme.HighContrastDark:
            return 'Dark';
        case Theme.HighContrastLight:
            return 'Light';
        default:
            return theme;
    }
};

const themeKind = (base: string): ThemeKind => {
    if (base === 'hc-black' || base === 'hc-light') {
        return 'contrast';
    }
    return base === 'vs' ? 'light' : 'dark';
};

export const getThemePreview = (theme: Theme): ThemePreview => {
    const json = data[theme];
    const background = hex(json.colors['editor.background'], '#111');
    const foreground = hex(json.colors['editor.foreground'], '#eee');
    const selection = hex(json.colors['editor.selectionBackground'], foreground);

    return {
        id: theme,
        label: themeLabel(theme),
        kind: themeKind(json.base),
        background,
        foreground,
        selection,
        swatches: [
            pickForeground(json, ['keyword', 'storage', 'storage.type'], foreground),
            pickForeground(json, ['string', 'string | punctuation.definition.string'], foreground),
            pickForeground(json, ['variable', 'entity', 'support'], foreground),
            pickForeground(json, ['entity.name.function', 'support.function', 'entity.name.class'], foreground),
            pickForeground(json, ['comment'], foreground),
        ],
    };
};

export const allThemePreviews = (): ThemePreview[] =>
    Object.values(Theme).map(theme => getThemePreview(theme));

export const themesGrouped = (): {
    light: ThemePreview[];
    dark: ThemePreview[];
    contrast: ThemePreview[];
} => {
    const all = allThemePreviews().sort((a, b) => a.label.localeCompare(b.label));
    return {
        light: all.filter(theme => theme.kind === 'light'),
        dark: all.filter(theme => theme.kind === 'dark'),
        contrast: [Theme.HighContrastLight, Theme.HighContrastDark].map(getThemePreview),
    };
};

export const systemPreferredTheme = (): Theme => {
    const dark =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    return dark ? Theme.Nord : Theme.Dawn;
};
