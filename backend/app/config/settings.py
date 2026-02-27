"""
Application settings loaded from environment variables.
Uses pydantic-settings for validation and type coercion.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for the SafePulse application."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── App ──────────────────────────────────────────────
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:8080"
    JWT_SECRET: str = "safepulse-super-secret-key-for-mvp"

    # ── Database ─────────────────────────────────────────
    DATABASE_URL: str

    # ── Firebase ─────────────────────────────────────────
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_CREDENTIALS_PATH: str = "./firebase-service-account.json"

    # ── Twilio ───────────────────────────────────────────
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_MESSAGING_SERVICE_SID: str = ""

    # ── Telegram ─────────────────────────────────────────
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_ADMIN_CHAT_ID: str = ""

    # ── Risk Engine ──────────────────────────────────────
    RISK_CLUSTER_RADIUS_M: int = 200
    RISK_CLUSTER_MIN_REPORTS: int = 3
    RISK_LOOKBACK_DAYS: int = 7

    # ── Silent Witness ───────────────────────────────────
    CHECKIN_TIMEOUT_MINUTES: int = 30

    # ── NCRB Baseline Integration ────────────────────────
    NCRB_BASELINE_CITY: str = "Indore"
    NCRB_REALTIME_WEIGHT: float = 0.6       # Weight for real-time report scores
    NCRB_BASELINE_WEIGHT: float = 0.4       # Weight for NCRB baseline scores
    NCRB_ROUTE_RISK_THRESHOLD: int = 40     # Baseline index above which route bias kicks in
    NCRB_ROUTE_RISK_MULTIPLIER: float = 1.3 # Resistance multiplier for high-baseline routes

    # ── Email / SMTP ─────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance – parsed once per process."""
    return Settings()
