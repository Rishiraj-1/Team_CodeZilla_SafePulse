"""
Failsafe – Geo-Filtered SOS Emergency Dispatch Service.

Flow:
  1. Store SOS event in DB.
  2. Find eligible guardians within 5 km (ON_DUTY, ONLINE, fresh location ≤ 60s).
  3. Insert guardian_alerts for each eligible guardian.
  4. Push targeted WebSocket alert to each guardian's dashboard.
  5. Send individual Telegram message to each guardian.
  6. Trigger escalation background task (30s → expand to 10 km + notify admin).
"""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Tuple

from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    GuardianAlert,
    GuardianAlertStatus,
    GuardianAvailabilityStatus,
    GuardianLocation,
    GuardianOnlineStatus,
    SOSEvent,
    SOSStatus,
    User,
    UserRole,
    UserStatus,
)
from app.services.telegram_bot import notify_admins, send_message
from app.services.websocket_manager import ws_manager
from app.utils import logger, point_to_wkt


# ── Helpers ───────────────────────────────────────────

async def _find_eligible_guardians(
    lat: float,
    lng: float,
    radius_m: float,
    db: AsyncSession,
) -> List[Tuple[User, float]]:
    """
    Return (User, distance_m) tuples for guardians that are:
      - Role: GUARDIAN
      - Status: ACTIVE
      - availability_status: ON_DUTY
      - online_status: ONLINE
      - guardian_locations.updated_at within last 60 seconds
      - Within radius_m metres of (lat, lng) using PostGIS ST_DWithin on GEOGRAPHY
    """
    freshness_cutoff = datetime.now(timezone.utc) - timedelta(seconds=60)

    stmt = text("""
        SELECT
            u.id,
            ST_Distance(
                gl.location,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
            ) AS distance_m
        FROM users u
        JOIN guardian_locations gl ON u.id = gl.guardian_id
        WHERE
            u.role            = 'GUARDIAN'
            AND u.status      = 'ACTIVE'
            AND u.availability_status = 'ON_DUTY'
            AND u.online_status       = 'ONLINE'
            AND gl.updated_at >= :cutoff
            AND ST_DWithin(
                gl.location,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                :radius_m
            )
        ORDER BY distance_m
    """)

    result = await db.execute(
        stmt,
        {"lat": lat, "lng": lng, "radius_m": radius_m, "cutoff": freshness_cutoff},
    )
    rows = result.fetchall()
    if not rows:
        return []

    guardian_ids = [row[0] for row in rows]
    dist_map = {row[0]: row[1] for row in rows}

    users_result = await db.execute(select(User).where(User.id.in_(guardian_ids)))
    users = {u.id: u for u in users_result.scalars().all()}

    return [(users[gid], dist_map[gid]) for gid in guardian_ids if gid in users]



async def _dispatch_to_guardians(
    guardians: List[Tuple[User, float]],
    sos: SOSEvent,
    citizen: User,
    db: AsyncSession,
    lat: float,
    lng: float,
) -> List[uuid.UUID]:
    """
    For each eligible guardian:
      - Insert guardian_alert row (status=NEW)
      - Push WebSocket alert to that guardian's dashboard
    Guardians do NOT receive Telegram — alerts go to the dashboard only.
    Telegram is reserved for officials/admins only.
    Returns list of guardian IDs alerted.
    """
    alerted: List[uuid.UUID] = []

    for guardian, distance_m in guardians:
        # Insert alert record
        alert = GuardianAlert(
            guardian_id=guardian.id,
            sos_id=sos.id,
            status=GuardianAlertStatus.NEW,
        )
        db.add(alert)
        await db.flush()

        dist_km = round(distance_m / 1000, 2)

        # WebSocket push to guardian dashboard (targeted, not broadcast)
        payload = {
            "type": "sos_alert",
            "alert_id": str(alert.id),
            "sos_id": str(sos.id),
            "citizen_id": str(citizen.id),
            "citizen_name": citizen.name,
            "lat": lat,
            "lng": lng,
            "distance_km": dist_km,
            "maps_url": f"https://maps.google.com/?q={lat},{lng}",
            "triggered_at": sos.triggered_at.isoformat() if sos.triggered_at else datetime.now(timezone.utc).isoformat(),
        }
        delivered = await ws_manager.send_guardian(str(guardian.id), payload)
        logger.info(f"SOS WS → guardian {guardian.id}: {'delivered' if delivered else 'not connected (will see on next poll)'}")

        alerted.append(guardian.id)

    return alerted


