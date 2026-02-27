from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
import httpx
import os
import uuid
from datetime import datetime, timezone

from app.services.websocket_manager import ws_manager

from app.database import get_db
from app.models import RiskZone, BaselineCityCrimeStat
from app.config.settings import get_settings

router = APIRouter(tags=["Integration"])
settings = get_settings()

class RedZoneResponse(BaseModel):
    id: str
    latitude: float
    longitude: float
    radius: float
    risk_level: str

class SOSRequest(BaseModel):
    latitude: float
    longitude: float

class DirectRequestParams(BaseModel):
    latitude: float
    longitude: float
    target_guardian_id: str
    destination: str | None = None
    destination_coords: list[float] | None = None

class AcceptRequestParams(BaseModel):
    sos_id: str
    guardian_id: str
    guardian_name: str
    guardian_phone: str
    guardian_image_url: str | None = None
    latitude: float
    longitude: float

class LocationUpdate(BaseModel):
    session_id: str
    lat: float
    lng: float

class OTPGenerateParams(BaseModel):
    session_id: str
    guardian_id: str
    guardian_name: str

class OTPVerifyParams(BaseModel):
    session_id: str
    otp: str

# In-memory OTP store: session_id -> otp
_session_otps: dict[str, str] = {}

class BaselineRiskResponse(BaseModel):
    crime_type: str
    total_cases: int
    crime_rate_per_lakh: float
    weighted_score: float

@router.get("/baseline-risk", response_model=list[BaselineRiskResponse])
async def get_baseline_risk(city: str = "Indore", db: AsyncSession = Depends(get_db)):
    """
    Fetch baseline risk from Supabase (baseline_city_crime_stats).
    """
    stmt = select(BaselineCityCrimeStat).where(BaselineCityCrimeStat.city_name == city)
    result = await db.execute(stmt)
    rows = result.scalars().all()

    return [
        BaselineRiskResponse(
            crime_type=r.crime_type,
            total_cases=r.total_cases,
            crime_rate_per_lakh=r.crime_rate_per_lakh,
            weighted_score=r.weighted_score
        )
        for r in rows
    ]


@router.get("/red-zones", response_model=list[RedZoneResponse])
async def get_red_zones(db: AsyncSession = Depends(get_db)):
    """
    Fetch red zones from PostgreSQL without auth.
    """
    stmt = select(
        RiskZone.id,
        RiskZone.risk_score,
        func.ST_Y(func.ST_GeomFromWKB(RiskZone.centroid)).label("lat"),
        func.ST_X(func.ST_GeomFromWKB(RiskZone.centroid)).label("lng"),
    ).where(RiskZone.active == True)

    result = await db.execute(stmt)
    rows = result.all()

    zones = []
    for r in rows:
        # Determine risk level from score
        # Let's say risk_score > 70 is HIGH, > 40 is MODERATE, else LOW
        score = r.risk_score or 0
        if score > 70:
            level = "HIGH"
        elif score > 40:
            level = "MODERATE"
        else:
            level = "LOW"
            
        # Treat RiskZones > 40 as Red Zones for mapping, or just return all and let frontend decide.
        # Requirements imply we just return them. Let's return all active.
        
        zones.append(RedZoneResponse(
            id=str(r.id),
            latitude=r.lat,
            longitude=r.lng,
            radius=500.0, # Default radius for map overlay
            risk_level=level
        ))
        
    return zones


from app.middleware.auth import _get_current_user
from app.models import User, SOSSession
from urllib.parse import quote

from fastapi import BackgroundTasks

from fastapi import Request

@router.post("/sos")
async def trigger_sos(
    payload: SOSRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_get_current_user)
):
    """
    Trigger Telegram alert and return WhatsApp tracking info.
    """
    # 1) Check emergency contact
    if not current_user.emergency_contact_phone:
        raise HTTPException(status_code=400, detail="No emergency contact set")
        
    # 2) Create new sos_sessions record
    new_session = SOSSession(user_id=current_user.id)
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    
    session_id = str(new_session.id)
    
    # 3) Generate WhatsApp Click-to-Chat link
    contact_phone = current_user.emergency_contact_phone
    if len(contact_phone) == 10:
        contact_phone = f"91{contact_phone}"

    # If the request comes from Cloudflare tunnel, it will have x-forwarded-host or host
    forwarded_host = request.headers.get("x-forwarded-host")
    host = forwarded_host or request.headers.get("host") or "app.teamcodezilla.in"
    scheme = request.headers.get("x-forwarded-proto", "https")
    
    # Check if the frontend passed a specific origin (like Vite dev server origin)
    origin = request.headers.get("origin")
    if origin and "localhost" not in origin and "127.0.0.1" not in origin:
        domain = origin
    else:
        domain = f"{scheme}://{host}"
        
    tracking_link = f"{domain}/track/{session_id}"
    message = f"🚨 SOS Alert\n{current_user.name} has triggered an emergency.\nLive location:\n{tracking_link}"
    encoded_message = quote(message)
    whatsapp_url = f"https://wa.me/{contact_phone}?text={encoded_message}"
    
    # 4) Telegram alert (kept intact per requirements, using BackgroundTasks)
    token = os.getenv("TELEGRAM_BOT_TOKEN", settings.TELEGRAM_BOT_TOKEN)
    chat_id = os.getenv("TELEGRAM_CHAT_ID", settings.TELEGRAM_ADMIN_CHAT_ID)
    
    if token and chat_id:
        telegram_msg = f"🚨 SOS ALERT 🚨\nUser: {current_user.name}\nLocation:\nhttps://maps.google.com/?q={payload.latitude},{payload.longitude}\nTracking: {tracking_link}\nImmediate assistance required."
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        
        async def send_telegram():
            async with httpx.AsyncClient() as client:
                try:
                    await client.post(url, json={
                        "chat_id": chat_id,
                        "text": telegram_msg
                    })
                except Exception as e:
                    print(f"Failed to send Telegram message: {e}")
                    
        background_tasks.add_task(send_telegram)

    return {
        "status": "SOS sent",
        "session_id": session_id,
        "whatsapp_url": whatsapp_url
    }

