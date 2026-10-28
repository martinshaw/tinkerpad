import { Component, JSX } from 'solid-js';

/** Play glyph with a stop/line mark — “run until selected line”. */
const SquarePlayUntil: Component<JSX.SvgSVGAttributes<SVGSVGElement>> = props => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            {...props}
        >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="m8 8 5 3.5L8 15Z" />
            <path d="M15 8v8" />
        </svg>
    );
};

export default SquarePlayUntil;
