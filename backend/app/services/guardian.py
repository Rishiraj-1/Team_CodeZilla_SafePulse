"""
Anchor – Guardian System service layer.
"""

import uuid
from datetime import datetime, timezone
from typing import List

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import GuardianSession, GuardianSessionStatus, User, UserRole, Checkin
from app.schemas import GuardianSessionResponse, NearbyGuardianResponse
from app.utils import logger, point_to_wkt


async def request_guardian(
    user: User,
    lat: float,
    lng: float,
    db: AsyncSession,
) -> GuardianSession:
    """Create a new guardian request session."""
    session = GuardianSession(
        user_id=user.id,
        status=GuardianSessionStatus.REQUESTED,
        pickup_location=point_to_wkt(lat, lng),
    )
    db.add(session)
    await db.flush()
    logger.info(f"Anchor: Guardian requested by user {user.id}")
    return session


async def accept_session(
    guardian: User,
    session_id: uuid.UUID,
    db: AsyncSession,
) -> GuardianSession:
    """Guardian accepts a pending session."""
    session = await db.get(GuardianSession, session_id)
    if session is None:
        raise ValueError("Session not found")
    if session.status != GuardianSessionStatus.REQUESTED:
        raise ValueError(f"Session status is {session.status.value}, cannot accept")

    session.guardian_id = guardian.id
    session.status = GuardianSessionStatus.ACCEPTED
    session.start_time = datetime.now(timezone.utc)
    await db.flush()

    logger.info(f"Anchor: Session {session_id} accepted by guardian {guardian.id}")
    return session


async def complete_session(
    session_id: uuid.UUID,
    db: AsyncSession,
) -> GuardianSession:
    """Mark a guardian session as completed."""
    session = await db.get(GuardianSession, session_id)
    if session is None:
        raise ValueError("Session not found")

    session.status = GuardianSessionStatus.COMPLETED
    session.end_time = datetime.now(timezone.utc)
    await db.flush()

    logger.info(f"Anchor: Session {session_id} completed")
    return session


async def find_nearby_guardians(
    lat: float,
    lng: float,
    radius_m: float,
    db: AsyncSession,
) -> List[NearbyGuardianResponse]:
    """
    Find guardians who have a recent check-in within radius_m.
    Uses the latest check-in per guardian as their "current location".
    """
    # Sub-query: latest checkin per guardian
    latest_checkin = (
        select(
            Checkin.user_id,
            Checkin.location,
            func.row_number()
            .over(partition_by=Checkin.user_id, order_by=Checkin.timestamp.desc())
            .label("rn"),
        )
        .subquery()
    )

    stmt = (
        select(
            User.id,
            User.name,
            func.ST_Distance(
                latest_checkin.c.location,
                func.ST_GeogFromText(f"POINT({lng} {lat})"),
            ).label("distance_m"),
        )
        .join(latest_checkin, User.id == latest_checkin.c.user_id)
        .where(
            User.role == UserRole.GUARDIAN,
            latest_checkin.c.rn == 1,
            func.ST_DWithin(
                latest_checkin.c.location,
                func.ST_GeogFromText(f"POINT({lng} {lat})"),
                radius_m,
            ),
        )
        .order_by("distance_m")
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        NearbyGuardianResponse(id=r.id, name=r.name, distance_m=round(r.distance_m, 1))
        for r in rows
    ]


async def get_all_sessions(
    db: AsyncSession,
) -> List[GuardianSession]:
    """Admin: return all guardian sessions."""
    result = await db.execute(
        select(GuardianSession).order_by(GuardianSession.start_time.desc())
    )
    return result.scalars().all()
