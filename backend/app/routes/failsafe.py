"""
Failsafe – SOS emergency routes + guardian location heartbeat.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import _get_current_user, require_role
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
)
from app.schemas import SOSResolve, SOSResponse, SOSTrigger
from app.services.sos import accept_sos_alert, decline_sos_alert, resolve_sos, trigger_sos
from app.utils import logger, point_to_wkt

router = APIRouter(prefix="/sos", tags=["Failsafe – SOS"])


# ── SOS trigger ──────────────────────────────────────────────────────────────
@router.post("/trigger", response_model=SOSResponse, status_code=status.HTTP_201_CREATED)
async def sos_trigger_route(
    payload: SOSTrigger,
    user: User = Depends(_get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger an SOS emergency event (geo-filtered guardian dispatch)."""
    event = await trigger_sos(user, payload.lat, payload.lng, db)
    await db.commit()
    return SOSResponse(
        id=event.id,
        user_id=event.user_id,
        status=event.status,
        triggered_at=event.triggered_at,
        resolved_at=event.resolved_at,
    )


# ── SOS resolve ───────────────────────────────────────────────────────────────
@router.post("/resolve", response_model=SOSResponse)
async def sos_resolve_route(
    payload: SOSResolve,
    user: User = Depends(_get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Resolve an active SOS event."""
    try:
        event = await resolve_sos(payload.sos_id, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    await db.commit()
    return SOSResponse(
        id=event.id,
        user_id=event.user_id,
        status=event.status,
        triggered_at=event.triggered_at,
        resolved_at=event.resolved_at,
    )


# ── Guardian: SOS accept ──────────────────────────────────────────────────────
@router.post("/alert/{alert_id}/accept")
async def accept_sos_alert_route(
    alert_id: uuid.UUID,
    guardian: User = Depends(require_role(UserRole.GUARDIAN, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Guardian accepts a SOS alert. Locks assignment — only one guardian can claim."""
    try:
        sos = await accept_sos_alert(alert_id, guardian, db)
        await db.commit()
        return {"message": "SOS accepted", "sos_id": str(sos.id), "status": sos.status.value}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


# ── Guardian: SOS decline ─────────────────────────────────────────────────────
@router.post("/alert/{alert_id}/decline")
async def decline_sos_alert_route(
    alert_id: uuid.UUID,
    guardian: User = Depends(require_role(UserRole.GUARDIAN, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Guardian declines their SOS alert."""
    try:
        await decline_sos_alert(alert_id, guardian, db)
        await db.commit()
        return {"message": "Alert declined"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ── Guardian: location heartbeat ─────────────────────────────────────────────
@router.post("/guardian/location")
async def update_guardian_location(
    payload: SOSTrigger,  # reuses lat/lng fields
    guardian: User = Depends(require_role(UserRole.GUARDIAN, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """
    Guardian location heartbeat — upsert guardian_locations.
    Frontend should call this every ~30 seconds while the guardian is on duty.
    """
    result = await db.execute(
        select(GuardianLocation).where(GuardianLocation.guardian_id == guardian.id)
    )
    loc = result.scalar_one_or_none()

    if loc:
        loc.location = point_to_wkt(payload.lat, payload.lng)
        # updated_at will auto-update via onupdate
    else:
        loc = GuardianLocation(
            guardian_id=guardian.id,
            location=point_to_wkt(payload.lat, payload.lng),
        )
        db.add(loc)

    await db.commit()
    return {"message": "Location updated", "lat": payload.lat, "lng": payload.lng}


# ── Guardian: update duty/online status ──────────────────────────────────────
@router.post("/guardian/status")
async def update_guardian_status(
    availability: str,
    online: str,
    guardian: User = Depends(require_role(UserRole.GUARDIAN, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a guardian's availability and online status.
    availability: ON_DUTY | OFF_DUTY
    online: ONLINE | OFFLINE
    """
    try:
        guardian.availability_status = GuardianAvailabilityStatus(availability)
        guardian.online_status = GuardianOnlineStatus(online)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid status value: {e}")

    await db.commit()
    return {
        "message": "Status updated",
        "availability_status": guardian.availability_status.value,
        "online_status": guardian.online_status.value,
    }


# ── Guardian: my active alerts ────────────────────────────────────────────────
@router.get("/guardian/alerts")
async def get_my_alerts(
    guardian: User = Depends(require_role(UserRole.GUARDIAN, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Return a guardian's NEW alerts so they can be shown on the dashboard."""
    result = await db.execute(
        select(GuardianAlert, SOSEvent)
        .join(SOSEvent, GuardianAlert.sos_id == SOSEvent.id)
        .where(
            GuardianAlert.guardian_id == guardian.id,
            GuardianAlert.status == GuardianAlertStatus.NEW,
        )
        .order_by(GuardianAlert.created_at.desc())
    )
    rows = result.all()

    alerts = []
    for alert, sos in rows:
        alerts.append({
            "alert_id": str(alert.id),
            "sos_id": str(sos.id),
            "citizen_id": str(sos.user_id),
            "status": alert.status.value,
            "created_at": alert.created_at.isoformat(),
        })

    return {"alerts": alerts}
