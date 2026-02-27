"""
Path Finder – Route scoring routes.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import RouteScoreRequest, RouteScoreResponse
from app.services.route_scorer import score_route

router = APIRouter(prefix="/route", tags=["Path Finder"])


@router.post("/score", response_model=RouteScoreResponse)
async def score_route_endpoint(
    payload: RouteScoreRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Score a route polyline against active risk zones.
    Accepts an encoded Mapbox polyline; returns risk score
    and flagged segments.
    """
    return await score_route(payload.polyline, db)
