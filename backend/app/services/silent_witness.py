"""
Silent Witness – Passive Safety Monitoring service.

Handles periodic check-ins and detects:
  1. Missed check-ins (timeout)
  2. User entering a high-risk zone
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import get_settings
from app.models import Checkin, RiskZone, User
from app.utils import logger, point_to_wkt

settings = get_settings()


async def record_checkin(
    user: User,
    lat: float,
    lng: float,
    db: AsyncSession,
) -> tuple:
    """
    Record a check-in and return (checkin, alert_message | None).
    Alert is set if the user is inside an active risk zone.
    """
    checkin = Checkin(
        user_id=user.id,
        location=point_to_wkt(lat, lng),
    )
    db.add(checkin)
    await db.flush()

    # Check if the user is inside an active risk zone
    alert = await _check_risk_zone(lat, lng, db)

    logger.info(
        f"SilentWitness: Checkin from user {user.id} – alert={'YES' if alert else 'NO'}"
    )
    return checkin, alert


async def _check_risk_zone(
    lat: float,
    lng: float,
    db: AsyncSession,
) -> Optional[str]:
    """Return an alert message if the point is inside any active risk zone."""
    stmt = select(RiskZone).where(
        RiskZone.active == True,  # noqa: E712
        func.ST_DWithin(
            RiskZone.centroid,
            func.ST_GeogFromText(f"POINT({lng} {lat})"),
            200,  # within 200 m of a risk zone centroid
        ),
    )
    result = await db.execute(stmt)
    zone = result.scalar_one_or_none()

    if zone:
        return (
            f"⚠️ You are near a high-risk zone (score {zone.risk_score}). "
            "Please stay alert and consider changing your route."
        )
    return None


async def check_overdue_users(db: AsyncSession) -> list[dict]:
    """
    Background task: find users whose last check-in is older
    than the configured timeout.  Returns list of alert dicts.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(
        minutes=settings.CHECKIN_TIMEOUT_MINUTES
    )

    # Latest checkin per user
    latest = (
        select(
            Checkin.user_id,
            func.max(Checkin.timestamp).label("last_ts"),
        )
        .group_by(Checkin.user_id)
        .subquery()
    )

    stmt = (
        select(User.id, User.name, latest.c.last_ts)
        .join(latest, User.id == latest.c.user_id)
        .where(latest.c.last_ts < cutoff)
    )
    result = await db.execute(stmt)
    overdue = result.all()

    alerts = []
    for row in overdue:
        logger.warning(f"SilentWitness: User {row.name} (id={row.id}) is overdue")
        alerts.append({
            "user_id": str(row.id),
            "user_name": row.name,
            "last_checkin": row.last_ts.isoformat() if row.last_ts else None,
        })

    return alerts
