"""
SafePulse – Risk Report → Authority Triage → Risk Zone pipeline.

Endpoints:
  POST /api/reports          – Citizen/Guardian submits report (→ PENDING)
  GET  /api/reports/pending  – Authority sees their pending queue
  GET  /api/risk-zones       – All active risk zones (for map overlay)
  POST /api/reports/{id}/accept  – Authority accepts → creates RiskZone
  POST /api/reports/{id}/reject  – Authority rejects
"""

import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from geoalchemy2.elements import WKTElement
from app.database import get_db
from app.middleware.auth import _get_current_user
from app.utils.logging import logger
from app.models import (
    User,
    UserRole,
    RiskReport,
    RiskReportStatus,
    RiskReportPriority,
    RiskZone,
)

router = APIRouter(prefix="/api", tags=["Reports"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class ReportSubmitRequest(BaseModel):
    category: str          # e.g. 'Poor Lighting', 'Physical Threat', etc.
    description: Optional[str] = None
    latitude: float
    longitude: float


class RiskReportOut(BaseModel):
    id: str
    reporter_role: str
    category: str
    description: Optional[str]
    latitude: float
    longitude: float
    priority: str
    status: str
    created_at: datetime
    reporter_name: Optional[str] = None

    class Config:
        from_attributes = True


class RiskZoneOut(BaseModel):
    id: str
    category: Optional[str]
    latitude: float
    longitude: float
    risk_level: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _extract_point(db: AsyncSession, geography_col) -> tuple[float, float]:
    """Extract (lat, lng) from a GeoAlchemy2 Geography column."""
    if geography_col is None:
        return 0.0, 0.0
    result = await db.execute(
        text("SELECT ST_Y(ST_AsText(:geom)::geometry), ST_X(ST_AsText(:geom)::geometry)").bindparams(geom=str(geography_col))
    )
    row = result.fetchone()
    return (row[0] or 0.0, row[1] or 0.0) if row else (0.0, 0.0)


def _make_point_wkt(longitude: float, latitude: float) -> str:
    return f"SRID=4326;POINT({longitude} {latitude})"


def _make_buffer_polygon_wkt(longitude: float, latitude: float, radius_m: float = 100) -> str:
    """Return WKT for a buffered polygon around the given point."""
    # PostGIS: ST_Buffer on geography auto distances in meters
    return f"SRID=4326;POINT({longitude} {latitude})"  # fallback; polygon done via SQL


# ── POST /api/reports  (submit) ───────────────────────────────────────────────

@router.post("/reports", status_code=status.HTTP_201_CREATED)
async def submit_report(
    body: ReportSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    """Citizen/Guardian submits a risk report.
    
    Rules:
    - Guardian: 1 report → immediately creates a HIGH risk zone (auto-accepted).
    - Citizen: accumulates as PENDING. When 5+ citizen reports fall within 200m
      of each other, a MEDIUM risk zone is automatically created.
    """
    if current_user.role not in (UserRole.CITIZEN, UserRole.GUARDIAN):
        raise HTTPException(403, "Only Citizens and Guardians can submit reports")

    is_guardian = current_user.role == UserRole.GUARDIAN

    # Priority by role
    priority = (
        RiskReportPriority.HIGH
        if is_guardian
        else RiskReportPriority.NORMAL
    )

    # Find assigned authority for this user (or use any authority as fallback)
    authority_id = current_user.authority_id
    if authority_id is None:
        res = await db.execute(
            select(User).where(User.role == UserRole.AUTHORITY).limit(1)
        )
        authority = res.scalar_one_or_none()
        if authority:
            authority_id = authority.id

    # Persist the new report
    report = RiskReport(
        id=uuid.uuid4(),
        reporter_id=current_user.id,
        reporter_role=current_user.role.value,
        authority_id=authority_id,
        category=body.category,
        description=body.description,
        location=_make_point_wkt(body.longitude, body.latitude),
        priority=priority,
        status=RiskReportStatus.PENDING,
    )
    db.add(report)
    await db.flush()  # get ID without full commit so we can use it below

    risk_zone_created = None

    if is_guardian:
        # ── GUARDIAN: single report → immediate HIGH zone (early alert) ────
        # Report stays PENDING — authority still accepts/rejects via triage.
        try:
            geo_res = await db.execute(
                text(
                    """
                    SELECT
                        ST_Y(location::geometry),
                        ST_X(location::geometry),
                        ST_AsText(ST_Buffer(location::geography, 200)::geometry)
                    FROM risk_reports WHERE id = :rid
                    """
                ).bindparams(rid=report.id)
            )
            row = geo_res.fetchone()
            if row:
                lat, lng, poly_wkt = row
                zone = RiskZone(
                    id=uuid.uuid4(),
                    source_report_id=report.id,
                    authority_id=authority_id,
                    category=body.category,
                    centroid=report.location,
                    polygon=WKTElement(poly_wkt, srid=4326),
                    risk_score=100,
                    risk_level="HIGH",
                    active=True,
                )
                db.add(zone)
                risk_zone_created = str(zone.id)
        except Exception as e:
            logger.error(f"Guardian auto-zone creation failed: {e}")


    else:
        # ── CITIZEN: count nearby PENDING citizen reports (incl. this one) ──
        # 200m radius threshold, minimum 5 reports to trigger a MEDIUM zone
        RADIUS_M = 200
        THRESHOLD = 5
        try:
            count_res = await db.execute(
                text(
                    """
                    SELECT COUNT(*) FROM risk_reports
                    WHERE reporter_role = 'citizen'
                      AND status = 'PENDING'
                      AND ST_DWithin(
                            location::geography,
                            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                            :radius
                          )
                    """
                ).bindparams(lat=body.latitude, lng=body.longitude, radius=RADIUS_M)
            )
            nearby_count = count_res.scalar() or 0
            logger.info(f"Citizen report cluster count near ({body.latitude},{body.longitude}): {nearby_count}")

            if nearby_count >= THRESHOLD:
                # Create a MEDIUM zone automatically — early map alert.
                # Reports remain PENDING so authority can still accept/reject each one.
                geo_res = await db.execute(
                    text(
                        """
                        SELECT
                            ST_Y(location::geometry),
                            ST_X(location::geometry),
                            ST_AsText(ST_Buffer(location::geography, :radius)::geometry)
                        FROM risk_reports WHERE id = :rid
                        """
                    ).bindparams(rid=report.id, radius=RADIUS_M)
                )
                row = geo_res.fetchone()
                if row:
                    lat, lng, poly_wkt = row
                    zone = RiskZone(
                        id=uuid.uuid4(),
                        source_report_id=report.id,
                        authority_id=authority_id,
                        category=body.category,
                        centroid=report.location,
                        polygon=WKTElement(poly_wkt, srid=4326),
                        risk_score=50,
                        risk_level="MEDIUM",
                        active=True,
                    )
                    db.add(zone)
                    risk_zone_created = str(zone.id)
        except Exception as e:
            logger.error(f"Citizen cluster check failed: {e}")


    await db.commit()
    await db.refresh(report)

    response = {"id": str(report.id), "priority": priority.value, "status": report.status.value}
    if risk_zone_created:
        response["risk_zone_created"] = risk_zone_created
    return response



# ── GET /api/reports/pending  (authority view) ────────────────────────────────

@router.get("/reports/pending", response_model=List[RiskReportOut])
async def get_pending_reports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    """Authority fetches their pending report queue (HIGH priority first)."""
    if current_user.role not in (UserRole.AUTHORITY, UserRole.ADMIN):
        raise HTTPException(403, "Only Authorities can view pending reports")

    # Select report plus lat/lng strings for easy parsing
    q = select(
        RiskReport,
        text("ST_Y(location::geometry)"),
        text("ST_X(location::geometry)")
    ).options(selectinload(RiskReport.reporter))
    if current_user.role == UserRole.AUTHORITY:
        q = q.where(
            RiskReport.authority_id == current_user.id,
            RiskReport.status == RiskReportStatus.PENDING,
        )
    else:
        q = q.where(RiskReport.status == RiskReportStatus.PENDING)

    result = await db.execute(q)
    rows = result.all()

    # Sort rows (r, lat, lng)
    rows = sorted(
        rows,
        key=lambda row: (0 if row[0].priority == RiskReportPriority.HIGH else 1, row[0].created_at),
    )

    out = []
    for r, lat, lng in rows:
        reporter_name = None
        if r.reporter:
            reporter_name = r.reporter.name

        out.append(RiskReportOut(
            id=str(r.id),
            reporter_role=r.reporter_role,
            category=r.category,
            description=r.description,
            latitude=float(lat or 0.0),
            longitude=float(lng or 0.0),
            priority=r.priority.value,
            status=r.status.value,
            created_at=r.created_at,
            reporter_name=reporter_name,
        ))
    return out


# ── POST /api/reports/{id}/accept ─────────────────────────────────────────────

@router.post("/reports/{report_id}/accept")
async def accept_report(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    """Authority accepts a report → creates RiskZone polygon via PostGIS buffer."""
    if current_user.role not in (UserRole.AUTHORITY, UserRole.ADMIN):
        raise HTTPException(403, "Insufficient permissions")

    try:
        rid = uuid.UUID(report_id)
    except ValueError:
        raise HTTPException(400, "Invalid report_id format")

    res = await db.execute(select(RiskReport).where(RiskReport.id == rid))
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    if report.status != RiskReportStatus.PENDING:
        raise HTTPException(400, f"Report is already {report.status.value}")

    # Update status
    report.status = RiskReportStatus.ACCEPTED

    # Determine risk level
    risk_level = "HIGH" if report.priority == RiskReportPriority.HIGH else "MEDIUM"
    risk_score = 100 if risk_level == "HIGH" else 50

    try:
        # Extract centroid coordinates and generate buffer polygon in a single query using the ID
        # Switch to ST_AsText to avoid binary binding issues in raw SQL
        geo_poly_res = await db.execute(
            text(
                """
                SELECT 
                    ST_Y(location::geometry), 
                    ST_X(location::geometry),
                    ST_AsText(ST_Buffer(location::geography, 100)::geometry)
                FROM risk_reports
                WHERE id = :rid
                """
            ).bindparams(rid=rid)
        )
        row = geo_poly_res.fetchone()
        if not row:
            raise HTTPException(500, "Failed to secondary-fetch report location")

        lat, lng, polygon_wkt = row

        risk_zone = RiskZone(
            id=uuid.uuid4(),
            source_report_id=report.id,
            authority_id=current_user.id,
            category=report.category,
            centroid=report.location,
            polygon=WKTElement(polygon_wkt, srid=4326),
            risk_score=risk_score,
            risk_level=risk_level,
            active=True,
        )
        db.add(risk_zone)
        await db.commit()
        await db.refresh(report)

        return {
            "status": "ACCEPTED",
            "risk_zone_id": str(risk_zone.id),
            "risk_level": risk_level,
            "latitude": lat,
            "longitude": lng,
        }
    except Exception as e:
        logger.error(f"Error in accept_report for {report_id}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        await db.rollback()
        raise HTTPException(500, f"Server error during acceptance: {str(e)}")


# ── POST /api/reports/{id}/reject ─────────────────────────────────────────────

@router.post("/reports/{report_id}/reject")
async def reject_report(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    """Authority rejects a report → no RiskZone created."""
    if current_user.role not in (UserRole.AUTHORITY, UserRole.ADMIN):
        raise HTTPException(403, "Insufficient permissions")

    res = await db.execute(select(RiskReport).where(RiskReport.id == report_id))
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    if report.status != RiskReportStatus.PENDING:
        raise HTTPException(400, f"Report is already {report.status.value}")

    report.status = RiskReportStatus.REJECTED
    await db.commit()

    return {"status": "REJECTED", "report_id": report_id}


# ── GET /api/risk-zones  (map overlay, accepted zones only) ──────────────────

@router.get("/risk-zones", response_model=List[RiskZoneOut])
async def get_risk_zones(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    """Returns all active risk zones for map overlay (Citizens, Guardians, Authorities)."""
    result = await db.execute(
        select(
            RiskZone,
            text("ST_Y(centroid::geometry)"),
            text("ST_X(centroid::geometry)")
        ).where(RiskZone.active == True)
    )
    rows = result.all()

    out = []
    for z, lat, lng in rows:
        out.append(RiskZoneOut(
            id=str(z.id),
            category=z.category,
            latitude=float(lat or 0.0),
            longitude=float(lng or 0.0),
            risk_level=z.risk_level or "MEDIUM",
            created_at=z.created_at,
        ))
    return out
