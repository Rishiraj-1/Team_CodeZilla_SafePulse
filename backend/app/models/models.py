"""
SQLAlchemy ORM models for SafePulse.
Spatial columns use GeoAlchemy2 with GEOGRAPHY SRID 4326.
"""

import enum
import uuid
from datetime import datetime

from geoalchemy2 import Geography
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database.session import Base


# ── Enums ─────────────────────────────────────────────
class UserRole(str, enum.Enum):
    CITIZEN = "CITIZEN"
    GUARDIAN = "GUARDIAN"
    AUTHORITY = "AUTHORITY"
    ADMIN = "ADMIN"

class UserStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    POLICE_VERIFICATION_PENDING = "POLICE_VERIFICATION_PENDING"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"

class GuardianCategory(str, enum.Enum):
    NSS_VOLUNTEER = "NSS_VOLUNTEER"
    COLLEGE_SECURITY = "COLLEGE_SECURITY"
    CAMPUS_WARDEN = "CAMPUS_WARDEN"
    NGO = "NGO"
    POLICE_COMMUNITY_OFFICER = "POLICE_COMMUNITY_OFFICER"


class ReportCategory(str, enum.Enum):
    DARKNESS = "DARKNESS"
    LOITERING = "LOITERING"
    HARASSMENT = "HARASSMENT"
    OTHER = "OTHER"


class RiskReportStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class RiskReportPriority(str, enum.Enum):
    NORMAL = "NORMAL"
    HIGH = "HIGH"


class GuardianSessionStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    ACCEPTED = "ACCEPTED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class SOSStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ASSIGNED = "ASSIGNED"
    RESOLVED = "RESOLVED"


class GuardianAvailabilityStatus(str, enum.Enum):
    ON_DUTY = "ON_DUTY"
    OFF_DUTY = "OFF_DUTY"


