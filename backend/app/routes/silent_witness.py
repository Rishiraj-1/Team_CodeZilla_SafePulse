"""
Silent Witness – Check-in routes.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import _get_current_user
from app.models import User
from app.schemas import CheckinCreate, CheckinResponse
from app.services.silent_witness import record_checkin

router = APIRouter(prefix="/checkin", tags=["Silent Witness"])


@router.post("/", response_model=CheckinResponse, status_code=status.HTTP_201_CREATED)
async def post_checkin(
    payload: CheckinCreate,
    user: User = Depends(_get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a periodic safety check-in."""
    checkin, alert = await record_checkin(user, payload.lat, payload.lng, db)
    return CheckinResponse(
        id=checkin.id,
        user_id=checkin.user_id,
        timestamp=checkin.timestamp,
        alert=alert,
    )
