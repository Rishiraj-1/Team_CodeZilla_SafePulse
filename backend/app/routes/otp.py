import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from twilio.rest import Client

from app.database import get_db
from app.models import User, UserRole, PhoneOTP
from app.schemas.schemas import SendOTPRequest, VerifyOTPRequest
from app.utils.security import get_password_hash, verify_password
from app.config.settings import get_settings

router = APIRouter(prefix="/api/otp", tags=["OTP"])
settings = get_settings()

@router.post("/send")
async def send_otp(
    payload: SendOTPRequest,
    db: AsyncSession = Depends(get_db)
):
    # Validate phone (basic check)
    if not payload.phone or not payload.phone.startswith("+"):
        raise HTTPException(status_code=400, detail="Phone must be in E.164 format (e.g., +91XXXXXXXXXX)")

    # Rate limiting: Max 3 OTP sends per 10 minutes for this phone number
    ten_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=10)
    recent_otps_query = await db.execute(
        select(PhoneOTP)
        .where(PhoneOTP.phone == payload.phone)
        .where(PhoneOTP.created_at >= ten_mins_ago)
    )
    if len(recent_otps_query.scalars().all()) >= 3:
        raise HTTPException(status_code=429, detail="Rate limit exceeded: Max 3 OTP sends per 10 minutes")

    otp = str(random.randint(100000, 999999))
    otp_hash = get_password_hash(otp)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    # Delete existing unverified OTPs for that phone
    await db.execute(delete(PhoneOTP).where(PhoneOTP.phone == payload.phone, PhoneOTP.verified == False))

    record = PhoneOTP(
        user_id=None,
        phone=payload.phone,
        otp_hash=otp_hash,
        attempts=0,
        verified=False,
        expires_at=expires_at
    )
    db.add(record)
    await db.commit()

    # Send SMS via Twilio using MessagingServiceSid
    try:
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_MESSAGING_SERVICE_SID:
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            client.messages.create(
                messaging_service_sid=settings.TWILIO_MESSAGING_SERVICE_SID,
                to=payload.phone,
                body=f"SafePulse Verification Code: {otp}. Expires in 5 minutes."
            )
        else:
            print(f"Twilio not configured. Dummy send: SafePulse Verification Code: {otp}. Expires in 5 minutes.")
    except Exception as e:
        print(f"Error sending SMS via Twilio: {e}")
        print(f"FALLBACK - Use this OTP to verify: {otp}")
        # Not failing the DB commit if Twilio fails for now
    
    return {"success": True, "message": "OTP sent"}

@router.post("/verify")
async def verify_otp(
    payload: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PhoneOTP)
        .where(PhoneOTP.phone == payload.phone)
        .where(PhoneOTP.verified == False)
        .order_by(PhoneOTP.created_at.desc())
    )
    record = result.scalars().first()

    if not record:
        raise HTTPException(status_code=400, detail="No OTP requested for this phone number")

    if record.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")

    if record.attempts >= 5:
        raise HTTPException(status_code=400, detail="Maximum attempts reached. Please request a new OTP.")

    if not verify_password(payload.otp, record.otp_hash):
        record.attempts += 1
        await db.commit()
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # If valid: mark as verified
    record.verified = True
    await db.commit()

    return {"success": True, "message": "Phone verified successfully"}

    return {"success": True, "message": "Phone verified successfully"}