# ── Escalation ────────────────────────────────────────

async def _escalation_task(
    sos_id: uuid.UUID,
    lat: float,
    lng: float,
    db_factory,
) -> None:
    """
    Background task: wait 30s; if the SOS is still ACTIVE (not ASSIGNED),
    expand search to 10 km and notify the authority dashboard.
    """
    await asyncio.sleep(30)

    async with db_factory() as db:
        sos = await db.get(SOSEvent, sos_id)
        if sos is None or sos.status != SOSStatus.ACTIVE:
            return  # Already handled

        logger.warning(f"SOS {sos_id}: No guardian accepted in 30s → escalating to 10 km")

        # Find guardians at 10 km
        extended_guardians = await _find_eligible_guardians(lat, lng, 10_000, db)

        citizen_result = await db.execute(select(User).where(User.id == sos.user_id))
        citizen = citizen_result.scalar_one_or_none()

        if extended_guardians:
            await _dispatch_to_guardians(extended_guardians, sos, citizen, db, lat, lng)
            await db.commit()

        # Notify admin dashboard
        await ws_manager.broadcast_admin({
            "type": "sos_escalated",
            "sos_id": str(sos_id),
            "citizen_id": str(sos.user_id),
            "citizen_name": citizen.name if citizen else "Unknown",
            "lat": lat,
            "lng": lng,
            "new_radius_m": 10_000,
            "escalated_at": datetime.now(timezone.utc).isoformat(),
        })

        await notify_admins(
            f"⚠️ *SOS ESCALATED*\n"
            f"No guardian accepted within 30s.\n"
            f"SOS ID: `{sos_id}`\n"
            f"Location: https://maps.google.com/?q={lat},{lng}\n"
            f"Expanded search to 10 km."
        )


# ── Public API ────────────────────────────────────────

async def trigger_sos(
    user: User,
    lat: float,
    lng: float,
    db: AsyncSession,
) -> SOSEvent:
    """
    Full geo-filtered SOS dispatch:
      1. Store SOS event.
      2. Find eligible guardians within 5 km.
      3. Alert each guardian individually (WS + Telegram).
      4. Notify admin dashboard.
      5. Schedule 30-second escalation.
    """
    event = SOSEvent(
        user_id=user.id,
        location=point_to_wkt(lat, lng),
        status=SOSStatus.ACTIVE,
    )
    db.add(event)
    await db.flush()

    logger.warning(f"SOS triggered by user {user.id} at ({lat}, {lng}) → event {event.id}")

    # Find eligible guardians within 5 km
    guardians = await _find_eligible_guardians(lat, lng, 5_000, db)
    logger.info(f"SOS {event.id}: {len(guardians)} eligible guardians within 5 km")

    # Dispatch
    await _dispatch_to_guardians(guardians, event, user, db, lat, lng)

    # Always alert admin dashboard
    await ws_manager.broadcast_admin({
        "type": "sos_alert",
        "sos_id": str(event.id),
        "user_id": str(user.id),
        "user_name": user.name,
        "lat": lat,
        "lng": lng,
        "guardians_notified": len(guardians),
        "triggered_at": datetime.now(timezone.utc).isoformat(),
    })

    # Telegram alert to officials/admins — includes live location
    await notify_admins(
        f"🚨 *SOS ALERT — OFFICIAL NOTIFICATION*\n"
        f"👤 Citizen: *{user.name}*\n"
        f"📍 Location: https://maps.google.com/?q={lat},{lng}\n"
        f"🛡 Guardians notified: {len(guardians)}\n"
        f"🆔 SOS ID: `{event.id}`\n\n"
        f"Monitor the dashboard for real-time updates."
    )

    # Schedule escalation (non-blocking)
    from app.database.session import _get_session_factory
    db_factory = _get_session_factory()
    asyncio.create_task(_escalation_task(event.id, lat, lng, db_factory))

    return event


