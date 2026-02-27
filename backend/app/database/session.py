"""
Async database engine and session factory for Supabase/PostgreSQL.
Engine creation is lazy so the app can start even without a live DB.
"""

from typing import Optional

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config.settings import get_settings


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


# ── Lazy engine singleton ─────────────────────────────
_engine: Optional[AsyncEngine] = None
_session_factory: Optional[async_sessionmaker] = None


def _get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        settings = get_settings()
        # Use NullPool and disable statement cache for Supabase Transaction mode pooler
        # Strip query parameters for cleaner engine creation if they exist
        db_url = settings.DATABASE_URL.split("?")[0]
        
        _engine = create_async_engine(
            db_url,
            echo=not settings.is_production,
            poolclass=NullPool,
            connect_args={
                "statement_cache_size": 0,
            },
        )
    return _engine


def _get_session_factory() -> async_sessionmaker:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            _get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _session_factory


# Public accessors (for backwards-compat imports)
def engine():
    return _get_engine()


def async_session_factory():
    return _get_session_factory()


async def get_db() -> AsyncSession:
    """FastAPI dependency – yields an async database session."""
    factory = _get_session_factory()
    async with factory() as session:
        yield session
        await session.commit()


async def init_db() -> None:
    """Create all tables (dev convenience – use Alembic in production)."""
    try:
        eng = _get_engine()
        async with eng.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as exc:
        # Don't crash the app if DB is unreachable during dev
        from app.utils.logging import logger
        logger.warning(f"Could not initialise DB (is DATABASE_URL correct?): {exc}")
