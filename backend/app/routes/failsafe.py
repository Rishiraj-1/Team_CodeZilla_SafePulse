"""
Failsafe – SOS emergency routes.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import _get_current_user
from app.models import User
from app.schemas import SOSResolve, SOSResponse, SOSTrigger
from app.services.sos import resolve_sos, trigger_sos

router = APIRouter(prefix="/sos", tags=["Failsafe – SOS"])


@router.post("/trigger", response_model=SOSResponse, status_code=status.HTTP_201_CREATED)
async def sos_trigger_route(
    payload: SOSTrigger,
    user: User = Depends(_get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger an SOS emergency event."""
    event = await trigger_sos(user, payload.lat, payload.lng, db)
    return SOSResponse(
        id=event.id,
        user_id=event.user_id,
        status=event.status,
        triggered_at=event.triggered_at,
        resolved_at=event.resolved_at,
    )


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

    return SOSResponse(
        id=event.id,
        user_id=event.user_id,
        status=event.status,
        triggered_at=event.triggered_at,
        resolved_at=event.resolved_at,
    )
