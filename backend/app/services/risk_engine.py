"""
Oracle – Risk Awareness Engine.

Clusters recent reports using DBSCAN, then creates or updates risk_zones
with computed risk scores.

─────────────────────────────────────────────────────────────────────
NCRB INTEGRATION (v2):
  The final risk score now blends real-time crowd-sourced data with
  NCRB static baseline data:

    Final Risk Score = (Real-time Score × 0.6) + (NCRB Baseline × 0.4)

  Weights are configurable via NCRB_REALTIME_WEIGHT / NCRB_BASELINE_WEIGHT
  in settings.

  BACKWARD COMPATIBILITY:
  - If no NCRB data exists in the database, the engine falls back to
    100% real-time scoring (identical to v1 behaviour).
  - No API response structure changes.
  - No frontend modifications required.
─────────────────────────────────────────────────────────────────────
"""

from datetime import datetime, timedelta, timezone
from typing import List, Tuple

import numpy as np
from sklearn.cluster import DBSCAN
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import get_settings
from app.models import Report, ReportCategory, RiskZone
from app.services.ncrb_baseline import get_city_baseline_score
from app.utils import logger, point_to_wkt

settings = get_settings()

# Category severity weights used when computing risk_score
CATEGORY_WEIGHTS = {
    ReportCategory.HARASSMENT: 5,
    ReportCategory.LOITERING: 3,
    ReportCategory.DARKNESS: 2,
    ReportCategory.OTHER: 1,
}


async def _fetch_recent_reports(
    db: AsyncSession,
) -> List[Tuple[float, float, str, datetime]]:
    """
    Return (lat, lng, category, created_at) for reports within the
    configured lookback window.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.RISK_LOOKBACK_DAYS)
    stmt = select(
        func.ST_Y(func.ST_GeomFromWKB(Report.location)).label("lat"),
        func.ST_X(func.ST_GeomFromWKB(Report.location)).label("lng"),
        Report.category,
        Report.created_at,
    ).where(Report.created_at >= cutoff)

    result = await db.execute(stmt)
    return result.all()


def _cluster_reports(
    reports: List[Tuple[float, float, str, datetime]],
) -> List[List[Tuple[float, float, str, datetime]]]:
    """
    Run DBSCAN on report coordinates.
    eps is ~200 m converted to radians for haversine metric.
    """
    if len(reports) < settings.RISK_CLUSTER_MIN_REPORTS:
        return []

    coords = np.array([[r[0], r[1]] for r in reports])
    coords_rad = np.radians(coords)

    eps_rad = settings.RISK_CLUSTER_RADIUS_M / 6_371_000  # Earth radius in m

    db = DBSCAN(
        eps=eps_rad,
        min_samples=settings.RISK_CLUSTER_MIN_REPORTS,
        metric="haversine",
    )
    labels = db.fit_predict(coords_rad)

    clusters: dict[int, list] = {}
    for idx, label in enumerate(labels):
        if label == -1:
            continue  # noise
        clusters.setdefault(label, []).append(reports[idx])

    return list(clusters.values())


def _compute_realtime_score(
    cluster: List[Tuple[float, float, str, datetime]],
) -> int:
    """
    Real-time risk score from crowd-sourced reports.

    Score = Σ(category_weight × recency_factor)
    Recency factor: 1.0 if < 1 day, 0.6 if < 3 days, 0.3 otherwise.
    Clamped to 0-100.

    NOTE: This was previously named _compute_risk_score in v1.
    Renamed for clarity when NCRB blending was introduced.
    """
    now = datetime.now(timezone.utc)
    score = 0.0

    for _, _, category, created_at in cluster:
        weight = CATEGORY_WEIGHTS.get(category, 1)
        age = (now - created_at).total_seconds() / 86_400  # days

        if age < 1:
            recency = 1.0
        elif age < 3:
            recency = 0.6
        else:
            recency = 0.3

        score += weight * recency

    # Normalise to 0-100
    return min(int(score * 5), 100)


async def _compute_blended_risk_score(
    cluster: List[Tuple[float, float, str, datetime]],
    db: AsyncSession,
) -> int:
    """
    Blended risk score combining real-time reports and NCRB baseline.

    Formula:
        Final = (Real-time Score × NCRB_REALTIME_WEIGHT)
              + (NCRB Baseline  × NCRB_BASELINE_WEIGHT)

    Default weights: 0.6 real-time, 0.4 baseline.

    BACKWARD COMPATIBILITY:
    If no NCRB baseline data exists (score == 0), the function
    returns 100% real-time score — identical to v1 behaviour.
    """
    realtime_score = _compute_realtime_score(cluster)

    # Fetch NCRB baseline score (cached per-request via DB query)
    baseline_score = await get_city_baseline_score(db)

    if baseline_score == 0.0:
        # No NCRB data available — fall back to pure real-time scoring
        # This preserves v1 behaviour for cities without baseline data
        logger.debug("NCRB: No baseline data, using 100% real-time score")
        return realtime_score

    # Blend real-time and baseline scores
    blended = (
        realtime_score * settings.NCRB_REALTIME_WEIGHT
        + baseline_score * settings.NCRB_BASELINE_WEIGHT
    )

    final_score = min(int(round(blended)), 100)

    logger.info(
        f"Oracle: Blended score = {final_score} "
        f"(realtime={realtime_score} × {settings.NCRB_REALTIME_WEIGHT} "
        f"+ baseline={baseline_score} × {settings.NCRB_BASELINE_WEIGHT})"
    )
    return final_score


async def run_clustering(db: AsyncSession) -> int:
    """
    Full clustering pipeline.
    Returns the number of risk zones created / updated.
    """
    reports = await _fetch_recent_reports(db)
    clusters = _cluster_reports(reports)

    if not clusters:
        logger.info("Oracle: No clusters found")
        return 0

    count = 0
    for cluster in clusters:
        lats = [r[0] for r in cluster]
        lngs = [r[1] for r in cluster]
        centroid_lat = float(np.mean(lats))
        centroid_lng = float(np.mean(lngs))

        # v2: Use blended scoring (real-time + NCRB baseline)
        risk_score = await _compute_blended_risk_score(cluster, db)

        # Check if a zone already exists near this centroid
        existing = await db.execute(
            select(RiskZone).where(
                func.ST_DWithin(
                    RiskZone.centroid,
                    func.ST_GeogFromText(f"POINT({centroid_lng} {centroid_lat})"),
                    settings.RISK_CLUSTER_RADIUS_M,
                )
            )
        )
        zone = existing.scalar_one_or_none()

        if zone:
            zone.risk_score = max(zone.risk_score, risk_score)
            zone.updated_at = datetime.now(timezone.utc)
            zone.active = True
        else:
            zone = RiskZone(
                centroid=point_to_wkt(centroid_lat, centroid_lng),
                risk_score=risk_score,
                active=True,
            )
            db.add(zone)

        count += 1

    await db.commit()
    logger.info(f"Oracle: Processed {count} risk zone(s)")
    return count
