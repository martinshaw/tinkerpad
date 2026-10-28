import { Component, createEffect, onCleanup } from 'solid-js';
import { Layout, Tab, useCodeStore } from '../../stores/code';
import { useGeneralStore } from '../../stores/general';
import { useSettingsStore } from '../../stores/settings';
import { ResultOutput, TabResult } from '../../utils/result/parse';
import { resolveOutputLines } from '../../utils/result/assignment-lines';
import { getActiveCodeEditor } from '../../utils/editor/actions';
import {
    copyOutput,
    downloadOutput,
    ExportFormat,
} from '../../utils/result/export';

type MenuItem =
    | { type: 'item'; label: string; action: () => void | Promise<void> }
    | { type: 'sep' };

let openMenuEl: HTMLElement | null = null;
let openMenuOnClose: (() => void) | null = null;

const closeDumpMenu = () => {
    openMenuEl?.remove();
    openMenuEl = null;
    openMenuOnClose?.();
    openMenuOnClose = null;
};

const iconSvg = (paths: string): string =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const COPY_ICON = iconSvg(
    '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
);

const MORE_ICON = iconSvg(
    '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
);

const parseLogMeta = (
    output: ResultOutput,
): { isLog: boolean; level: string; message: string; hasContext: boolean } => {
    if (output.kind === 'log') {
        return {
            isLog: true,
            level: (output.level || 'info').toLowerCase(),
            message: output.message || '',
            hasContext: output.hasContext === true,
        };
    }

    const raw = output.raw || '';
    const firstLine = raw.split('\n')[0] || '';
    const match = firstLine.match(/^\[([A-Za-z]+)\]\s+(.*)$/);
    if (!match) {
        return { isLog: false, level: 'info', message: '', hasContext: false };
    }

    // Fallback when kind is missing: a multiline raw dump means context follows the message.
    const newline = raw.indexOf('\n');
    return {
        isLog: true,
        level: match[1].toLowerCase(),
        message: match[2].trim(),
        hasContext: newline !== -1 && raw.slice(newline + 1).trim().length > 0,
    };
};

const atobSafe = (value: string): string => {
    try {
        return value ? atob(value) : '';
    } catch {
        return '';
    }
};

const cardPlainText = (card: HTMLElement): string => {
    const logLine = card.querySelector('.tp-dump-log-line')?.textContent?.trim() ?? '';
    const prefix = card.querySelector('.tp-dump-prefix')?.textContent?.trim() ?? '';
    const dump = card.querySelector('pre.sf-dump');
    const body = (dump?.innerText || dump?.textContent || '').replace(/\s+$/, '');
    if (logLine && body) {
        return `${logLine}\n${body}`;
    }
    if (logLine) {
        return logLine;
    }
    if (prefix && body) {
        return `${prefix}\n${body}`;
    }
    return body || prefix;
};

const flashCopied = (button: HTMLButtonElement) => {
    const prev = button.getAttribute('title') || 'Copy';
    button.classList.add('tp-dump-copied');
    button.setAttribute('title', 'Copied');
    window.setTimeout(() => {
        button.classList.remove('tp-dump-copied');
        button.setAttribute('title', prev);
    }, 900);
};