class SOSLocationUpdate(BaseModel):
    session_id: str
    latitude: float
    longitude: float

@router.post("/sos/location")
async def update_sos_location(
    payload: SOSLocationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_get_current_user)
):
    from app.models import SOSLocation
    result = await db.execute(select(SOSSession).where(
        SOSSession.id == payload.session_id,
        SOSSession.user_id == current_user.id
    ))
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or forbidden")
    if not session.active:
        raise HTTPException(status_code=400, detail="Session is not active")
        
    loc = SOSLocation(
        session_id=session.id,
        latitude=payload.latitude,
        longitude=payload.longitude
    )
    db.add(loc)
    await db.commit()
    return {"status": "success"}

@router.get("/sos/location/{session_id}")
async def get_sos_location(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    from app.models import SOSLocation
    result = await db.execute(select(SOSSession).where(SOSSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    locs_result = await db.execute(
        select(SOSLocation)
        .where(SOSLocation.session_id == session_id)
        .order_by(SOSLocation.created_at.desc())
        .limit(50)
    )
    locs = locs_result.scalars().all()
    # Return chronologically
    locs_list = list(locs)[::-1]
    
    return {
        "active": session.active,
        "locations": [
            {"lat": l.latitude, "lng": l.longitude, "time": l.created_at.isoformat()}
            for l in locs_list
        ]
    }


@router.post("/direct-request")
async def trigger_direct_request(payload: DirectRequestParams):
    """
    Trigger a direct support request to a specific guardian.
    """
    await ws_manager.broadcast_guardian({
        "type": "direct_request",
        "sos_id": f"direct-{uuid.uuid4()}",
        "user_id": "citizen-direct",
        "user_name": "Citizen Request",
        "lat": payload.latitude,
        "lng": payload.longitude,
        "target_guardian_id": payload.target_guardian_id,
        "destination": payload.destination,
        "destination_coords": payload.destination_coords,
        "triggered_at": datetime.now(timezone.utc).isoformat(),
    })
    
    return {"status": "Direct request sent"}

@router.post("/accept-request")
async def accept_request(payload: AcceptRequestParams):
    """
    Guardian accepts a request, notify the citizen.
    """
    await ws_manager.broadcast_citizen({
        "type": "request_accepted",
        "sos_id": payload.sos_id,
        "guardian_id": payload.guardian_id,
        "guardian_name": payload.guardian_name,
        "guardian_phone": payload.guardian_phone,
        "guardian_image_url": payload.guardian_image_url,
        "lat": payload.latitude,
        "lng": payload.longitude,
        "accepted_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"status": "Request accepted"}


@router.post("/update-citizen-location")
async def update_citizen_location(payload: LocationUpdate):
    """Citizen broadcasts their live location to guardian."""
    await ws_manager.broadcast_guardian({
        "type": "citizen_location",
        "session_id": payload.session_id,
        "lat": payload.lat,
        "lng": payload.lng,
    })
    return {"status": "ok"}


@router.post("/update-guardian-location")
async def update_guardian_location(payload: LocationUpdate):
    """Guardian broadcasts their live location to citizen."""
    await ws_manager.broadcast_citizen({
        "type": "guardian_location",
        "session_id": payload.session_id,
        "lat": payload.lat,
        "lng": payload.lng,
    })
    return {"status": "ok"}


@router.post("/generate-verification-otp")
async def generate_verification_otp(payload: OTPGenerateParams):
    """Guardian generates a 4-digit OTP when they arrive at citizen location."""
    import random
    otp = str(random.randint(1000, 9999))
    _session_otps[payload.session_id] = otp
    # Send OTP to citizen via WebSocket
    await ws_manager.broadcast_citizen({
        "type": "verification_otp",
        "session_id": payload.session_id,
        "otp": otp,
        "guardian_name": payload.guardian_name,
    })
    # Return OTP to guardian so they can show it
    return {"otp": otp}


@router.post("/verify-otp")
async def verify_otp(payload: OTPVerifyParams):
    """Citizen submits OTP to confirm guardian identity."""
    expected = _session_otps.get(payload.session_id)
    if not expected:
        return {"verified": False, "reason": "No OTP found for this session"}
    if payload.otp.strip() == expected:
        del _session_otps[payload.session_id]
        # Notify guardian that citizen verified them
        await ws_manager.broadcast_guardian({
            "type": "otp_verified",
            "session_id": payload.session_id,
        })
        return {"verified": True}
    return {"verified": False, "reason": "Incorrect code"}
