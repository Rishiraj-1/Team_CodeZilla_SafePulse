"""
WebSocket connection manager for real-time features.

Channels:
  /ws/admin       – live reports, SOS alerts
  /ws/risk-updates – live risk zone changes
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
        self._guardian_connections: List[WebSocket] = []
        self._citizen_connections: List[WebSocket] = []

    # ── Admin channel ─────────────────────────────────
    async def connect_admin(self, ws: WebSocket) -> None:
        await ws.accept()
        self._admin_connections.append(ws)
        logger.info(f"WS: Admin client connected ({len(self._admin_connections)} total)")

    def disconnect_admin(self, ws: WebSocket) -> None:
        self._admin_connections.remove(ws)
        logger.info(f"WS: Admin client disconnected ({len(self._admin_connections)} total)")

    async def broadcast_admin(self, data: dict) -> None:
        """Send a JSON message to all admin WebSocket clients."""
        message = json.dumps(data)
        dead: List[WebSocket] = []
        for ws in self._admin_connections:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._admin_connections.remove(ws)

    # ── Risk update channel ───────────────────────────
    async def connect_risk(self, ws: WebSocket) -> None:
        await ws.accept()
        self._risk_connections.append(ws)
        logger.info(f"WS: Risk client connected ({len(self._risk_connections)} total)")

    def disconnect_risk(self, ws: WebSocket) -> None:
        self._risk_connections.remove(ws)
        logger.info(f"WS: Risk client disconnected ({len(self._risk_connections)} total)")

    async def broadcast_risk(self, data: dict) -> None:
        """Send a JSON message to all risk WebSocket clients."""
        message = json.dumps(data)
        dead: List[WebSocket] = []
        for ws in self._risk_connections:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._risk_connections.remove(ws)

    # ── Guardian channel ──────────────────────────────
    async def connect_guardian(self, ws: WebSocket) -> None:
        await ws.accept()
        self._guardian_connections.append(ws)
        logger.info(f"WS: Guardian client connected ({len(self._guardian_connections)} total)")

    def disconnect_guardian(self, ws: WebSocket) -> None:
        self._guardian_connections.remove(ws)
        logger.info(f"WS: Guardian client disconnected ({len(self._guardian_connections)} total)")

    async def broadcast_guardian(self, data: dict) -> None:
        """Send a JSON message to all guardian WebSocket clients."""
        message = json.dumps(data)
        dead: List[WebSocket] = []
        for ws in self._guardian_connections:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._guardian_connections.remove(ws)

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
        for ws in self._citizen_connections:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._citizen_connections.remove(ws)


# Singleton
ws_manager = WebSocketManager()