const showDumpMenu = (
    x: number,
    y: number,
    items: MenuItem[],
    colors: { background: string; secondary: string; primary: string },
    onClose?: () => void,
) => {
    closeDumpMenu();
    openMenuOnClose = onClose ?? null;

    const menu = document.createElement('div');
    menu.className = 'tp-dump-menu';
    menu.style.left = `${Math.min(x, window.innerWidth - 200)}px`;
    menu.style.top = `${Math.min(y, window.innerHeight - 8)}px`;
    menu.style.backgroundColor = colors.background;
    menu.style.borderColor = colors.secondary;
    menu.style.color = colors.primary;

    for (const item of items) {
        if (item.type === 'sep') {
            const sep = document.createElement('div');
            sep.className = 'tp-dump-menu-sep';
            sep.style.backgroundColor = colors.secondary;
            menu.appendChild(sep);
            continue;
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tp-dump-menu-item';
        button.textContent = item.label;
        button.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            closeDumpMenu();
            void item.action();
        });
        menu.appendChild(button);
    }

    document.body.appendChild(menu);
    openMenuEl = menu;

    // Keep menu on-screen vertically after layout.
    const rect = menu.getBoundingClientRect();
    if (rect.bottom > window.innerHeight - 8) {
        menu.style.top = `${Math.max(8, window.innerHeight - rect.height - 8)}px`;
    }

    const onPointer = (event: MouseEvent) => {
        const target = event.target as HTMLElement | null;
        if (!target?.closest('.tp-dump-menu')) {
            closeDumpMenu();
            document.removeEventListener('mousedown', onPointer, true);
        }
    };
    document.addEventListener('mousedown', onPointer, true);
};

