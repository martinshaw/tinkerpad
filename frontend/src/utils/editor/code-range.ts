/** Return source from line 1 through `lineNumber` inclusive (1-based). */
export const codeUntilLine = (code: string, lineNumber: number): string => {
    if (!code) {
        return '';
    }
    const lines = code.split('\n');
    const end = Math.min(Math.max(1, Math.floor(lineNumber)), lines.length);
    return lines.slice(0, end).join('\n');
};

/** Last line of the current selection, or the cursor line. */
export const selectedLineNumber = (selection: {
    startLineNumber: number;
    endLineNumber: number;
} | null): number | null => {
    if (!selection) {
        return null;
    }
    return Math.max(selection.startLineNumber, selection.endLineNumber);
};
