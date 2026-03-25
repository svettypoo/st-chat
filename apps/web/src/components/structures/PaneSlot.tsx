/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { Suspense } from "react";
import classNames from "classnames";
import { MatrixClientPeg } from "../../MatrixClientPeg";
const LazyRoomView = React.lazy(() => import("./RoomView").then((m) => ({ default: m.RoomView })));

interface PaneSlotProps {
    roomId: string | null;
    isActive: boolean;
    index: number;
    onActivate: (index: number) => void;
    onClose: (index: number) => void;
    onDrop: (index: number, roomId: string) => void;
    onSelectRoom?: (index: number, roomId: string) => void;
}

interface PaneSlotState {
    isDragOver: boolean;
    showSearch: boolean;
    searchQuery: string;
}

export class PaneSlot extends React.PureComponent<PaneSlotProps, PaneSlotState> {
    private searchInputRef = React.createRef<HTMLInputElement>();

    public constructor(props: PaneSlotProps) {
        super(props);
        this.state = { isDragOver: false, showSearch: false, searchQuery: "" };
    }

    private onDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "link";
        this.setState({ isDragOver: true });
    };

    private onDragLeave = (): void => {
        this.setState({ isDragOver: false });
    };

    private onDrop = (e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        this.setState({ isDragOver: false });
        const roomId = e.dataTransfer.getData("text/x-room-id");
        if (roomId) {
            this.props.onDrop(this.props.index, roomId);
        }
    };

    private onPaneClick = (): void => {
        this.props.onActivate(this.props.index);
    };

    private onClose = (e: React.MouseEvent): void => {
        e.stopPropagation();
        this.props.onClose(this.props.index);
    };

    private onEmptyClick = (e: React.MouseEvent): void => {
        e.stopPropagation();
        this.setState({ showSearch: true, searchQuery: "" }, () => {
            this.searchInputRef.current?.focus();
        });
    };

    private onSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({ searchQuery: e.target.value });
    };

    private onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === "Escape") {
            this.setState({ showSearch: false, searchQuery: "" });
        }
    };

    private onSearchBlur = (): void => {
        // Delay so click on room item registers first
        setTimeout(() => {
            this.setState({ showSearch: false, searchQuery: "" });
        }, 150);
    };

    private onRoomSelect = (roomId: string): void => {
        this.setState({ showSearch: false, searchQuery: "" });
        if (this.props.onSelectRoom) {
            this.props.onSelectRoom(this.props.index, roomId);
        } else {
            this.props.onDrop(this.props.index, roomId);
        }
    };

    private getRoomName(): string {
        if (!this.props.roomId) return "";
        const client = MatrixClientPeg.safeGet();
        const room = client.getRoom(this.props.roomId);
        return room?.name ?? this.props.roomId;
    }

    private getFilteredRooms(): Array<{ roomId: string; name: string }> {
        try {
            const client = MatrixClientPeg.safeGet();
            const rooms = client.getRooms();
            const q = this.state.searchQuery.toLowerCase();
            return rooms
                .filter((r) => !q || r.name?.toLowerCase().includes(q))
                .slice(0, 20)
                .map((r) => ({ roomId: r.roomId, name: r.name ?? r.roomId }));
        } catch {
            return [];
        }
    }

    private renderSearchPopup(): React.ReactNode {
        const rooms = this.getFilteredRooms();
        return (
            <div className="mx_PaneSlot_searchPopup" onMouseDown={(e) => e.preventDefault()}>
                <input
                    ref={this.searchInputRef}
                    className="mx_PaneSlot_searchInput"
                    type="text"
                    placeholder="Search rooms…"
                    value={this.state.searchQuery}
                    onChange={this.onSearchChange}
                    onKeyDown={this.onSearchKeyDown}
                    onBlur={this.onSearchBlur}
                />
                <div className="mx_PaneSlot_searchResults">
                    {rooms.length === 0 ? (
                        <div className="mx_PaneSlot_searchEmpty">No rooms found</div>
                    ) : (
                        rooms.map((r) => (
                            <div
                                key={r.roomId}
                                className="mx_PaneSlot_searchItem"
                                onMouseDown={() => this.onRoomSelect(r.roomId)}
                            >
                                {r.name}
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    public render(): React.ReactNode {
        const { roomId, isActive } = this.props;
        const { isDragOver, showSearch } = this.state;

        const classes = classNames("mx_PaneSlot", {
            "mx_PaneSlot--active": isActive,
            "mx_PaneSlot--dragOver": isDragOver,
            "mx_PaneSlot--empty": !roomId,
        });

        return (
            <div
                className={classes}
                onClick={this.onPaneClick}
                onDragOver={this.onDragOver}
                onDragLeave={this.onDragLeave}
                onDrop={this.onDrop}
            >
                {roomId ? (
                    <>
                        <div className="mx_PaneSlot_header">
                            <span className="mx_PaneSlot_roomName">{this.getRoomName()}</span>
                            <button
                                className="mx_PaneSlot_closeButton"
                                onClick={this.onClose}
                                aria-label="Close pane"
                                title="Close pane"
                            >
                                ×
                            </button>
                        </div>
                        <div className="mx_PaneSlot_content">
                            <Suspense fallback={<div/>}>
                                <LazyRoomView
                                    key={roomId}
                                    roomId={roomId}
                                    hideHeader={true}
                                    hideRightPanel={true}
                                    enableReadReceiptsAndMarkersOnActivity={isActive}
                                />
                            </Suspense>
                        </div>
                    </>
                ) : (
                    <div className="mx_PaneSlot_emptyState" onClick={this.onEmptyClick}>
                        <div className="mx_PaneSlot_emptyIcon">⊞</div>
                        <p className="mx_PaneSlot_emptyText">Click to open a room</p>
                        <p className="mx_PaneSlot_emptyHint">or drag a room here</p>
                        {showSearch && this.renderSearchPopup()}
                    </div>
                )}
            </div>
        );
    }
}
