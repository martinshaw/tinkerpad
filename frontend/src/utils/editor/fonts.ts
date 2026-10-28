export type FontKind = 'monospace' | 'sans-serif' | 'serif';

export type FontOption = {
    id: string;
    label: string;
    kind: FontKind;
    /** CSS font-family value stored in settings */
    family: string;
    /** First named face used for availability checks / preview */
    sample: string;
};

export const FONT_OPTIONS: FontOption[] = [
    // Monospace first — coding default
    {
        id: 'menlo',
        label: 'Menlo',
        kind: 'monospace',
        family: 'Menlo, monospace',
        sample: 'Menlo',
    },
    {
        id: 'sf-mono',
        label: 'SF Mono',
        kind: 'monospace',
        family: 'SF Mono, ui-monospace, Menlo, monospace',
        sample: 'SF Mono',
    },
    {
        id: 'monaco',
        label: 'Monaco',
        kind: 'monospace',
        family: 'Monaco, monospace',
        sample: 'Monaco',
    },
    {
        id: 'jetbrains-mono',
        label: 'JetBrains Mono',
        kind: 'monospace',
        family: 'JetBrains Mono, Menlo, monospace',
        sample: 'JetBrains Mono',
    },
    {
        id: 'fira-code',
        label: 'Fira Code',
        kind: 'monospace',
        family: 'Fira Code, Menlo, monospace',
        sample: 'Fira Code',
    },
    {
        id: 'cascadia',
        label: 'Cascadia Code',
        kind: 'monospace',
        family: 'Cascadia Code, Consolas, monospace',
        sample: 'Cascadia Code',
    },
    {
        id: 'consolas',
        label: 'Consolas',
        kind: 'monospace',
        family: 'Consolas, monospace',
        sample: 'Consolas',
    },
    {
        id: 'courier-new',
        label: 'Courier New',
        kind: 'monospace',
        family: 'Courier New, monospace',
        sample: 'Courier New',
    },
    {
        id: 'ui-monospace',
        label: 'System Mono',
        kind: 'monospace',
        family: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        sample: 'ui-monospace',
    },
    // Sans-serif
    {
        id: 'system-sans',
        label: 'System Sans',
        kind: 'sans-serif',
        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        sample: '-apple-system',
    },
    {
        id: 'helvetica',
        label: 'Helvetica Neue',
        kind: 'sans-serif',
        family: 'Helvetica Neue, Helvetica, Arial, sans-serif',
        sample: 'Helvetica Neue',
    },
    {
        id: 'arial',
        label: 'Arial',
        kind: 'sans-serif',
        family: 'Arial, Helvetica, sans-serif',
        sample: 'Arial',
    },
    {
        id: 'gill-sans',
        label: 'Gill Sans',
        kind: 'sans-serif',
        family: 'Gill Sans, Gill Sans MT, Calibri, sans-serif',
        sample: 'Gill Sans',
    },
    {
        id: 'avenir',
        label: 'Avenir',
        kind: 'sans-serif',
        family: 'Avenir, Avenir Next, Helvetica, sans-serif',
        sample: 'Avenir',
    },
    // Serif
    {
        id: 'georgia',
        label: 'Georgia',
        kind: 'serif',
        family: 'Georgia, serif',
        sample: 'Georgia',
    },
    {
        id: 'times',
        label: 'Times New Roman',
        kind: 'serif',
        family: 'Times New Roman, Times, serif',
        sample: 'Times New Roman',
    },
    {
        id: 'palatino',
        label: 'Palatino',
        kind: 'serif',
        family: 'Palatino, Palatino Linotype, Book Antiqua, serif',
        sample: 'Palatino',
    },
];

const KIND_ORDER: FontKind[] = ['monospace', 'sans-serif', 'serif'];

export const kindLabel = (kind: FontKind): string => {
    switch (kind) {
        case 'monospace':
            return 'Monospace';
        case 'sans-serif':
            return 'Sans-serif';
        case 'serif':
            return 'Serif';
    }
};

/** Detect whether a named font face is installed (canvas width heuristic). */
export const isFontAvailable = (sample: string): boolean => {
    if (typeof document === 'undefined') {
        return true;
    }

    // Generic families are always "available"
    if (
        ['monospace', 'sans-serif', 'serif', 'ui-monospace', '-apple-system'].includes(sample) ||
        sample.startsWith('ui-')
    ) {
        return true;
    }

    try {
        if (document.fonts?.check) {
            if (document.fonts.check(`12px "${sample}"`)) {
                return true;
            }
        }
    } catch {
        // fall through to canvas
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return true;
    }

    const text = 'mmmmmmmmmmlliWw';
    ctx.font = '72px monospace';
    const baseline = ctx.measureText(text).width;
    ctx.font = `72px "${sample}", monospace`;
    const width = ctx.measureText(text).width;
    return width !== baseline;
};

export const fontsGrouped = (
    onlyAvailable = true,
): { kind: FontKind; label: string; fonts: FontOption[] }[] => {
    const groups = KIND_ORDER.map(kind => ({
        kind,
        label: kindLabel(kind),
        fonts: FONT_OPTIONS.filter(font => {
            if (font.kind !== kind) {
                return false;
            }
            if (!onlyAvailable) {
                return true;
            }
            return isFontAvailable(font.sample);
        }),
    })).filter(group => group.fonts.length > 0);

    return groups;
};

export const matchFontOption = (family: string): FontOption | undefined => {
    const normalized = family.trim().toLowerCase();
    return (
        FONT_OPTIONS.find(font => font.family.toLowerCase() === normalized) ||
        FONT_OPTIONS.find(font => normalized.startsWith(font.sample.toLowerCase()))
    );
};
