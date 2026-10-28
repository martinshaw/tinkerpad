import { Component, For, JSX } from 'solid-js';
import SideShell, { SideNavButton } from './SideShell';

export type PrefNavItem = {
    id: string;
    label: string;
    icon?: JSX.Element;
};

const PrefShell: Component<{
    title: string;
    titleIcon?: JSX.Element;
    nav: PrefNavItem[];
    activeId: string;
    onNavigate: (id: string) => void;
    children: JSX.Element;
    trailing?: JSX.Element;
}> = props => {
    const activeLabel = () =>
        props.nav.find(item => item.id === props.activeId)?.label ?? props.title;

    return (
        <SideShell
            title={props.title}
            titleIcon={props.titleIcon}
            contentTitle={activeLabel()}
            trailing={props.trailing}
            sidebarWidth="12.5rem"
            sidebar={
                <For each={props.nav}>
                    {item => (
                        <SideNavButton
                            active={item.id === props.activeId}
                            icon={item.icon}
                            onClick={() => props.onNavigate(item.id)}
                        >
                            {item.label}
                        </SideNavButton>
                    )}
                </For>
            }
        >
            {props.children}
        </SideShell>
    );
};

export default PrefShell;
