/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import classNames from "classnames";
import { PaneSlot } from "./PaneSlot";

type LayoutMode = "1" | "2" | "3" | "4";

interface Pane {
    roomId: string | null;
}

interface MultiPaneLayoutProps {
    currentRoomId: string | null;
    pageType?: string;
}

interface MultiPaneLayoutState {
    panes: Pane[];
    activePaneIndex: number;
    layout: LayoutMode;
}

const STORAGE_KEY = "mx_MultiPaneLayout";

function loadFromStorage(): Partial<MultiPaneLayoutState> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch {
        // ignore
    }
    return {};
}

function saveToStorage(state: MultiPaneLayoutState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // ignore
    }
}

export class MultiPaneLayout extends React.Component<MultiPaneLayoutProps, MultiPaneLayoutState> {
    public constructor(props: MultiPaneLayoutProps) {
        super(props);
        const saved = loadFromStorage();
        // Migrate old "2h" -> "2" from saved state
        let savedLayout = saved.layout as string | undefined;
        if (savedLayout === "2h") savedLayout = "2";
        const layout = (savedLayout as LayoutMode) ?? "1";
        this.state = {
            panes: saved.panes ?? [{ roomId: props.currentRoomId }],
            activePaneIndex: saved.activePaneIndex ?? 0,
            layout,
        };
    }

    public componentDidUpdate(prevProps: MultiPaneLayoutProps): void {
        if (prevProps.currentRoomId !== this.props.currentRoomId && this.props.currentRoomId) {
            this.setRoomInActivePane(this.props.currentRoomId);
        }
    }

    private setRoomInActivePane(roomId: string): void {
        const panes = [...this.state.panes];
        panes[this.state.activePaneIndex] = { roomId };
        this.setState({ panes }, this.persist);
    }

    private persist = (): void => {
        saveToStorage(this.state);
    };

    private onActivatePane = (index: number): void => {
        this.setState({ activePaneIndex: index }, this.persist);
    };

    private onClosePane = (index: number): void => {
        const panes = [...this.state.panes];
        panes[index] = { roomId: null };
        this.setState({ panes }, this.persist);
    };

    private onDropRoom = (index: number, roomId: string): void => {
        const panes = [...this.state.panes];
        panes[index] = { roomId };
        this.setState({ panes, activePaneIndex: index }, this.persist);
    };

    private getPaneCount(layout: LayoutMode = this.state.layout): number {
        if (layout === "1") return 1;
        if (layout === "2") return 2;
        if (layout === "3") return 3;
        return 4;
    }

    private setLayout = (layout: LayoutMode): void => {
        let panes = [...this.state.panes];
        const targetCount = this.getPaneCount(layout);

        while (panes.length < targetCount) panes.push({ roomId: null });
        if (panes.length > targetCount) panes = panes.slice(0, targetCount);

        const activePaneIndex = Math.min(this.state.activePaneIndex, targetCount - 1);
        this.setState({ layout, panes, activePaneIndex }, this.persist);
    };

    public render(): React.ReactNode {
        const { panes, activePaneIndex, layout } = this.state;
        const paneCount = this.getPaneCount();
        const visiblePanes = panes.slice(0, paneCount);

        const gridClass = classNames("mx_MultiPaneLayout_grid", {
            "mx_MultiPaneLayout_grid--1": layout === "1",
            "mx_MultiPaneLayout_grid--2": layout === "2",
            "mx_MultiPaneLayout_grid--3": layout === "3",
            "mx_MultiPaneLayout_grid--4": layout === "4",
        });

        return (
            <div className="mx_MultiPaneLayout">
                <div className={gridClass}>
                    {visiblePanes.map((pane, i) => (
                        <PaneSlot
                            key={i}
                            index={i}
                            roomId={pane.roomId}
                            isActive={i === activePaneIndex}
                            onActivate={this.onActivatePane}
                            onClose={this.onClosePane}
                            onDrop={this.onDropRoom}
                            onSelectRoom={this.onDropRoom}
                        />
                    ))}
                </div>
                <div className="mx_MultiPaneLayout_toolbar">
                    <button
                        className={classNames("mx_MultiPaneLayout_layoutBtn", { active: layout === "1" })}
                        onClick={() => this.setLayout("1")}
                        title="Single pane"
                        aria-label="Single pane layout"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <rect x="2" y="1" width="12" height="14" rx="1.5" />
                        </svg>
                    </button>
                    <button
                        className={classNames("mx_MultiPaneLayout_layoutBtn", { active: layout === "2" })}
                        onClick={() => this.setLayout("2")}
                        title="Two panes side by side"
                        aria-label="Two pane layout"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <rect x="1" y="1" width="6" height="14" rx="1.5" />
                            <rect x="9" y="1" width="6" height="14" rx="1.5" />
                        </svg>
                    </button>
                    <button
                        className={classNames("mx_MultiPaneLayout_layoutBtn", { active: layout === "3" })}
                        onClick={() => this.setLayout("3")}
                        title="Three panes side by side"
                        aria-label="Three pane layout"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <rect x="0.5" y="1" width="4" height="14" rx="1" />
                            <rect x="6" y="1" width="4" height="14" rx="1" />
                            <rect x="11.5" y="1" width="4" height="14" rx="1" />
                        </svg>
                    </button>
                    <button
                        className={classNames("mx_MultiPaneLayout_layoutBtn", { active: layout === "4" })}
                        onClick={() => this.setLayout("4")}
                        title="Four panes side by side"
                        aria-label="Four pane layout"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <rect x="0.5" y="1" width="2.75" height="14" rx="0.75" />
                            <rect x="4.75" y="1" width="2.75" height="14" rx="0.75" />
                            <rect x="9" y="1" width="2.75" height="14" rx="0.75" />
                            <rect x="13.25" y="1" width="2.75" height="14" rx="0.75" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    }
}
