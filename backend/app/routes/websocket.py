"""
WebSocket routes for real-time features.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.websocket_manager import ws_manager

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/admin")
async def ws_admin(ws: WebSocket):
    """
    Admin dashboard live feed.
    Receives: new reports, SOS alerts, zone updates.
    """
    await ws_manager.connect_admin(ws)
    try:
        while True:
            # Keep connection alive; client can send pings
            await ws.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_admin(ws)


@router.websocket("/ws/risk-updates")
async def ws_risk_updates(ws: WebSocket):
    """
    Live risk zone update feed.
    Broadcasts whenever clusters are recalculated.
    """
    await ws_manager.connect_risk(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_risk(ws)


@router.websocket("/ws/guardian")
async def ws_guardian(ws: WebSocket):
    """
    Live SOS alerts feed for guardians.
    """
    await ws_manager.connect_guardian(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_guardian(ws)


@router.websocket("/ws/citizen")
async def ws_citizen(ws: WebSocket):
    """
    Live feed for citizens (e.g., guardian accepted request).
    """
    await ws_manager.connect_citizen(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_citizen(ws)
