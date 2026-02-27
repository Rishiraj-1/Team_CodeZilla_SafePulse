"""
NCRB Baseline Service – Provides city-level baseline risk scores
derived from seeded NCRB crime data.

Used by:
  - Oracle risk_engine.py  → blended risk score
  - PathFinder route_scorer.py → route resistance bias
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import get_settings
from app.models import BaselineCityCrimeStat
from app.utils import logger

settings = get_settings()


async def get_city_baseline_score(
    db: AsyncSession,
    city_name: str | None = None,
) -> float:
    """
    Compute the aggregate NCRB baseline risk score (0–100) for a city.

    Methodology:
      - Average the weighted_score across all crime categories for the
        most recent year available.
      - Returns 0.0 if no data exists (graceful fallback).

    This value is used in the Oracle blending formula:
        Final = (Real-time × 0.6) + (Baseline × 0.4)
    """
    city = city_name or settings.NCRB_BASELINE_CITY

    # Get the most recent year of data for this city
    latest_year_stmt = (
        select(func.max(BaselineCityCrimeStat.year))
        .where(BaselineCityCrimeStat.city_name == city)
    )
    result = await db.execute(latest_year_stmt)
    latest_year = result.scalar_one_or_none()

    if latest_year is None:
        logger.warning(f"NCRB: No baseline data found for city '{city}'")
        return 0.0

    # Average weighted_score across all crime types for that year
    # Exclude the "Total IPC" aggregate row to avoid double-counting
    avg_stmt = (
        select(func.avg(BaselineCityCrimeStat.weighted_score))
        .where(
            BaselineCityCrimeStat.city_name == city,
            BaselineCityCrimeStat.year == latest_year,
            BaselineCityCrimeStat.crime_type != "Total IPC Crimes Against Women",
        )
    )
    result = await db.execute(avg_stmt)
    avg_score = result.scalar_one_or_none()

    score = round(float(avg_score or 0.0), 2)
    logger.info(f"NCRB: Baseline score for {city} ({latest_year}) = {score}")
    return score


async def get_city_baseline_index(
    db: AsyncSession,
    city_name: str | None = None,
) -> float:
    """
    Return the aggregate baseline risk index for route scoring.

    Uses the "Total IPC Crimes Against Women" weighted_score as the
    single summary metric. This is compared against the route risk
    threshold to decide whether to apply resistance bias.

    Returns 0.0 if no data exists.
    """
    city = city_name or settings.NCRB_BASELINE_CITY

    stmt = (
        select(BaselineCityCrimeStat.weighted_score)
        .where(
            BaselineCityCrimeStat.city_name == city,
            BaselineCityCrimeStat.crime_type == "Total IPC Crimes Against Women",
        )
        .order_by(BaselineCityCrimeStat.year.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    index_val = result.scalar_one_or_none()

    value = float(index_val or 0.0)
    logger.info(f"NCRB: Baseline index for {city} = {value}")
    return value
