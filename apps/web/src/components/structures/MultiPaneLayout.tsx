/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import classNames from "classnames";
import { PaneSlot } from "./PaneSlot";
import { MatrixClientPeg } from "../../MatrixClientPeg";

export type LayoutMode = "1" | "2" | "3" | "4";
export const LAYOUT_CHANGE_EVENT = "st-layout-change";

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

    public componentDidMount(): void {
        window.addEventListener(LAYOUT_CHANGE_EVENT, this.onExternalLayoutChange as EventListener);
    }

    public componentWillUnmount(): void {
        window.removeEventListener(LAYOUT_CHANGE_EVENT, this.onExternalLayoutChange as EventListener);
    }

    public componentDidUpdate(prevProps: MultiPaneLayoutProps): void {
        if (prevProps.currentRoomId !== this.props.currentRoomId && this.props.currentRoomId) {
            this.setRoomInActivePane(this.props.currentRoomId);
        }
    }

    private onExternalLayoutChange = (e: CustomEvent<{ layout: LayoutMode }>): void => {
        this.setLayout(e.detail.layout);
    };

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

    private getNextRecentRoom(currentPanes: Pane[]): string | null {
        try {
            const client = MatrixClientPeg.safeGet();
            const rooms = client.getVisibleRooms();

            // Sort by most recent activity
            rooms.sort((a, b) => {
                const tsA = a.getLastActiveTimestamp();
                const tsB = b.getLastActiveTimestamp();
                return tsB - tsA;
            });

            // Find first room not already in a pane
            const usedRoomIds = new Set(currentPanes.map((p) => p.roomId).filter(Boolean));
            for (const room of rooms) {
                if (!usedRoomIds.has(room.roomId)) {
                    return room.roomId;
                }
            }
        } catch {
            // fallback to null if client not available
        }
        return null;
    }

    private setLayout = (layout: LayoutMode): void => {
        let panes = [...this.state.panes];
        const targetCount = this.getPaneCount(layout);

        // Get recent rooms to auto-fill new panes
        while (panes.length < targetCount) {
            const recentRoom = this.getNextRecentRoom(panes);
            panes.push({ roomId: recentRoom });
        }
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
            </div>
        );
    }
}
