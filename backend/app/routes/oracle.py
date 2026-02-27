"""
Oracle – Risk Zone & Report routes.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import _get_current_user
from app.models import Report, RiskZone, User
from app.schemas import ReportCreate, ReportResponse, RiskZoneResponse
from app.services.risk_engine import run_clustering
from app.services.websocket_manager import ws_manager
from app.utils import logger, point_to_wkt

router = APIRouter(tags=["Oracle"])


# ── Reports ───────────────────────────────────────────
@router.post("/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    payload: ReportCreate,
    user: User = Depends(_get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a new safety report."""
    report = Report(
        user_id=user.id,
        location=point_to_wkt(payload.lat, payload.lng),
        category=payload.category,
        description=payload.description,
    )
    db.add(report)
    await db.flush()

    logger.info(f"Report created: {report.id} by user {user.id}")

    # Broadcast to admin websocket
    await ws_manager.broadcast_admin({
        "type": "new_report",
        "report_id": str(report.id),
        "category": payload.category.value,
        "lat": payload.lat,
        "lng": payload.lng,
    })

    return ReportResponse(
        id=report.id,
        user_id=report.user_id,
        lat=payload.lat,
        lng=payload.lng,
        category=payload.category,
        description=payload.description,
        created_at=report.created_at,
        is_verified=report.is_verified,
    )


# ── Risk Zones ────────────────────────────────────────
@router.get("/risk-zones", response_model=list[RiskZoneResponse])
async def get_risk_zones(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius: float = Query(1000, gt=0, description="Radius in meters"),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve active risk zones within a given radius of a point.
    Uses PostGIS ST_DWithin for spatial filtering.
    """
    stmt = (
        select(
            RiskZone.id,
            RiskZone.risk_score,
            RiskZone.active,
            RiskZone.created_at,
            RiskZone.updated_at,
            func.ST_Y(func.ST_GeomFromWKB(RiskZone.centroid)).label("centroid_lat"),
            func.ST_X(func.ST_GeomFromWKB(RiskZone.centroid)).label("centroid_lng"),
        )
        .where(
            RiskZone.active == True,  # noqa: E712
            func.ST_DWithin(
                RiskZone.centroid,
                func.ST_GeogFromText(f"POINT({lng} {lat})"),
                radius,
            ),
        )
    )

    result = await db.execute(stmt)
    rows = result.all()

    return [
        RiskZoneResponse(
            id=r.id,
            centroid_lat=r.centroid_lat,
            centroid_lng=r.centroid_lng,
            risk_score=r.risk_score,
            active=r.active,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rows
    ]


# ── Trigger clustering (admin / cron) ────────────────
@router.post("/risk-zones/cluster", status_code=status.HTTP_200_OK)
async def trigger_clustering(
    user: User = Depends(_get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Manually trigger the DBSCAN clustering pipeline.
    In production, call this from a scheduled task / cron.
    """
    count = await run_clustering(db)

    # Broadcast risk update
    await ws_manager.broadcast_risk({
        "type": "zones_updated",
        "zones_updated": count,
    })

    return {"message": f"Clustering complete. {count} zone(s) created/updated."}
