/*
Copyright 2024 New Vector Ltd.
Copyright 2018 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2015-2017 , 2019-2021 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { createRef } from "react";
import { type Room, RoomEvent } from "matrix-js-sdk/src/matrix";
import { ChevronFace, type MenuProps } from "../../structures/ContextMenu";
import { DefaultTagID, type TagID } from "../../../stores/room-list-v3/skip-list/tag";
import { type MessagePreview, MessagePreviewStore } from "../../../stores/message-preview";
import { type ButtonEvent } from "../../views/elements/AccessibleButton";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import { type ActionPayload } from "../../../dispatcher/payloads";
import { type ViewRoomPayload } from "../../../dispatcher/payloads/ViewRoomPayload";
import { KeyBindingAction } from "../../../accessibility/KeyboardShortcuts";
import { getKeyBindingsManager } from "../../../KeyBindingsManager";
import { RoomNotificationStateStore } from "../../../stores/notifications/RoomNotificationStateStore";
import { type NotificationState, NotificationStateEvents } from "../../../stores/notifications/NotificationState";
import { EchoChamber } from "../../../stores/local-echo/EchoChamber";
import { CachedRoomKey, type RoomEchoChamber } from "../../../stores/local-echo/RoomEchoChamber";
import { PROPERTY_UPDATED } from "../../../stores/local-echo/GenericEchoChamber";
import PosthogTrackers from "../../../PosthogTrackers";
import { CallStore, CallStoreEvent } from "../../../stores/CallStore";
import { SdkContextClass } from "../../../contexts/SDKContext";
import { shouldShowComponent } from "../../../customisations/helpers/UIComponents";
import { UIComponent } from "../../../settings/UIFeature";
import { isKnockDenied } from "../../../utils/membership";
import { KnownMembership } from "matrix-js-sdk/src/types";
import type { Call } from "../../../models/Call";
import { setRoomDragImage } from "./RoomTileDrag";
import { RoomTileInner } from "./RoomTileInner";

interface Props {
    room: Room;
    showMessagePreview: boolean;
    isMinimized: boolean;
    tag: TagID;
}

type PartialDOMRect = Pick<DOMRect, "left" | "bottom">;

interface State {
    selected: boolean;
    notificationsMenuPosition: PartialDOMRect | null;
    generalMenuPosition: PartialDOMRect | null;
    call: Call | null;
    messagePreview: MessagePreview | null;
}

export const contextMenuBelow = (elementRect: PartialDOMRect): MenuProps => {
    const left = elementRect.left + window.scrollX - 9;
    const top = elementRect.bottom + window.scrollY + 17;
    const chevronFace = ChevronFace.None;
    return { left, top, chevronFace };
};

class RoomTile extends React.PureComponent<Props, State> {
    private dispatcherRef?: string;
    private roomTileRef = createRef<HTMLDivElement>();
    private notificationState: NotificationState;
    private roomProps: RoomEchoChamber;

    public constructor(props: Props) {
        super(props);
        this.state = {
            selected: SdkContextClass.instance.roomViewStore.getRoomId() === props.room.roomId,
            notificationsMenuPosition: null,
            generalMenuPosition: null,
            call: CallStore.instance.getCall(props.room.roomId),
            messagePreview: null,
        };
        this.notificationState = RoomNotificationStateStore.instance.getRoomState(props.room);
        this.roomProps = EchoChamber.forRoom(props.room);
    }

    private get showContextMenu(): boolean {
        return (
            this.props.tag !== DefaultTagID.Invite &&
            this.props.room.getMyMembership() !== KnownMembership.Knock &&
            !isKnockDenied(this.props.room) &&
            shouldShowComponent(UIComponent.RoomOptionsMenu)
        );
    }

    private get showMessagePreview(): boolean {
        return !this.props.isMinimized && this.props.showMessagePreview;
    }

    public componentDidUpdate(prevProps: Readonly<Props>): void {
        if (prevProps.showMessagePreview !== this.props.showMessagePreview ||
            prevProps.isMinimized !== this.props.isMinimized) {
            this.generatePreview();
        }
        if (prevProps.room?.roomId !== this.props.room?.roomId) {
            MessagePreviewStore.instance.off(MessagePreviewStore.getPreviewChangedEventName(prevProps.room), this.onRoomPreviewChanged);
            MessagePreviewStore.instance.on(MessagePreviewStore.getPreviewChangedEventName(this.props.room), this.onRoomPreviewChanged);
            prevProps.room?.off(RoomEvent.Name, this.onRoomNameUpdate);
            this.props.room?.on(RoomEvent.Name, this.onRoomNameUpdate);
        }
    }

    public componentDidMount(): void {
        this.generatePreview();
        if (this.state.selected) this.scrollIntoView();
        SdkContextClass.instance.roomViewStore.addRoomListener(this.props.room.roomId, this.onActiveRoomUpdate);
        this.dispatcherRef = defaultDispatcher.register(this.onAction);
        MessagePreviewStore.instance.on(MessagePreviewStore.getPreviewChangedEventName(this.props.room), this.onRoomPreviewChanged);
        this.notificationState.on(NotificationStateEvents.Update, this.onNotificationUpdate);
        this.roomProps.on(PROPERTY_UPDATED, this.onRoomPropertyUpdate);
        this.props.room.on(RoomEvent.Name, this.onRoomNameUpdate);
        CallStore.instance.on(CallStoreEvent.Call, this.onCallChanged);
        this.setState({ call: CallStore.instance.getCall(this.props.room.roomId) });
    }

    public componentWillUnmount(): void {
        SdkContextClass.instance.roomViewStore.removeRoomListener(this.props.room.roomId, this.onActiveRoomUpdate);
        MessagePreviewStore.instance.off(MessagePreviewStore.getPreviewChangedEventName(this.props.room), this.onRoomPreviewChanged);
        this.props.room.off(RoomEvent.Name, this.onRoomNameUpdate);
        defaultDispatcher.unregister(this.dispatcherRef);
        this.notificationState.off(NotificationStateEvents.Update, this.onNotificationUpdate);
        this.roomProps.off(PROPERTY_UPDATED, this.onRoomPropertyUpdate);
        CallStore.instance.off(CallStoreEvent.Call, this.onCallChanged);
    }

    private onRoomNameUpdate = (): void => { this.forceUpdate(); };
    private onNotificationUpdate = (): void => { this.forceUpdate(); };
    private onRoomPropertyUpdate = (property: CachedRoomKey): void => {
        if (property === CachedRoomKey.NotificationVolume) this.onNotificationUpdate();
    };
    private onAction = (payload: ActionPayload): void => {
        if (payload.action === Action.ViewRoom && payload.room_id === this.props.room.roomId && payload.show_room_tile) {
            setTimeout(() => this.scrollIntoView());
        }
    };
    private onRoomPreviewChanged = (room: Room): void => {
        if (this.props.room && room.roomId === this.props.room.roomId) this.generatePreview();
    };
    private onCallChanged = (call: Call, roomId: string): void => {
        if (roomId === this.props.room?.roomId) this.setState({ call });
    };
    private async generatePreview(): Promise<void> {
        if (!this.showMessagePreview) return;
        const messagePreview = (await MessagePreviewStore.instance.getPreviewForRoom(this.props.room, this.props.tag)) ?? null;
        this.setState({ messagePreview });
    }
    private scrollIntoView = (): void => {
        this.roomTileRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
    };
    private onTileClick = async (ev: ButtonEvent): Promise<void> => {
        ev.preventDefault();
        ev.stopPropagation();
        const action = getKeyBindingsManager().getAccessibilityAction(ev as React.KeyboardEvent);
        const clearSearch = ([KeyBindingAction.Enter, KeyBindingAction.Space] as Array<string | undefined>).includes(action);
        defaultDispatcher.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            show_room_tile: true,
            room_id: this.props.room.roomId,
            clear_search: clearSearch,
            metricsTrigger: "RoomList",
            metricsViaKeyboard: ev.type !== "click",
        });
    };
    private onActiveRoomUpdate = (isActive: boolean): void => { this.setState({ selected: isActive }); };
    private onNotificationsMenuOpenClick = (ev: ButtonEvent): void => {
        ev.preventDefault();
        ev.stopPropagation();
        this.setState({ notificationsMenuPosition: (ev.target as HTMLButtonElement).getBoundingClientRect() });
        PosthogTrackers.trackInteraction("WebRoomListRoomTileNotificationsMenu", ev);
    };
    private onCloseNotificationsMenu = (): void => { this.setState({ notificationsMenuPosition: null }); };
    private onGeneralMenuOpenClick = (ev: ButtonEvent): void => {
        ev.preventDefault();
        ev.stopPropagation();
        this.setState({ generalMenuPosition: (ev.target as HTMLButtonElement).getBoundingClientRect() });
    };
    private onContextMenu = (ev: React.MouseEvent): void => {
        if (!this.showContextMenu) return;
        ev.preventDefault();
        ev.stopPropagation();
        this.setState({ generalMenuPosition: { left: ev.clientX, bottom: ev.clientY } });
    };
    private onCloseGeneralMenu = (): void => { this.setState({ generalMenuPosition: null }); };
    private onDragStart = (e: React.DragEvent<HTMLDivElement>): void => {
        e.dataTransfer.setData("text/x-room-id", this.props.room.roomId);
        e.dataTransfer.effectAllowed = "link";
        setRoomDragImage(e, this.props.room.name ?? this.props.room.roomId);
    };

    public render(): React.ReactElement {
        return (
            <React.Fragment>
                <RoomTileInner
                    room={this.props.room}
                    tag={this.props.tag}
                    isMinimized={this.props.isMinimized}
                    showMessagePreview={this.props.showMessagePreview}
                    selected={this.state.selected}
                    call={this.state.call}
                    messagePreview={this.state.messagePreview}
                    notificationState={this.notificationState}
                    roomProps={this.roomProps}
                    notificationsMenuPosition={this.state.notificationsMenuPosition}
                    generalMenuPosition={this.state.generalMenuPosition}
                    roomTileRef={this.roomTileRef}
                    onTileClick={this.onTileClick}
                    onContextMenu={this.onContextMenu}
                    onDragStart={this.onDragStart}
                    onNotificationsMenuOpenClick={this.onNotificationsMenuOpenClick}
                    onCloseNotificationsMenu={this.onCloseNotificationsMenu}
                    onGeneralMenuOpenClick={this.onGeneralMenuOpenClick}
                    onCloseGeneralMenu={this.onCloseGeneralMenu}
                    onFocusRovingTab={() => {}}
                />
            </React.Fragment>
        );
    }
}

export default RoomTile;
