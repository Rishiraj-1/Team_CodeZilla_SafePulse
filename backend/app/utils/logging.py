"""
Structured logging with loguru.
"""

import sys

from loguru import logger


def _configure_logging():
    """Configure loguru. Called lazily to avoid import-time settings access."""
    try:
        from app.config.settings import get_settings
        settings = get_settings()
        is_prod = settings.is_production
    except Exception:
        is_prod = False

    logger.remove()
    logger.add(
        sys.stderr,
        level="DEBUG" if not is_prod else "INFO",
        format=(
            "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
            "<level>{message}</level>"
        ),
        backtrace=True,
        diagnose=not is_prod,
    )


_configure_logging()

__all__ = ["logger"]
