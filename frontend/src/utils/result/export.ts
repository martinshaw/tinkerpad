import { SaveExportFile, WriteTextFile, Error as ShowError } from '../../../wailsjs/go/dialog/Dialog';
import { ResultOutput } from './parse';

export type ExportFormat = 'text' | 'html' | 'plain';

const decodeHtml = (output: ResultOutput): string => {
    try {
        return atob(output.html);
    } catch {
        return '';
    }
};

/** Strip a leading `$label =` prefix from raw dumps. */
export const rawValue = (output: ResultOutput): string => {
    const raw = output.raw ?? '';
    if (!output.label) {
        return raw;
    }
    const prefix = `${output.label} =`;
    if (raw.startsWith(prefix)) {
        return raw.slice(prefix.length).replace(/^\s+/, '');
    }
    return raw;
};

export const formatOutput = (
    output: ResultOutput,
    format: ExportFormat,
    plainFallback?: string,
): string => {
    switch (format) {
        case 'html':
            return decodeHtml(output);
        case 'plain':
            return (plainFallback ?? rawValue(output)).trimEnd() + '\n';
        case 'text':
        default:
            return (output.raw ?? '').trimEnd() + '\n';
    }
};

export const exportFilename = (output: ResultOutput, format: ExportFormat, index: number): string => {
    const base = (output.label || `dump-${index + 1}`)
        .replace(/^\$/, '')
        .replace(/[^\w.-]+/g, '_')
        .replace(/^_+|_+$/g, '') || `dump-${index + 1}`;
    const ext = format === 'html' ? 'html' : 'txt';
    return `${base}.${ext}`;
};

export const copyText = async (text: string): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        try {
            const area = document.createElement('textarea');
            area.value = text;
            area.style.position = 'fixed';
            area.style.left = '-9999px';
            document.body.appendChild(area);
            area.select();
            const ok = document.execCommand('copy');
            area.remove();
            return ok;
        } catch {
            return false;
        }
    }
};

export const copyHtml = async (html: string, plain: string): Promise<boolean> => {
    try {
        if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': new Blob([html], { type: 'text/html' }),
                    'text/plain': new Blob([plain], { type: 'text/plain' }),
                }),
            ]);
            return true;
        }
    } catch {
        // fall through
    }
    return copyText(html);
};

export const copyOutput = async (
    output: ResultOutput,
    format: ExportFormat,
    plainFallback?: string,
): Promise<boolean> => {
    const text = formatOutput(output, format, plainFallback);
    if (format === 'html') {
        return copyHtml(text, formatOutput(output, 'plain', plainFallback));
    }
    return copyText(text);
};

/** Native save dialog + write — blob downloads are a no-op in the Wails webview. */
export const downloadOutput = async (
    output: ResultOutput,
    format: ExportFormat,
    index: number,
    plainFallback?: string,
): Promise<boolean> => {
    const content = formatOutput(output, format, plainFallback);
    const filename = exportFilename(output, format, index);
    const path = await SaveExportFile(filename);
    if (!path) {
        return false;
    }
    try {
        await WriteTextFile(path, content);
        return true;
    } catch (error) {
        console.error(error);
        await ShowError(error instanceof Error ? error.message : 'Failed to export output');
        return false;
    }
};
