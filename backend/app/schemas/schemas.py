"""
Pydantic request / response schemas for SafePulse.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class UserRoleEnum(str, Enum):
    CITIZEN = "CITIZEN"
    GUARDIAN = "GUARDIAN"
    AUTHORITY = "AUTHORITY"
    ADMIN = "ADMIN"

class UserStatusEnum(str, Enum):
    ACTIVE = "ACTIVE"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    POLICE_VERIFICATION_PENDING = "POLICE_VERIFICATION_PENDING"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"

class GuardianCategoryEnum(str, Enum):
    NSS_VOLUNTEER = "NSS_VOLUNTEER"
    COLLEGE_SECURITY = "COLLEGE_SECURITY"
    CAMPUS_WARDEN = "CAMPUS_WARDEN"
    NGO = "NGO"
    POLICE_COMMUNITY_OFFICER = "POLICE_COMMUNITY_OFFICER"


class ReportCategoryEnum(str, Enum):
    DARKNESS = "DARKNESS"
    LOITERING = "LOITERING"
    HARASSMENT = "HARASSMENT"
    OTHER = "OTHER"


class GuardianSessionStatusEnum(str, Enum):
    REQUESTED = "REQUESTED"
    ACCEPTED = "ACCEPTED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class SOSStatusEnum(str, Enum):
    ACTIVE = "ACTIVE"
    ASSIGNED = "ASSIGNED"
    RESOLVED = "RESOLVED"


class GuardianAlertStatusEnum(str, Enum):
    NEW = "NEW"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"


class GuardianAvailabilityStatusEnum(str, Enum):
    ON_DUTY = "ON_DUTY"
    OFF_DUTY = "OFF_DUTY"


class GuardianOnlineStatusEnum(str, Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"


class RouteRecommendation(str, Enum):
    SAFE = "SAFE"
    HIGH_RISK = "HIGH_RISK"


# ── Shared ───────────────────────────────────────────
class PointSchema(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


# ── Auth & Users ─────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str

class SupabaseSync(BaseModel):
    id: str
    email: str
    name: Optional[str] = "User"
    role: str = "citizen"


class UserLogin(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    phone: Optional[str] = None
    gender: Optional[str] = None
    institution: Optional[str] = None
    role: UserRoleEnum = UserRoleEnum.CITIZEN
    authority_id: Optional[uuid.UUID] = None
    
    # Guardian specifics
    category: Optional[GuardianCategoryEnum] = None
    aadhaar_number: Optional[str] = None
    document_url: Optional[str] = None


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    role: UserRoleEnum
    status: UserStatusEnum
    authority_id: Optional[uuid.UUID]
    name: str
    phone: Optional[str]
    phone_verified: Optional[bool] = False
    emergency_contact_phone: Optional[str] = None
    gender: Optional[str]
    category: Optional[GuardianCategoryEnum] = None
    document_url: Optional[str] = None
    profile_image_url: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    availability_status: Optional[GuardianAvailabilityStatusEnum] = None
    online_status: Optional[GuardianOnlineStatusEnum] = None
    institution: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True



class MapUserItem(BaseModel):
    id: str
    lat: float
    lng: float
    name: str
    status: str

    class Config:
        from_attributes = True

class MapDataResponse(BaseModel):
    citizens: List[MapUserItem]
    guardians: List[MapUserItem]
    authorities: List[MapUserItem]


# ── Reports ───────────────────────────────────────────
class ReportCreate(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    category: ReportCategoryEnum
    description: Optional[str] = None


class ReportResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    lat: float
    lng: float
    category: ReportCategoryEnum
    description: Optional[str]
    created_at: datetime
    is_verified: bool

    class Config:
        from_attributes = True


# ── Risk Zone ────────────────────────────────────────
class RiskZoneResponse(BaseModel):
    id: uuid.UUID
    centroid_lat: float
    centroid_lng: float
    risk_score: int
    active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class RiskZoneQueryParams(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    radius: float = Field(1000, gt=0, description="Radius in meters")


# ── Route Scoring ────────────────────────────────────
class RouteScoreRequest(BaseModel):
    polyline: str = Field(..., description="Encoded polyline from Mapbox")


class HighRiskSegment(BaseModel):
    start: PointSchema
    end: PointSchema
    risk_score: int


class RouteScoreResponse(BaseModel):
    route_risk_score: float
    high_risk_segments: List[HighRiskSegment]
    recommendation: RouteRecommendation


# ── Guardian ─────────────────────────────────────────
class GuardianRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class GuardianAccept(BaseModel):
    session_id: uuid.UUID


class GuardianSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    guardian_id: Optional[uuid.UUID]
    status: GuardianSessionStatusEnum
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NearbyGuardianResponse(BaseModel):
    id: uuid.UUID
    name: str
    distance_m: float


# ── SOS ──────────────────────────────────────────────
class SOSTrigger(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class SOSResolve(BaseModel):
    sos_id: uuid.UUID


class SOSResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    status: SOSStatusEnum
    triggered_at: datetime
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Checkin (Silent Witness) ─────────────────────────
class CheckinCreate(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class CheckinResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    timestamp: datetime
    alert: Optional[str] = None

    class Config:
        from_attributes = True


# ── Telegram ─────────────────────────────────────────
class TelegramUpdate(BaseModel):
    """Minimal Telegram webhook payload structure."""
    update_id: int
    message: Optional[dict] = None

class RoleUpgradeRequest(BaseModel):
    role: str
    mobile: str
    gender: Optional[str] = None
    category: Optional[str] = None
    authority_id: Optional[uuid.UUID] = None

# -- Authorities & Deletions -----------------------

class AuthorityCreate(BaseModel):
    email: str
    password: str
    name: str

class SendOTPRequest(BaseModel):
    phone: str

class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str

class DeletionRequestCreate(BaseModel):
    target_user_id: uuid.UUID
    reason: Optional[str] = None

class DeletionRequestResponse(BaseModel):
    id: uuid.UUID
    target_user_id: uuid.UUID
    requested_by_id: uuid.UUID
    reason: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
