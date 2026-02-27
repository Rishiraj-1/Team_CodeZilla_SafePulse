"""
Anchor – Guardian system routes.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import _get_current_user, require_role
from app.models import User, UserRole
from app.schemas import (
    GuardianAccept,
    GuardianRequest,
    GuardianSessionResponse,
    NearbyGuardianResponse,
)
from app.services.guardian import (
    accept_session,
    complete_session,
    find_nearby_guardians,
    get_all_sessions,
    request_guardian,
)

router = APIRouter(prefix="/guardian", tags=["Anchor – Guardian"])


@router.post("/request", response_model=GuardianSessionResponse, status_code=status.HTTP_201_CREATED)
async def request_guardian_route(
    payload: GuardianRequest,
    user: User = Depends(_get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Request a guardian escort."""
    session = await request_guardian(user, payload.lat, payload.lng, db)
    return GuardianSessionResponse(
        id=session.id,
        user_id=session.user_id,
        guardian_id=session.guardian_id,
        status=session.status,
        start_time=session.start_time,
        end_time=session.end_time,
    )


@router.post("/accept", response_model=GuardianSessionResponse)
async def accept_guardian_route(
    payload: GuardianAccept,
    guardian: User = Depends(require_role(UserRole.GUARDIAN, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Guardian accepts a pending session."""
    try:
        session = await accept_session(guardian, payload.session_id, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return GuardianSessionResponse(
        id=session.id,
        user_id=session.user_id,
        guardian_id=session.guardian_id,
        status=session.status,
        start_time=session.start_time,
        end_time=session.end_time,
    )


@router.post("/complete", response_model=GuardianSessionResponse)
async def complete_guardian_route(
    payload: GuardianAccept,  # reuses session_id field
    user: User = Depends(_get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a guardian session as completed."""
    try:
        session = await complete_session(payload.session_id, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return GuardianSessionResponse(
        id=session.id,
        user_id=session.user_id,
        guardian_id=session.guardian_id,
        status=session.status,
        start_time=session.start_time,
        end_time=session.end_time,
    )


@router.get("/nearby", response_model=list[NearbyGuardianResponse])
async def nearby_guardians_route(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius: float = Query(2000, gt=0, description="Search radius in meters"),
    db: AsyncSession = Depends(get_db),
):
    """Find guardians near a given location."""
    return await find_nearby_guardians(lat, lng, radius, db)


# ── Admin ─────────────────────────────────────────────
@router.get(
    "/admin/sessions",
    response_model=list[GuardianSessionResponse],
    tags=["Admin"],
)
async def admin_guardian_sessions(
    user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Admin: view all guardian sessions."""
    sessions = await get_all_sessions(db)
    return [
        GuardianSessionResponse(
            id=s.id,
            user_id=s.user_id,
            guardian_id=s.guardian_id,
            status=s.status,
            start_time=s.start_time,
            end_time=s.end_time,
        )
        for s in sessions
    ]
