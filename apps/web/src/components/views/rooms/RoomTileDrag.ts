/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

/**
 * Sets a styled drag image on a drag event showing the room name.
 */
export function setRoomDragImage(e: React.DragEvent<HTMLDivElement>, roomName: string): void {
    const dragImage = document.createElement("div");
    dragImage.textContent = roomName;
    dragImage.style.cssText = [
        "position:fixed",
        "top:-9999px",
        "left:-9999px",
        "padding:6px 12px",
        "background:rgba(30,34,42,0.95)",
        "color:#e3e8f0",
        "border:1px solid rgba(99,102,241,0.6)",
        "border-radius:6px",
        "font-size:13px",
        "font-weight:600",
        "pointer-events:none",
        "white-space:nowrap",
        "box-shadow:0 4px 12px rgba(0,0,0,0.4)",
        "z-index:9999",
    ].join(";");
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, dragImage.offsetWidth / 2, dragImage.offsetHeight / 2);
    setTimeout(() => dragImage.remove(), 0);
}
