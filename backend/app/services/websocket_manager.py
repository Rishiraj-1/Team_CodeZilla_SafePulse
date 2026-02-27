"""
WebSocket connection manager for real-time features.

Channels:
  /ws/admin              – live reports, SOS alerts (admin dashboard)
  /ws/risk-updates       – live risk zone changes
  /ws/guardian/{id}      – per-guardian targeted SOS alerts
  /ws/citizen            – citizen feed
"""

import json
from typing import Dict, List

from fastapi import WebSocket

from app.utils import logger


class WebSocketManager:
    """Manages active WebSocket connections across channels."""

    def __init__(self):
        self._admin_connections: List[WebSocket] = []
        self._risk_connections: List[WebSocket] = []
        # Per-guardian connections: guardian_id (str) → WebSocket
        self._guardian_connections: Dict[str, WebSocket] = {}
        self._citizen_connections: List[WebSocket] = []

    # ── Admin channel ─────────────────────────────────
    async def connect_admin(self, ws: WebSocket) -> None:
        await ws.accept()
        self._admin_connections.append(ws)
        logger.info(f"WS: Admin client connected ({len(self._admin_connections)} total)")

    def disconnect_admin(self, ws: WebSocket) -> None:
        if ws in self._admin_connections:
            self._admin_connections.remove(ws)
        logger.info(f"WS: Admin client disconnected ({len(self._admin_connections)} total)")

    async def broadcast_admin(self, data: dict) -> None:
        """Send a JSON message to all admin WebSocket clients."""
        message = json.dumps(data)
        dead: List[WebSocket] = []
        for ws in list(self._admin_connections):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            if ws in self._admin_connections:
                self._admin_connections.remove(ws)

    # ── Risk update channel ───────────────────────────
    async def connect_risk(self, ws: WebSocket) -> None:
        await ws.accept()
        self._risk_connections.append(ws)
        logger.info(f"WS: Risk client connected ({len(self._risk_connections)} total)")

    def disconnect_risk(self, ws: WebSocket) -> None:
        if ws in self._risk_connections:
            self._risk_connections.remove(ws)
        logger.info(f"WS: Risk client disconnected ({len(self._risk_connections)} total)")

    async def broadcast_risk(self, data: dict) -> None:
        """Send a JSON message to all risk WebSocket clients."""
        message = json.dumps(data)
        dead: List[WebSocket] = []
        for ws in list(self._risk_connections):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            if ws in self._risk_connections:
                self._risk_connections.remove(ws)

    # ── Per-guardian targeted channel ─────────────────
    async def connect_guardian(self, guardian_id: str, ws: WebSocket) -> None:
        """Register a guardian's personal WebSocket connection."""
        await ws.accept()
        self._guardian_connections[guardian_id] = ws
        logger.info(f"WS: Guardian {guardian_id} connected ({len(self._guardian_connections)} online)")

    def disconnect_guardian(self, guardian_id: str) -> None:
        self._guardian_connections.pop(guardian_id, None)
        logger.info(f"WS: Guardian {guardian_id} disconnected ({len(self._guardian_connections)} online)")

    async def send_guardian(self, guardian_id: str, data: dict) -> bool:
        """Send a targeted JSON message to a specific guardian by ID.

        Returns True if delivered, False if the guardian isn't connected.
        """
        ws = self._guardian_connections.get(guardian_id)
        if ws is None:
            return False
        try:
            await ws.send_text(json.dumps(data))
            return True
        except Exception:
            self._guardian_connections.pop(guardian_id, None)
            return False

    def is_guardian_online(self, guardian_id: str) -> bool:
        """Check whether a guardian has an active WS connection."""
        return guardian_id in self._guardian_connections

    async def broadcast_guardian(self, data: dict) -> None:
        """Broadcast to ALL connected guardians (e.g. sos_resolved events)."""
        message = json.dumps(data)
        dead: List[str] = []
        for gid, ws in list(self._guardian_connections.items()):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(gid)
        for gid in dead:
            self._guardian_connections.pop(gid, None)

    # ── Citizen channel ───────────────────────────────
    async def connect_citizen(self, ws: WebSocket) -> None:
        await ws.accept()
        self._citizen_connections.append(ws)
        logger.info(f"WS: Citizen client connected ({len(self._citizen_connections)} total)")

    def disconnect_citizen(self, ws: WebSocket) -> None:
        if ws in self._citizen_connections:
            self._citizen_connections.remove(ws)
            logger.info(f"WS: Citizen client disconnected ({len(self._citizen_connections)} total)")

    async def broadcast_citizen(self, data: dict) -> None:
        """Send a JSON message to all citizen WebSocket clients."""
        message = json.dumps(data)
        dead: List[WebSocket] = []
        for ws in list(self._citizen_connections):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            if ws in self._citizen_connections:
                self._citizen_connections.remove(ws)


# Singleton
ws_manager = WebSocketManager()
