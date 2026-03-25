/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import classNames from "classnames";
import { type Room } from "matrix-js-sdk/src/matrix";
import { OverflowHorizontalIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { _t } from "../../../languageHandler";
import { ContextMenuTooltipButton, type MenuProps } from "../../structures/ContextMenu";
import { DefaultTagID, type TagID } from "../../../stores/room-list-v3/skip-list/tag";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import { RoomNotifState } from "../../../RoomNotifs";
import { RoomNotificationContextMenu } from "../context_menus/RoomNotificationContextMenu";
import { RoomGeneralContextMenu } from "../context_menus/RoomGeneralContextMenu";
import PosthogTrackers from "../../../PosthogTrackers";
import { type ButtonEvent } from "../../views/elements/AccessibleButton";
import { type RoomEchoChamber } from "../../../stores/local-echo/RoomEchoChamber";
import { shouldShowComponent } from "../../../customisations/helpers/UIComponents";
import { UIComponent } from "../../../settings/UIFeature";
import { isKnockDenied } from "../../../utils/membership";
import { KnownMembership } from "matrix-js-sdk/src/types";
import { getNotificationIcon } from "../dialogs/spotlight/RoomResultContextMenus.tsx";
import { contextMenuBelow } from "./RoomTile";

interface RoomTileMenusProps {
    room: Room;
    tag: TagID;
    isMinimized: boolean;
    roomProps: RoomEchoChamber;
    notificationsMenuPosition: Pick<DOMRect, "left" | "bottom"> | null;
    generalMenuPosition: Pick<DOMRect, "left" | "bottom"> | null;
    isActive: boolean;
    onNotificationsMenuOpenClick: (ev: ButtonEvent) => void;
    onCloseNotificationsMenu: () => void;
    onGeneralMenuOpenClick: (ev: ButtonEvent) => void;
    onCloseGeneralMenu: () => void;
}

export function RoomTileNotificationsMenu({
    room,
    tag,
    isMinimized,
    roomProps,
    notificationsMenuPosition,
    isActive,
    onNotificationsMenuOpenClick,
    onCloseNotificationsMenu,
}: Pick<
    RoomTileMenusProps,
    | "room"
    | "tag"
    | "isMinimized"
    | "roomProps"
    | "notificationsMenuPosition"
    | "isActive"
    | "onNotificationsMenuOpenClick"
    | "onCloseNotificationsMenu"
>): React.ReactElement | null {
    const showContextMenu =
        tag !== DefaultTagID.Invite &&
        room.getMyMembership() !== KnownMembership.Knock &&
        !isKnockDenied(room) &&
        shouldShowComponent(UIComponent.RoomOptionsMenu);

    if (MatrixClientPeg.safeGet().isGuest() || tag === DefaultTagID.Archived || !showContextMenu || isMinimized) {
        return null;
    }

    const state = roomProps.notificationVolume;
    const classes = classNames("mx_RoomTile_notificationsButton", {
        mx_RoomTile_notificationsButton_show: state === RoomNotifState.Mute,
    });

    return (
        <React.Fragment>
            <ContextMenuTooltipButton
                className={classes}
                onClick={onNotificationsMenuOpenClick}
                title={_t("room_list|notification_options")}
                isExpanded={!!notificationsMenuPosition}
                tabIndex={isActive ? 0 : -1}
            >
                {getNotificationIcon(state!)}
            </ContextMenuTooltipButton>
            {notificationsMenuPosition && (
                <RoomNotificationContextMenu
                    {...contextMenuBelow(notificationsMenuPosition)}
                    onFinished={onCloseNotificationsMenu}
                    room={room}
                />
            )}
        </React.Fragment>
    );
}

export function RoomTileGeneralMenu({
    room,
    tag,
    generalMenuPosition,
    onGeneralMenuOpenClick,
    onCloseGeneralMenu,
}: Pick<
    RoomTileMenusProps,
    "room" | "tag" | "generalMenuPosition" | "onGeneralMenuOpenClick" | "onCloseGeneralMenu"
>): React.ReactElement | null {
    const showContextMenu =
        tag !== DefaultTagID.Invite &&
        room.getMyMembership() !== KnownMembership.Knock &&
        !isKnockDenied(room) &&
        shouldShowComponent(UIComponent.RoomOptionsMenu);

    if (!showContextMenu) return null;

    return (
        <React.Fragment>
            <ContextMenuTooltipButton
                className="mx_RoomTile_menuButton"
                onClick={onGeneralMenuOpenClick}
                title={_t("room|context_menu|title")}
                isExpanded={!!generalMenuPosition}
            >
                <OverflowHorizontalIcon />
            </ContextMenuTooltipButton>
            {generalMenuPosition && (
                <RoomGeneralContextMenu
                    {...contextMenuBelow(generalMenuPosition)}
                    onFinished={onCloseGeneralMenu}
                    room={room}
                    onPostFavoriteClick={(ev: ButtonEvent) =>
                        PosthogTrackers.trackInteraction("WebRoomListRoomTileContextMenuFavouriteToggle", ev)
                    }
                    onPostInviteClick={(ev: ButtonEvent) =>
                        PosthogTrackers.trackInteraction("WebRoomListRoomTileContextMenuInviteItem", ev)
                    }
                    onPostSettingsClick={(ev: ButtonEvent) =>
                        PosthogTrackers.trackInteraction("WebRoomListRoomTileContextMenuSettingsItem", ev)
                    }
                    onPostLeaveClick={(ev: ButtonEvent) =>
                        PosthogTrackers.trackInteraction("WebRoomListRoomTileContextMenuLeaveItem", ev)
                    }
                    onPostMarkAsReadClick={(ev: ButtonEvent) =>
                        PosthogTrackers.trackInteraction("WebRoomListRoomTileContextMenuMarkRead", ev)
                    }
                    onPostMarkAsUnreadClick={(ev: ButtonEvent) =>
                        PosthogTrackers.trackInteraction("WebRoomListRoomTileContextMenuMarkUnread", ev)
                    }
                />
            )}
        </React.Fragment>
    );
}