async def accept_sos_alert(
    alert_id: uuid.UUID,
    guardian: User,
    db: AsyncSession,
) -> SOSEvent:
    """
    Guardian accepts an SOS alert:
      1. Lock and update alert status → ACCEPTED.
      2. Update SOS event status → ASSIGNED.
      3. Delete all other pending alerts for the same SOS.
      4. Send Telegram confirmation to the accepting guardian.
    Uses a row-level DB lock to prevent race conditions.
    """
    # Lock the alert row first
    alert_result = await db.execute(
        select(GuardianAlert)
        .where(GuardianAlert.id == alert_id)
        .where(GuardianAlert.guardian_id == guardian.id)
        .where(GuardianAlert.status == GuardianAlertStatus.NEW)
        .with_for_update()
    )
    alert = alert_result.scalar_one_or_none()
    if alert is None:
        raise ValueError("Alert not found, already claimed, or not yours.")

    sos_result = await db.execute(
        select(SOSEvent)
        .where(SOSEvent.id == alert.sos_id)
        .where(SOSEvent.status == SOSStatus.ACTIVE)
        .with_for_update()
    )
    sos = sos_result.scalar_one_or_none()
    if sos is None:
        raise ValueError("SOS event not found or already assigned.")

    # Mark this alert accepted
    alert.status = GuardianAlertStatus.ACCEPTED

    # Assign the SOS
    sos.status = SOSStatus.ASSIGNED

    # Remove all other pending alerts for this SOS
    await db.execute(
        delete(GuardianAlert).where(
            GuardianAlert.sos_id == sos.id,
            GuardianAlert.id != alert_id,
            GuardianAlert.status == GuardianAlertStatus.NEW,
        )
    )

    await db.flush()

    logger.info(f"SOS {sos.id} accepted by guardian {guardian.id}")

    # Notify admin via WebSocket
    await ws_manager.broadcast_admin({
        "type": "sos_accepted",
        "sos_id": str(sos.id),
        "guardian_id": str(guardian.id),
        "guardian_name": guardian.name,
        "accepted_at": datetime.now(timezone.utc).isoformat(),
    })

    # Telegram to officials: confirm guardian is responding
    await notify_admins(
        f"✅ *SOS Assigned*\n"
        f"Guardian *{guardian.name}* is responding to SOS `{sos.id}`."
    )

    return sos


async def decline_sos_alert(
    alert_id: uuid.UUID,
    guardian: User,
    db: AsyncSession,
) -> None:
    """Guardian declines an SOS alert."""
    alert_result = await db.execute(
        select(GuardianAlert)
        .where(GuardianAlert.id == alert_id)
        .where(GuardianAlert.guardian_id == guardian.id)
        .where(GuardianAlert.status == GuardianAlertStatus.NEW)
    )
    alert = alert_result.scalar_one_or_none()
    if alert is None:
        raise ValueError("Alert not found or already responded to.")

    alert.status = GuardianAlertStatus.DECLINED
    await db.flush()
    logger.info(f"Alert {alert_id} declined by guardian {guardian.id}")


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

    logger.info(f"SOS {sos_id} resolved")

    await ws_manager.broadcast_admin({"type": "sos_resolved", "sos_id": str(sos_id)})
    await ws_manager.broadcast_guardian({"type": "sos_resolved", "sos_id": str(sos_id)})

    return event
