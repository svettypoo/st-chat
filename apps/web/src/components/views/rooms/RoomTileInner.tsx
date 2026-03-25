/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import classNames from "classnames";
import { type Room } from "matrix-js-sdk/src/matrix";
import { KnownMembership } from "matrix-js-sdk/src/types";

import { type Call } from "../../../models/Call";
import { RovingTabIndexWrapper } from "../../../accessibility/RovingTabIndex";
import AccessibleButton, { type ButtonEvent } from "../../views/elements/AccessibleButton";
import { _t } from "../../../languageHandler";
import { DefaultTagID, type TagID } from "../../../stores/room-list-v3/skip-list/tag";
import { type MessagePreview } from "../../../stores/message-preview";
import DecoratedRoomAvatar from "../avatars/DecoratedRoomAvatar";
import NotificationBadge from "./NotificationBadge";
import { type NotificationState } from "../../../stores/notifications/NotificationState";
import { type RoomEchoChamber } from "../../../stores/local-echo/RoomEchoChamber";
import { RoomTileSubtitle } from "./RoomTileSubtitle";
import { isKnockDenied } from "../../../utils/membership";
import SettingsStore from "../../../settings/SettingsStore";
import { RoomTileNotificationsMenu, RoomTileGeneralMenu } from "./RoomTileMenus";

const messagePreviewId = (roomId: string): string => `mx_RoomTile_messagePreview_${roomId}`;

interface RoomTileInnerProps {
    room: Room;
    tag: TagID;
    isMinimized: boolean;
    showMessagePreview: boolean;
    selected: boolean;
    call: Call | null;
    messagePreview: MessagePreview | null;
    notificationState: NotificationState;
    roomProps: RoomEchoChamber;
    notificationsMenuPosition: Pick<DOMRect, "left" | "bottom"> | null;
    generalMenuPosition: Pick<DOMRect, "left" | "bottom"> | null;
    roomTileRef: React.RefObject<HTMLDivElement>;
    onTileClick: (ev: ButtonEvent) => void;
    onContextMenu: (ev: React.MouseEvent) => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
    onNotificationsMenuOpenClick: (ev: ButtonEvent) => void;
    onCloseNotificationsMenu: () => void;
    onGeneralMenuOpenClick: (ev: ButtonEvent) => void;
    onCloseGeneralMenu: () => void;
    onFocusRovingTab: (ev: React.FocusEvent) => void;
}

export function RoomTileInner({
    room,
    tag,
    isMinimized,
    showMessagePreview,
    selected,
    call,
    messagePreview,
    notificationState,
    roomProps,
    notificationsMenuPosition,
    generalMenuPosition,
    roomTileRef,
    onTileClick,
    onContextMenu,
    onDragStart,
    onNotificationsMenuOpenClick,
    onCloseNotificationsMenu,
    onGeneralMenuOpenClick,
    onCloseGeneralMenu,
}: RoomTileInnerProps): React.ReactElement {
    const classes = classNames({
        mx_RoomTile: true,
        mx_RoomTile_sticky:
            SettingsStore.getValue("feature_ask_to_join") &&
            (room.getMyMembership() === KnownMembership.Knock || isKnockDenied(room)),
        mx_RoomTile_selected: selected,
        mx_RoomTile_hasMenuOpen: !!(generalMenuPosition || notificationsMenuPosition),
        mx_RoomTile_minimized: isMinimized,
    });

    let name = room.name;
    if (typeof name !== "string") name = "";
    name = name.replace(":", ":\u200b");

    const shouldRenderSubtitle = !!call || (showMessagePreview && !!messagePreview);
    const badge =
        !isMinimized && notificationState ? (
            <div className="mx_RoomTile_badgeContainer" aria-hidden="true">
                <NotificationBadge notification={notificationState} roomId={room.roomId} />
            </div>
        ) : null;

    const subtitle = shouldRenderSubtitle ? (
        <RoomTileSubtitle call={call} messagePreview={messagePreview} roomId={room.roomId} showMessagePreview={showMessagePreview} />
    ) : null;

    const titleClasses = classNames({
        mx_RoomTile_title: true,
        mx_RoomTile_titleWithSubtitle: !!subtitle,
        mx_RoomTile_titleHasUnreadEvents: notificationState.isUnread,
    });

    const titleContainer = isMinimized ? null : (
        <div className="mx_RoomTile_titleContainer">
            <div title={name} className={titleClasses} tabIndex={-1}>
                <span dir="auto">{name}</span>
            </div>
            {subtitle}
        </div>
    );

    let ariaLabel = name;
    if (tag === DefaultTagID.Invite) {
        // append nothing
    } else if (notificationState.hasMentions) {
        ariaLabel += " " + _t("a11y|n_unread_messages_mentions", { count: notificationState.count });
    } else if (notificationState.hasUnreadCount) {
        ariaLabel += " " + _t("a11y|n_unread_messages", { count: notificationState.count });
    } else if (notificationState.isUnread) {
        ariaLabel += " " + _t("a11y|unread_messages");
    }

    const ariaDescribedBy = showMessagePreview ? messagePreviewId(room.roomId) : undefined;

    return (
        <RovingTabIndexWrapper inputRef={roomTileRef}>
            {({ onFocus, isActive, ref }) => (
                <div draggable={true} onDragStart={onDragStart} className="mx_RoomTile_dragWrapper">
                    <AccessibleButton
                        onFocus={onFocus}
                        tabIndex={isActive ? 0 : -1}
                        ref={ref}
                        className={classes}
                        onClick={onTileClick}
                        onContextMenu={onContextMenu}
                        role="treeitem"
                        aria-label={ariaLabel}
                        aria-selected={selected}
                        aria-describedby={ariaDescribedBy}
                        title={isMinimized && !generalMenuPosition ? name : undefined}
                    >
                        <DecoratedRoomAvatar
                            room={room}
                            size="32px"
                            displayBadge={isMinimized}
                            tooltipProps={{ tabIndex: isActive ? 0 : -1 }}
                        />
                        {titleContainer}
                        {badge}
                        <RoomTileGeneralMenu
                            room={room}
                            tag={tag}
                            generalMenuPosition={generalMenuPosition}
                            onGeneralMenuOpenClick={onGeneralMenuOpenClick}
                            onCloseGeneralMenu={onCloseGeneralMenu}
                        />
                        <RoomTileNotificationsMenu
                            room={room}
                            tag={tag}
                            isMinimized={isMinimized}
                            roomProps={roomProps}
                            notificationsMenuPosition={notificationsMenuPosition}
                            isActive={isActive}
                            onNotificationsMenuOpenClick={onNotificationsMenuOpenClick}
                            onCloseNotificationsMenu={onCloseNotificationsMenu}
                        />
                    </AccessibleButton>
                </div>
            )}
        </RovingTabIndexWrapper>
    );
}
