import * as monaco from 'monaco-editor';

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

export enum Theme {
    Nord = 'Nord',
    Monokai = 'Monokai',
    GithubDark = 'GithubDark',
    Dracula = 'Dracula',
    Eiffel = 'Eiffel',
    Sunburst = 'Sunburst',
    Dawn = 'Dawn',
    Twilight = 'Twilight',
    GithubLight = 'GithubLight',
    SolarizedLight = 'SolarizedLight',
    Tomorrow = 'Tomorrow',
    Clouds = 'Clouds',
    Xcode = 'Xcode',
    Idle = 'Idle',
    ChromeDevTools = 'ChromeDevTools',
    HighContrastDark = 'HighContrastDark',
    HighContrastLight = 'HighContrastLight',
}

export const defineThemes = () => {
    monaco.editor.defineTheme(Theme.Nord, Nord as monaco.editor.IStandaloneThemeData);
    monaco.editor.defineTheme(Theme.Monokai, Monokai as monaco.editor.IStandaloneThemeData);
    monaco.editor.defineTheme(Theme.GithubDark, GithubDark as monaco.editor.IStandaloneThemeData);
    monaco.editor.defineTheme(Theme.Dracula, Dracula as monaco.editor.IStandaloneThemeData);
    monaco.editor.defineTheme(Theme.Eiffel, Eiffel as monaco.editor.IStandaloneThemeData);
    monaco.editor.defineTheme(Theme.Sunburst, Sunburst as monaco.editor.IStandaloneThemeData);
    monaco.editor.defineTheme(Theme.Dawn, Dawn as monaco.editor.IStandaloneThemeData);
    monaco.editor.defineTheme(Theme.Twilight, Twilight as monaco.editor.IStandaloneThemeData);
    monaco.editor.defineTheme(Theme.GithubLight, GithubLight as monaco.editor.IStandaloneThemeData);
    monaco.editor.defineTheme(
        Theme.SolarizedLight,
        SolarizedLight as monaco.editor.IStandaloneThemeData,
    );
    monaco.editor.defineTheme(Theme.Tomorrow, Tomorrow as monaco.editor.IStandaloneThemeData);
    monaco.editor.defineTheme(Theme.Clouds, Clouds as monaco.editor.IStandaloneThemeData);
    monaco.editor.defineTheme(Theme.Xcode, Xcode as monaco.editor.IStandaloneThemeData);
    monaco.editor.defineTheme(Theme.Idle, Idle as monaco.editor.IStandaloneThemeData);
    monaco.editor.defineTheme(
        Theme.ChromeDevTools,
        ChromeDevTools as monaco.editor.IStandaloneThemeData,
    );
    monaco.editor.defineTheme(
        Theme.HighContrastDark,
        HighContrastDark as monaco.editor.IStandaloneThemeData,
    );
    monaco.editor.defineTheme(
        Theme.HighContrastLight,
        HighContrastLight as monaco.editor.IStandaloneThemeData,
    );
};
