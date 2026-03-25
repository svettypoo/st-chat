/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import classNames from "classnames";
import { PaneSlot } from "./PaneSlot";

type LayoutMode = "1" | "2h" | "4";

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
        this.state = {
            panes: saved.panes ?? [{ roomId: props.currentRoomId }],
            activePaneIndex: saved.activePaneIndex ?? 0,
            layout: saved.layout ?? "1",
        };
    }

    public componentDidUpdate(prevProps: MultiPaneLayoutProps): void {
        // When the active room changes from the room list, put it in the active pane
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

    private setLayout = (layout: LayoutMode): void => {
        let panes = [...this.state.panes];
        const targetCount = layout === "1" ? 1 : layout === "2h" ? 2 : 4;

        // Grow or shrink pane array
        while (panes.length < targetCount) panes.push({ roomId: null });
        if (panes.length > targetCount) panes = panes.slice(0, targetCount);

        const activePaneIndex = Math.min(this.state.activePaneIndex, targetCount - 1);
        this.setState({ layout, panes, activePaneIndex }, this.persist);
    };

    private getPaneCount(): number {
        const { layout } = this.state;
        return layout === "1" ? 1 : layout === "2h" ? 2 : 4;
    }

    public render(): React.ReactNode {
        const { panes, activePaneIndex, layout } = this.state;
        const paneCount = this.getPaneCount();
        const visiblePanes = panes.slice(0, paneCount);

        const gridClass = classNames("mx_MultiPaneLayout_grid", {
            "mx_MultiPaneLayout_grid--1": layout === "1",
            "mx_MultiPaneLayout_grid--2h": layout === "2h",
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
                        ▣
                    </button>
                    <button
                        className={classNames("mx_MultiPaneLayout_layoutBtn", { active: layout === "2h" })}
                        onClick={() => this.setLayout("2h")}
                        title="Two panes side by side"
                        aria-label="Two pane layout"
                    >
                        ⊟
                    </button>
                    <button
                        className={classNames("mx_MultiPaneLayout_layoutBtn", { active: layout === "4" })}
                        onClick={() => this.setLayout("4")}
                        title="Four panes (2×2)"
                        aria-label="Four pane layout"
                    >
                        ⊞
                    </button>
                </div>
            </div>
        );
    }
}
