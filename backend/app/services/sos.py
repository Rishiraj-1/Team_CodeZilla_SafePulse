"""
Failsafe – SOS Emergency Escalation service.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SOSEvent, SOSStatus, User
from app.services.telegram_bot import notify_admins
from app.services.websocket_manager import ws_manager
from app.utils import logger, point_to_wkt


async def trigger_sos(
    user: User,
    lat: float,
    lng: float,
    db: AsyncSession,
) -> SOSEvent:
    """
    Create an SOS event, notify guardians via Telegram,
    and push to admin WebSocket.
    """
    event = SOSEvent(
        user_id=user.id,
        location=point_to_wkt(lat, lng),
        status=SOSStatus.ACTIVE,
    )
    db.add(event)
    await db.flush()

    logger.warning(f"Failsafe: SOS triggered by user {user.id} at ({lat}, {lng})")

    # Telegram notification (fire-and-forget)
    await notify_admins(
        f"🚨 *SOS ALERT*\n"
        f"User: {user.name}\n"
        f"Location: ({lat}, {lng})\n"
        f"Maps: https://maps.google.com/?q={lat},{lng}"
    )

    # WebSocket push to admin dashboard
    await ws_manager.broadcast_admin({
        "type": "sos_alert",
        "sos_id": str(event.id),
        "user_id": str(user.id),
        "user_name": user.name,
        "lat": lat,
        "lng": lng,
        "triggered_at": datetime.now(timezone.utc).isoformat(),
    })

    # WebSocket push to guardian dashboard
    await ws_manager.broadcast_guardian({
        "type": "sos_alert",
        "sos_id": str(event.id),
        "user_id": str(user.id),
        "user_name": user.name,
        "lat": lat,
        "lng": lng,
        "triggered_at": datetime.now(timezone.utc).isoformat(),
    })

    return event


async def resolve_sos(
    sos_id: uuid.UUID,
    db: AsyncSession,
) -> SOSEvent:
    """Mark an SOS event as resolved."""
    event = await db.get(SOSEvent, sos_id)
    if event is None:
        raise ValueError("SOS event not found")

    event.status = SOSStatus.RESOLVED
    event.resolved_at = datetime.now(timezone.utc)
    await db.flush()

    logger.info(f"Failsafe: SOS {sos_id} resolved")

    await ws_manager.broadcast_admin({
        "type": "sos_resolved",
        "sos_id": str(sos_id),
    })

    await ws_manager.broadcast_guardian({
        "type": "sos_resolved",
        "sos_id": str(sos_id),
    })

    return event
