import { createSignal } from 'solid-js';
import type { PaneEdge } from '../../stores/code';

export type DropZone =
    | { kind: 'edge'; paneId: string; edge: PaneEdge }
    | { kind: 'strip'; paneId: string; index: number };

const [draggingTabId, setDraggingTabId] = createSignal<string | null>(null);
const [dropZone, setDropZone] = createSignal<DropZone | null>(null);

export { draggingTabId, setDraggingTabId, dropZone, setDropZone };

export const clearTabDrag = () => {
    setDraggingTabId(null);
    setDropZone(null);
};

export const edgeFromPoint = (
    clientX: number,
    clientY: number,
    rect: DOMRect,
): PaneEdge | null => {
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    const band = 0.22;
    const distLeft = x;
    const distRight = 1 - x;
    const distTop = y;
    const distBottom = 1 - y;
    const min = Math.min(distLeft, distRight, distTop, distBottom);
    if (min > band) {
        return null;
    }
    if (min === distLeft) {
        return 'left';
    }
    if (min === distRight) {
        return 'right';
    }
    if (min === distTop) {
        return 'top';
    }
    return 'bottom';
};
