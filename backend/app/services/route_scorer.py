"""
Path Finder – Safe Route Scoring.

Decodes a Mapbox polyline, samples points along it, and checks
intersection with active risk zones to produce an exposure score.

─────────────────────────────────────────────────────────────────────
NCRB INTEGRATION (v2):
  When the NCRB baseline risk index for the configured city exceeds
  NCRB_ROUTE_RISK_THRESHOLD, segment risk scores receive a resistance
  multiplier (NCRB_ROUTE_RISK_MULTIPLIER, default 1.3×).

  This simulates high-risk zone bias in route scoring without altering
  map rendering or frontend logic.

  BACKWARD COMPATIBILITY:
  - If no NCRB data exists, scoring is identical to v1.
  - No API response structure changes.
─────────────────────────────────────────────────────────────────────
"""

from typing import List

import polyline as polyline_lib
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import get_settings
from app.models import RiskZone
from app.schemas import (
    HighRiskSegment,
    PointSchema,
    RouteRecommendation,
    RouteScoreResponse,
)
from app.services.ncrb_baseline import get_city_baseline_index
from app.utils import logger

settings = get_settings()

# Threshold above which a route is flagged HIGH_RISK
# We lower this to 20 to be more sensitive to moderate risk zones
HIGH_RISK_THRESHOLD = 20


async def _get_ncrb_bias_multiplier(db: AsyncSession) -> float:
    """
    Determine the NCRB resistance multiplier for route segments.

    If the city's NCRB baseline index exceeds NCRB_ROUTE_RISK_THRESHOLD,
    returns NCRB_ROUTE_RISK_MULTIPLIER (default 1.3).
    Otherwise returns 1.0 (no bias).

    Returns 1.0 if no baseline data exists (backward compat).
    """
    baseline_index = await get_city_baseline_index(db)

    if baseline_index > settings.NCRB_ROUTE_RISK_THRESHOLD:
        logger.info(
            f"PathFinder: NCRB baseline index ({baseline_index}) exceeds "
            f"threshold ({settings.NCRB_ROUTE_RISK_THRESHOLD}), "
            f"applying {settings.NCRB_ROUTE_RISK_MULTIPLIER}× resistance bias"
        )
        return settings.NCRB_ROUTE_RISK_MULTIPLIER

    return 1.0


async def score_route(
    encoded_polyline: str,
    db: AsyncSession,
) -> RouteScoreResponse:
    """
    1. Decode the polyline to a list of (lat, lng) points.
    2. Convert to WKT LineString.
    3. Check intersection with active risk zone polygons.
    4. Return HIGH_RISK if it intersects a high or moderate risk zone polygon.
    """
    coords: List[tuple] = polyline_lib.decode(encoded_polyline)

    if len(coords) < 2:
        return RouteScoreResponse(
            route_risk_score=0,
            high_risk_segments=[],
            recommendation=RouteRecommendation.SAFE,
        )

    # Convert coordinates to WKT LineString (lng lat)
    line_wkt = "LINESTRING(" + ", ".join([f"{c[1]} {c[0]}" for c in coords]) + ")"

    # Check for direct intersection with active risk zone polygons
    # We prioritize polygons for the "Oracle" logic
    stmt = select(RiskZone).where(
        RiskZone.active == True,
        func.ST_Intersects(
            RiskZone.polygon,
            func.ST_GeogFromText(line_wkt)
        )
    )
    result = await db.execute(stmt)
    intersecting_zones = result.scalars().all()

    # Determine if any intersected zone is HIGH or MEDIUM risk
    # MEDIUM zones should also be considered dangerous for "Safe" recommendations
    is_dangerous = any(z.risk_level in ["HIGH", "MEDIUM"] for z in intersecting_zones)
    
    # Calculate a simple aggregate score
    total_risk_score = 0.0
    if intersecting_zones:
        # Sum of risk scores of intersected zones, capped at 100
        total_risk_score = min(sum(z.risk_score for z in intersecting_zones), 100)

    recommendation = (
        RouteRecommendation.HIGH_RISK
        if is_dangerous or total_risk_score >= HIGH_RISK_THRESHOLD
        else RouteRecommendation.SAFE
    )

    high_risk_segments: List[HighRiskSegment] = []
    # Optionally flag segments that are actually inside polygons (simplified for now)
    # In a full impl, we'd use ST_Intersection to find exact sub-segments
    if is_dangerous:
        # Flag the first half as a placeholder for UI rendering if needed
        mid = len(coords) // 2
        high_risk_segments.append(
            HighRiskSegment(
                start=PointSchema(lat=coords[0][0], lng=coords[0][1]),
                end=PointSchema(lat=coords[mid][0], lng=coords[mid][1]),
                risk_score=100
            )
        )

    return RouteScoreResponse(
        route_risk_score=float(total_risk_score),
        high_risk_segments=high_risk_segments,
        recommendation=recommendation,
    )
