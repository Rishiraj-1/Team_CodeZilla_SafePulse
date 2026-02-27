"""
SafePulse – Safety Intelligence Platform
FastAPI application entry point.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import get_settings
from app.database import init_db
from app.routes import (
    anchor,
    auth,
    failsafe,
    oracle,
    pathfinder,
    reports,
    silent_witness,
    telegram,
    users,
    websocket,
    integration,
    otp,
    map,
)
from app.utils import logger

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle hooks."""
    logger.info("🚀 SafePulse starting up …")
    # Create tables (dev only – use Alembic migrations in prod)
    if not settings.is_production:
        await init_db()
        
        # Bootstrap Admin
        from app.database.session import _get_session_factory
        from sqlalchemy import select
        from app.models import User, UserRole, UserStatus
        from app.utils.security import get_password_hash
        
        async_session = _get_session_factory()
        async with async_session() as db:
            result = await db.execute(select(User).where(User.email == "admin@safepulse.com"))
            admin = result.scalar_one_or_none()
            if not admin:
                logger.info("Creating default admin user: admin@safepulse.com")
                new_admin = User(
                    email="admin@safepulse.com",
                    password_hash=get_password_hash("admin@1234"),
                    role=UserRole.ADMIN,
                    status=UserStatus.ACTIVE,
                    name="System Admin",
                    institution="SafePulse Core"
                )
                db.add(new_admin)
                await db.commit()

    yield
    logger.info("👋 SafePulse shutting down …")


app = FastAPI(
    title="SafePulse API",
    description="Safety Intelligence Platform – Backend",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(otp.router)
app.include_router(oracle.router)
app.include_router(pathfinder.router)
app.include_router(anchor.router)
app.include_router(failsafe.router)
app.include_router(silent_witness.router)
app.include_router(telegram.router)
app.include_router(websocket.router)
app.include_router(integration.router)
app.include_router(map.router)
app.include_router(reports.router)


@app.get("/", tags=["Health"])
async def health():
    return {
        "status": "ok",
        "service": "SafePulse API",
        "version": "1.0.0",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}