class GuardianOnlineStatus(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"


class GuardianAlertStatus(str, enum.Enum):
    NEW = "NEW"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"


# ── Users ─────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.CITIZEN)
    status = Column(Enum(UserStatus), nullable=False, default=UserStatus.ACTIVE)
    authority_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    phone_verified = Column(Boolean, default=False)
    gender = Column(String(50), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    
    # Guardian specific fields
    category = Column(Enum(GuardianCategory), nullable=True)
    aadhaar_number = Column(String(255), nullable=True) # stored encrypted
    document_url = Column(String(1024), nullable=True)
    profile_image_url = Column(Text, nullable=True)  # Guardian profile photo (base64 data URL or HTTPS URL)
    telegram_chat_id = Column(String(100), nullable=True)  # Telegram chat id for direct alerts
    availability_status = Column(Enum(GuardianAvailabilityStatus), nullable=True, default=GuardianAvailabilityStatus.OFF_DUTY)
    online_status = Column(Enum(GuardianOnlineStatus), nullable=True, default=GuardianOnlineStatus.OFFLINE)

    institution = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # relationships
    reports = relationship("Report", back_populates="user", lazy="select")
    checkins = relationship("Checkin", back_populates="user", lazy="select")


# ── Reports ───────────────────────────────────────────
class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    location = Column(Geography("POINT", srid=4326), nullable=False)
    category = Column(Enum(ReportCategory), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_verified = Column(Boolean, default=False)

    user = relationship("User", back_populates="reports")


# ── Risk Zones ────────────────────────────────────────
class RiskZone(Base):
    __tablename__ = "risk_zones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_report_id = Column(UUID(as_uuid=True), ForeignKey("risk_reports.id"), nullable=True)
    authority_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    category = Column(String(100), nullable=True)
    centroid = Column(Geography("POINT", srid=4326), nullable=False)
    polygon = Column(Geography("POLYGON", srid=4326), nullable=True)
    risk_score = Column(Integer, nullable=False, default=0)
    risk_level = Column(String(20), nullable=True, default="MEDIUM")  # HIGH | MEDIUM
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    source_report = relationship("RiskReport", foreign_keys=[source_report_id])


# ── Risk Reports (pending moderation queue) ───────────
class RiskReport(Base):
    __tablename__ = "risk_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reporter_role = Column(String(20), nullable=False)  # CITIZEN | GUARDIAN
    authority_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(Geography("POINT", srid=4326), nullable=False)
    priority = Column(
        Enum(RiskReportPriority), nullable=False, default=RiskReportPriority.NORMAL
    )
    status = Column(
        Enum(RiskReportStatus), nullable=False, default=RiskReportStatus.PENDING
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reporter = relationship("User", foreign_keys=[reporter_id])
    authority = relationship("User", foreign_keys=[authority_id])


# ── Guardian Sessions ─────────────────────────────────
class GuardianSession(Base):
    __tablename__ = "guardian_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    guardian_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status = Column(
        Enum(GuardianSessionStatus),
        nullable=False,
        default=GuardianSessionStatus.REQUESTED,
    )
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    pickup_location = Column(Geography("POINT", srid=4326), nullable=True)

    user = relationship("User", foreign_keys=[user_id])
    guardian = relationship("User", foreign_keys=[guardian_id])


# ── SOS Events ────────────────────────────────────────
class SOSEvent(Base):
    __tablename__ = "sos_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    location = Column(Geography("POINT", srid=4326), nullable=False)
    status = Column(Enum(SOSStatus), nullable=False, default=SOSStatus.ACTIVE)
    triggered_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", foreign_keys=[user_id])


# ── Live SOS Tracking ────────────────────────────────
class SOSSession(Base):
    __tablename__ = "sos_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    active = Column(Boolean, default=True)

    user = relationship("User", foreign_keys=[user_id])

class SOSLocation(Base):
    __tablename__ = "sos_locations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sos_sessions.id", ondelete="CASCADE"), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("SOSSession", foreign_keys=[session_id])


# ── Guardian Locations (live heartbeat) ───────────────
class GuardianLocation(Base):
    __tablename__ = "guardian_locations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    guardian_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    location = Column(Geography("POINT", srid=4326), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    guardian = relationship("User", foreign_keys=[guardian_id])


# ── Guardian Alerts (per-guardian SOS assignment) ─────
class GuardianAlert(Base):
    __tablename__ = "guardian_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    guardian_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sos_id = Column(UUID(as_uuid=True), ForeignKey("sos_events.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(GuardianAlertStatus), nullable=False, default=GuardianAlertStatus.NEW)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    guardian = relationship("User", foreign_keys=[guardian_id])
    sos_event = relationship("SOSEvent", foreign_keys=[sos_id])


# ── Checkins (Silent Witness) ─────────────────────────
class Checkin(Base):
    __tablename__ = "checkins"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    location = Column(Geography("POINT", srid=4326), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="checkins")


# ── NCRB Baseline Crime Stats ────────────────────────
class BaselineCityCrimeStat(Base):
    """
    Static NCRB crime data per city/year.
    Used as a baseline risk layer in the Oracle risk engine.
    """
    __tablename__ = "baseline_city_crime_stats"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    city_name = Column(String(100), nullable=False, index=True)
    year = Column(Integer, nullable=False)
    crime_type = Column(String(200), nullable=False)
    total_cases = Column(Integer, nullable=False, default=0)
    crime_rate_per_lakh = Column(Float, nullable=False, default=0.0)
    weighted_score = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# ── Deletion Requests ─────────────────────────────────
class DeletionRequest(Base):
    __tablename__ = "deletion_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    requested_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(String(50), default="PENDING")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    target_user = relationship("User", foreign_keys=[target_user_id])
    requested_by = relationship("User", foreign_keys=[requested_by_id])

# ── Phone OTP Verification ─────────────────────────
class PhoneOTP(Base):
    __tablename__ = "phone_otps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    phone = Column(Text, nullable=False, index=True)
    otp_hash = Column(Text, nullable=False)
    attempts = Column(Integer, default=0)
    verified = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])