const StructuredResult: Component<{ result: TabResult; tab?: Tab }> = props => {
    const [codeStore] = useCodeStore();
    const [generalStore] = useGeneralStore();
    const [settingsStore] = useSettingsStore();
    let resultPane!: HTMLDivElement;

    const colors = () => ({
        background: generalStore.themeInfo.colors.background,
        secondary: generalStore.themeInfo.colors.secondary,
        primary: generalStore.themeInfo.colors.primary,
        variable: generalStore.themeInfo.colors.editor?.variable,
        keyword: generalStore.themeInfo.colors.editor?.keyword,
        string: generalStore.themeInfo.colors.editor?.string,
    });

    const dumpStyle = () => {
        const c = colors();
        return `
        .tp-dump-card {
            position: relative;
            border-radius: 0.5rem;
            border: 1px solid ${c.secondary};
            background-color: color-mix(in srgb, ${c.secondary}, ${c.background} 72%);
            overflow: hidden;
        }
        .tp-dump-card + .tp-dump-card {
            margin-top: 0.75rem;
        }
        .tp-dump-align .tp-dump-card {
            margin-top: 0;
            width: 100%;
        }
        .tp-dump-card.tp-dump-log {
            border-color: color-mix(in srgb, ${c.secondary} 45%, transparent);
            background-color: color-mix(in srgb, ${c.background} 92%, ${c.secondary});
        }
        .tp-dump-log-line {
            display: flex;
            align-items: baseline;
            gap: 0.45rem;
            padding: 0.4rem 2.75rem 0.35rem 0.85rem;
            font-size: ${Math.max(10, settingsStore.app.editor.fontSize - 2)}px;
            font-family: ${settingsStore.app.editor.fontFamily};
            color: ${c.primary};
            opacity: 0.82;
            user-select: text;
            line-height: 1.45;
            white-space: pre-wrap;
            word-break: break-word;
        }
        .tp-dump-log-line .tp-dump-log-level {
            flex: none;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            font-size: 0.92em;
        }
        .tp-dump-log-line .tp-dump-log-message {
            opacity: 0.9;
            min-width: 0;
        }
        .tp-dump-log-level[data-level="emergency"],
        .tp-dump-log-level[data-level="alert"],
        .tp-dump-log-level[data-level="critical"],
        .tp-dump-log-level[data-level="error"] {
            color: #ff453a;
        }
        .tp-dump-log-level[data-level="warning"] {
            color: #ffd60a;
        }
        .tp-dump-log-level[data-level="notice"],
        .tp-dump-log-level[data-level="info"] {
            color: #64d2ff;
        }
        .tp-dump-log-level[data-level="debug"] {
            color: #8e8e93;
        }
        .tp-dump-log-context {
            margin: 0 0.55rem 0.5rem 0.85rem;
            padding: 0.15rem 0 0.15rem 0.65rem;
            border-left: 2px solid color-mix(in srgb, ${c.secondary} 70%, transparent);
            opacity: 0.78;
        }
        .tp-dump-log-context pre.sf-dump {
            padding: 0.2rem 0.4rem 0.35rem 0.15rem !important;
            margin: 0 !important;
        }
        /* Message already shown in .tp-dump-log-line — hide sf-dump's duplicate label. */
        .tp-dump-log-context .sf-dump-label {
            display: none;
        }
        .tp-dump-prefix {
            padding: 0.45rem 2.75rem 0 1rem;
            font-size: ${Math.max(11, settingsStore.app.editor.fontSize - 1)}px;
            font-family: ${settingsStore.app.editor.fontFamily};
            color: ${c.variable};
            opacity: 0.7;
            user-select: text;
        }
        .tp-dump-actions {
            position: absolute;
            top: 0.3rem;
            right: 0.3rem;
            display: flex;
            gap: 0.1rem;
            opacity: 0;
            transition: opacity 0.12s ease;
            z-index: 3;
        }
        .tp-dump-card:hover .tp-dump-actions,
        .tp-dump-card:focus-within .tp-dump-actions,
        .tp-dump-card.tp-dump-menu-open .tp-dump-actions {
            opacity: 1;
        }
        .tp-dump-action {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 1.45rem;
            height: 1.45rem;
            border-radius: 0.35rem;
            border: 1px solid transparent;
            background: color-mix(in srgb, ${c.background} 82%, ${c.secondary});
            color: ${c.primary};
            opacity: 0.75;
            cursor: pointer;
            padding: 0;
        }
        .tp-dump-action:hover {
            opacity: 1;
            border-color: ${c.secondary};
        }
        .tp-dump-action.tp-dump-copied {
            opacity: 1;
            color: #30d158;
        }
        pre.sf-dump {
            margin: 0;
            padding: 0.55rem 1rem 0.85rem;
            overflow-x: auto;
            line-height: 1.55;
            background: transparent !important;
        }
        .tp-dump-prefix + pre.sf-dump {
            padding-top: 0.2rem;
        }
        pre.sf-dump,
        pre.sf-dump .sf-dump-default {
            color: ${c.keyword};
            font-family: ${settingsStore.app.editor.fontFamily} !important;
            font-size: ${settingsStore.app.editor.fontSize}px !important;
        }
        pre.sf-dump * {
            font-family: inherit !important;
            font-size: inherit !important;
        }
        .sf-dump-hover:hover {
            background-color: color-mix(in srgb, ${c.secondary}, transparent 40%);
        }
        pre.sf-dump .sf-dump-key {
            color: ${c.string};
        }
        pre.sf-dump .sf-dump-str {
            color: ${c.string};
            word-wrap: anywhere;
        }
        pre.sf-dump .sf-dump-num,
        pre.sf-dump .sf-dump-index,
        pre.sf-dump .sf-dump-note,
        pre.sf-dump .sf-dump-ellipsis-note {
            color: ${c.primary};
        }
        pre.sf-dump .sf-dump-expanded {
            white-space: pre-wrap;
        }
        pre.sf-dump .sf-dump-const {
            color: ${c.keyword};
        }
        pre.sf-dump .sf-dump-protected,
        pre.sf-dump .sf-dump-public,
        pre.sf-dump .sf-dump-private,
        pre.sf-dump .sf-dump-meta {
            color: ${c.variable};
        }
        pre.sf-dump .sf-dump-ref {
            color: color-mix(in srgb, ${c.primary}, transparent 35%);
        }
        pre.sf-dump a {
            color: inherit;
            text-decoration: none;
        }
        .tp-dump-menu {
            position: fixed;
            z-index: 300;
            width: max-content;
            border-radius: 0.4rem;
            border: 1px solid;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
            padding: 0.25rem 0;
            font-size: 0.75rem;
        }
        .tp-dump-menu-item {
            display: block;
            width: 100%;
            text-align: left;
            padding: 0.4rem 0.85rem;
            background: transparent;
            border: 0;
            color: inherit;
            cursor: pointer;
        }
        .tp-dump-menu-item:hover {
            filter: brightness(1.25);
            background: color-mix(in srgb, currentColor 8%, transparent);
        }
        .tp-dump-menu-sep {
            height: 1px;
            margin: 0.25rem 0.5rem;
            opacity: 0.7;
        }
    `;
    };

    const lineTop = (line: number): number => {
        const editor = getActiveCodeEditor();
        if (editor) {
            try {
                return editor.getTopForLineNumber(line);
            } catch {
                // fall through
            }
        }
        const fontSize = settingsStore.app.editor.fontSize || 14;
        const lineHeight = settingsStore.app.editor.lineHeight || 1.5;
        return (line - 1) * fontSize * lineHeight;
    };

    const menuItemsFor = (output: ResultOutput, card: HTMLElement, index: number): MenuItem[] => {
        const plain = () => cardPlainText(card);
        const copy = (format: ExportFormat) => async () => {
            await copyOutput(output, format, format === 'plain' ? plain() : undefined);
        };
        const save = (format: ExportFormat) => async () => {
            await downloadOutput(output, format, index, format === 'plain' ? plain() : undefined);
        };

        return [
            { type: 'item', label: 'Copy as text', action: copy('text') },
            { type: 'item', label: 'Copy as HTML', action: copy('html') },
            { type: 'item', label: 'Copy as plain text', action: copy('plain') },
            { type: 'sep' },
            { type: 'item', label: 'Export as text…', action: save('text') },
            { type: 'item', label: 'Export as HTML…', action: save('html') },
            { type: 'item', label: 'Export as plain text…', action: save('plain') },
        ];
    };

    const openCardMenu = (
        x: number,
        y: number,
        output: ResultOutput,
        card: HTMLElement,
        index: number,
    ) => {
        card.classList.add('tp-dump-menu-open');
        showDumpMenu(x, y, menuItemsFor(output, card, index), colors(), () => {
            card.classList.remove('tp-dump-menu-open');
        });
    };

    const attachActions = (card: HTMLElement, output: ResultOutput, index: number) => {
        const actions = document.createElement('div');
        actions.className = 'tp-dump-actions';

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'tp-dump-action';
        copyBtn.title = 'Copy';
        copyBtn.setAttribute('aria-label', 'Copy');
        copyBtn.innerHTML = COPY_ICON;
        copyBtn.addEventListener('click', async e => {
            e.preventDefault();
            e.stopPropagation();
            if (await copyOutput(output, 'text')) {
                flashCopied(copyBtn);
            }
        });

        const moreBtn = document.createElement('button');
        moreBtn.type = 'button';
        moreBtn.className = 'tp-dump-action';
        moreBtn.title = 'Export';
        moreBtn.setAttribute('aria-label', 'Export');
        moreBtn.innerHTML = MORE_ICON;
        moreBtn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            const rect = moreBtn.getBoundingClientRect();
            openCardMenu(rect.left, rect.bottom + 4, output, card, index);
        });

        actions.append(copyBtn, moreBtn);
        card.appendChild(actions);

        card.addEventListener('contextmenu', e => {
            e.preventDefault();
            e.stopPropagation();
            openCardMenu(e.clientX, e.clientY, output, card, index);
        });
    };

    createEffect(() => {
        try {
            closeDumpMenu();
            const outputs = props.result.outputs ?? [];
            const tab = props.tab ?? codeStore.currentTab;
            // Track toggles so the effect re-runs when they change.
            const dumpOn = !!tab?.dumpAssignments;
            const alignOn = !!tab?.alignAssignmentOutput;
            const align = dumpOn && alignOn;
            const code = tab?.code ?? '';
            const lineHints = align
                ? resolveOutputLines(code, outputs)
                : outputs.map(() => undefined);

            resultPane.innerHTML = '';
            resultPane.classList.toggle('tp-dump-align', align);
            resultPane.style.position = align ? 'relative' : '';
            resultPane.style.minHeight = '';
            resultPane.style.paddingTop = align ? '0' : '';

            const styleEl = document.createElement('style');
            styleEl.textContent = dumpStyle();
            resultPane.appendChild(styleEl);

            if (!outputs.length) {
                const empty = document.createElement('pre');
                empty.className = 'text-xs whitespace-pre-wrap opacity-80 m-0';
                empty.textContent = props.result.error || '';
                resultPane.appendChild(empty);
                return;
            }

            const gap = 10;
            let cursorY = 0;

            outputs.forEach((output, index) => {
                const meta = parseLogMeta(output);
                const card = document.createElement('div');
                card.className = meta.isLog ? 'tp-dump-card tp-dump-log' : 'tp-dump-card';

                if (meta.isLog) {
                    const line = document.createElement('div');
                    line.className = 'tp-dump-log-line';

                    const level = document.createElement('span');
                    level.className = 'tp-dump-log-level';
                    level.dataset.level = meta.level;
                    level.textContent = meta.level;

                    const message = document.createElement('span');
                    message.className = 'tp-dump-log-message';
                    message.textContent = meta.message || output.message || '';

                    line.append(level, message);
                    card.appendChild(line);

                    // Only nest a context dump when there is real context (not the
                    // message-only ScalarStub we embed so older Tree paths keep a body).
                    if (meta.hasContext && output.html) {
                        try {
                            const contextWrap = document.createElement('div');
                            contextWrap.className = 'tp-dump-log-context';
                            const body = document.createElement('div');
                            body.innerHTML = atobSafe(output.html);
                            while (body.firstChild) {
                                contextWrap.appendChild(body.firstChild);
                            }
                            if (contextWrap.querySelector('.sf-dump')) {
                                card.appendChild(contextWrap);
                            }
                        } catch {
                            // ignore bad dump html
                        }
                    }
                } else {
                    if (output.label) {
                        const prefix = document.createElement('div');
                        prefix.className = 'tp-dump-prefix';
                        prefix.textContent = `${output.label} =`;
                        card.appendChild(prefix);
                    }

                    if (output.html) {
                        try {
                            const body = document.createElement('div');
                            body.innerHTML = atobSafe(output.html);
                            while (body.firstChild) {
                                card.appendChild(body.firstChild);
                            }
                        } catch {
                            // ignore bad dump html
                        }
                    }
                }

                attachActions(card, output, index);

                if (align) {
                    // Assignments pin to `$x =` lines; logs pin to `Log::{level}(` lines.
                    const line = lineHints[index];
                    let top = cursorY;
                    if (line) {
                        top = Math.max(cursorY, lineTop(line));
                    }
                    card.style.position = 'absolute';
                    card.style.left = '0.75rem';
                    card.style.right = '0.75rem';
                    card.style.top = `${top}px`;
                    resultPane.appendChild(card);

                    Array.from(card.querySelectorAll('.sf-dump')).forEach(dump => {
                        if (typeof window.Sfdump === 'function') {
                            window.Sfdump(dump.id);
                        }
                    });

                    cursorY = top + Math.max(card.offsetHeight, 32) + gap;
                } else {
                    resultPane.appendChild(card);
                    Array.from(card.querySelectorAll('.sf-dump')).forEach(dump => {
                        if (typeof window.Sfdump === 'function') {
                            window.Sfdump(dump.id);
                        }
                    });
                }
            });

            if (align) {
                resultPane.style.minHeight = `${cursorY + 8}px`;
            }
        } catch (error) {
            console.error(error);
            resultPane.textContent = props.result.error || 'Failed to render dump';
        }
    });

    onCleanup(() => closeDumpMenu());

    return (
        <div
            ref={resultPane}
            class="h-full min-h-0 px-3 py-3 overflow-x-hidden overflow-y-auto soft-scrollbar"
            classList={{ 'py-2': codeStore.layout === Layout.Horizontal }}
        />
    );
};

export default StructuredResult;
