"""
Telegram Bot Integration.

Provides:
  - send_message / notify_admins  (outgoing)
  - webhook handler              (incoming: location → report)
"""

from typing import Optional

import httpx

from app.utils import logger


def _get_bot_config():
    """Lazy config access to avoid import-time settings validation."""
    from app.config.settings import get_settings
    settings = get_settings()
    return settings.TELEGRAM_BOT_TOKEN, settings.TELEGRAM_ADMIN_CHAT_ID


async def send_message(chat_id: str, text: str, parse_mode: str = "Markdown") -> bool:
    """Send a Telegram message to a specific chat."""
    token, _ = _get_bot_config()
    if not token:
        logger.warning("Telegram: bot token not configured, skipping send")
        return False

    base_url = f"https://api.telegram.org/bot{token}"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{base_url}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": parse_mode,
                },
            )
            resp.raise_for_status()
            return True
    except httpx.HTTPError as exc:
        logger.error(f"Telegram send failed: {exc}")
        return False


async def notify_admins(text: str) -> bool:
    """Convenience wrapper: send a message to the admin chat."""
    _, admin_chat_id = _get_bot_config()
    if not admin_chat_id:
        logger.warning("Telegram: admin chat ID not configured, skipping notify")
        return False
    return await send_message(admin_chat_id, text)


async def handle_webhook(payload: dict, db) -> Optional[str]:
    """
    Process an incoming Telegram update.

    Supported interactions:
      - Location message → create a report
      - /start command → welcome message
    """
    message = payload.get("message")
    if not message:
        return None

    chat_id = str(message["chat"]["id"])
    text = message.get("text", "")

    # ── /start command ────────────────────────────────
    if text.strip().startswith("/start"):
        await send_message(
            chat_id,
            "🛡️ *Welcome to SafePulse Bot!*\n\n"
            "Send your 📍 location to file a safety report.\n"
            "Use /help for more commands.",
        )
        return "welcome_sent"

    # ── Location-based report ─────────────────────────
    location = message.get("location")
    if location:
        from app.models import Report, ReportCategory
        from app.utils import point_to_wkt

        lat = location["latitude"]
        lng = location["longitude"]

        report = Report(
            user_id=None,
            location=point_to_wkt(lat, lng),
            category=ReportCategory.OTHER,
            description=f"Telegram report from chat {chat_id}",
        )
        db.add(report)
        await db.flush()

        await send_message(
            chat_id,
            f"✅ Report received!\nLocation: ({lat}, {lng})\n"
            "Thank you for keeping your community safe.",
        )

        await notify_admins(
            f"📋 *New Telegram Report*\n"
            f"Chat: {chat_id}\n"
            f"Location: ({lat}, {lng})\n"
            f"Maps: https://maps.google.com/?q={lat},{lng}"
        )

        logger.info(f"Telegram: Report created from chat {chat_id}")
        return "report_created"

    # ── Unrecognised ──────────────────────────────────
    await send_message(
        chat_id,
        "🤔 I didn't understand that.\n"
        "Send your 📍 location to file a report, or use /start.",
    )
    return "unrecognised"
