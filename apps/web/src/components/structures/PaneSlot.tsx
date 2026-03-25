/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import classNames from "classnames";
import { MatrixClientPeg } from "../../MatrixClientPeg";
import { RoomView } from "./RoomView";

interface PaneSlotProps {
    roomId: string | null;
    isActive: boolean;
    index: number;
    onActivate: (index: number) => void;
    onClose: (index: number) => void;
    onDrop: (index: number, roomId: string) => void;
}

interface PaneSlotState {
    isDragOver: boolean;
}

export class PaneSlot extends React.PureComponent<PaneSlotProps, PaneSlotState> {
    public constructor(props: PaneSlotProps) {
        super(props);
        this.state = { isDragOver: false };
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

    private getRoomName(): string {
        if (!this.props.roomId) return "";
        const client = MatrixClientPeg.safeGet();
        const room = client.getRoom(this.props.roomId);
        return room?.name ?? this.props.roomId;
    }

    public render(): React.ReactNode {
        const { roomId, isActive } = this.props;
        const { isDragOver } = this.state;

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
                            <RoomView
                                key={roomId}
                                roomId={roomId}
                                hideHeader={true}
                                hideRightPanel={true}
                                enableReadReceiptsAndMarkersOnActivity={isActive}
                            />
                        </div>
                    </>
                ) : (
                    <div className="mx_PaneSlot_emptyState">
                        <div className="mx_PaneSlot_emptyIcon">⊞</div>
                        <p className="mx_PaneSlot_emptyText">Drag a room here</p>
                    </div>
                )}
            </div>
        );
    }
}
