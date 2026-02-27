"""
Telegram Bot webhook route.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.telegram_bot import handle_webhook

router = APIRouter(prefix="/telegram", tags=["Telegram Bot"])


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Receive Telegram webhook updates.
    Processes location messages as reports.
    """
    payload = await request.json()
    result = await handle_webhook(payload, db)
    return {"ok": True, "action": result}
