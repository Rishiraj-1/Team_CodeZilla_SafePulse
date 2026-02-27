"""
User management routes.
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
import random
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.middleware.auth import _get_current_user, require_role
from app.models import User, UserRole, UserStatus, DeletionRequest, GuardianCategory, PhoneOTP
from app.schemas.schemas import UserCreate, UserResponse, AuthorityCreate, DeletionRequestCreate, DeletionRequestResponse, RoleUpgradeRequest, SendOTPRequest, VerifyOTPRequest
from app.utils.security import get_password_hash, verify_password
from app.utils.email import send_application_decision_email
from app.utils import logger
from pydantic import BaseModel

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(_get_current_user)):
    """Return profile of the currently authenticated user."""
    return UserResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        status=user.status,
        authority_id=user.authority_id,
        name=user.name,
        phone=user.phone,
        phone_verified=user.phone_verified or False,
        gender=user.gender,
        category=user.category,
        document_url=user.document_url,
        profile_image_url=user.profile_image_url,
        institution=user.institution,
        created_at=user.created_at,
    )


class ProfileImageRequest(BaseModel):
    profile_image_url: str


@router.post("/me/upload-profile-image")
async def upload_profile_image(
    body: ProfileImageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    """Guardian-only: save their Supabase Storage profile image URL."""
    if current_user.role != UserRole.GUARDIAN:
        raise HTTPException(403, "Only guardians can upload a profile image")
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    user.profile_image_url = body.profile_image_url
    await db.commit()
    return {"message": "Profile image updated", "profile_image_url": body.profile_image_url}


@router.get("/guardian/profile-status")
async def get_guardian_profile_status(
    current_user: User = Depends(_get_current_user),
):
    """Return profile completeness for guardians."""
    if current_user.role != UserRole.GUARDIAN:
        raise HTTPException(403, "Not a guardian")
    missing = []
    if not current_user.profile_image_url:
        missing.append("profile_image")
    if not current_user.gender:
        missing.append("gender")
    if not current_user.phone_verified:
        missing.append("phone_verified")
    return {"complete": len(missing) == 0, "missing": missing}


@router.post("/request-role-upgrade")
async def request_role_upgrade(
    payload: RoleUpgradeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_get_current_user)
):
    if payload.role not in ["guardian", "authority", "citizen"]:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if payload.role == "authority":
        payload.authority_id = None
    elif payload.role in ["guardian", "citizen"]:
        if not payload.authority_id:
            raise HTTPException(status_code=400, detail="authority_id is required for Guardian and Citizen roles")
        
        # Verify valid AUTHORITY
        authority = await db.execute(select(User).where(User.id == payload.authority_id, User.role == UserRole.AUTHORITY))
        if not authority.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Invalid authority_id")

    if payload.role in ["guardian", "authority"]:
        if not payload.mobile:
            raise HTTPException(status_code=400, detail="mobile required")
        if payload.role == "guardian" and not payload.category:
            raise HTTPException(status_code=400, detail="category required for guardian")
            
        # Verify that an OTP was successfully verified for this phone number
        phone_otp_res = await db.execute(
            select(PhoneOTP)
            .where(PhoneOTP.phone == payload.mobile)
            .where(PhoneOTP.verified == True)
            .order_by(PhoneOTP.created_at.desc())
        )
        phone_otp = phone_otp_res.scalars().first()
        if not phone_otp:
            raise HTTPException(status_code=400, detail="Phone number not verified via OTP")
            
        user.role = UserRole.GUARDIAN if payload.role == "guardian" else UserRole.AUTHORITY
        user.phone = payload.mobile
        user.gender = payload.gender
        user.phone_verified = True
        user.status = UserStatus.PENDING_VERIFICATION
        
        # Delete the OTP record since it has been consumed
        await db.execute(delete(PhoneOTP).where(PhoneOTP.id == phone_otp.id))
        
        if payload.role == "guardian":
            user.category = GuardianCategory[payload.category] if hasattr(GuardianCategory, payload.category) else GuardianCategory.NSS_VOLUNTEER
            
        user.authority_id = payload.authority_id
            
    else:
        # Just update citizen gender
        user.gender = payload.gender
        user.phone = payload.mobile
        user.authority_id = payload.authority_id

    await db.commit()
    return {"message": "success"}

from pydantic import BaseModel
class UpdateProfileRequest(BaseModel):
    gender: str | None = None
    phone: str | None = None
    authority_id: str | None = None

@router.post("/update-profile")
async def update_profile(
    payload: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_get_current_user)
):
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if payload.gender:
        user.gender = payload.gender
    if payload.phone:
        user.phone = payload.phone
    if payload.authority_id:
        # Verify valid AUTHORITY
        authority = await db.execute(select(User).where(User.id == payload.authority_id, User.role == UserRole.AUTHORITY))
        if not authority.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Invalid authority_id")
        user.authority_id = payload.authority_id

    await db.commit()
    return {"message": "success"}



# ── Public/Shared Functions ────────────────────────
@router.get("/authorities")
async def get_authorities(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User.id, User.name, User.institution).where(User.role == UserRole.AUTHORITY))
    authorities = result.all()
    return [{"id": str(a.id), "name": a.name, "institution": a.institution} for a in authorities]

# ── Authority & Admin Functions ──────────────────────

@router.get("/authorities/pending", response_model=list[UserResponse])
async def get_pending_authorities(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    print(f"[DEBUG] Fetching pending authorities for ADMIN: {current_user.email}")
    query = select(User).where(User.role == UserRole.AUTHORITY, User.status == UserStatus.PENDING_VERIFICATION)
    result = await db.execute(query)
    authorities = result.scalars().all()
    print(f"[DEBUG] Found {len(authorities)} pending authorities in DB.")
    return authorities

@router.post("/authorities/{user_id}/approve", status_code=status.HTTP_200_OK)
async def approve_authority(
    user_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    query = select(User).where(User.id == user_id, User.role == UserRole.AUTHORITY)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Authority application not found")
    user.status = UserStatus.ACTIVE
    await db.commit()
    
    background_tasks.add_task(send_application_decision_email, user.email, user.name, "APPROVED")
    return {"message": "Authority approved and notification sent."}

@router.post("/authorities/{user_id}/reject", status_code=status.HTTP_200_OK)
async def reject_authority(
    user_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    query = select(User).where(User.id == user_id, User.role == UserRole.AUTHORITY)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Authority application not found")
    
    # We can delete the user record or set status to REJECTED. The prompt suggests "Delete user record or set status = REJECTED".
    # I will set status to REJECTED.
    user.status = UserStatus.REJECTED
    await db.commit()
    
    background_tasks.add_task(send_application_decision_email, user.email, user.name, "REJECTED")
    return {"message": "Authority application rejected and notification sent."}


@router.get("/authorities/active", response_model=list[UserResponse])
async def get_active_authorities(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    query = select(User).where(User.role == UserRole.AUTHORITY, User.status == UserStatus.ACTIVE)
    result = await db.execute(query)
    return result.scalars().all()


@router.delete("/authorities/{user_id}", status_code=status.HTTP_200_OK)
async def delete_authority(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    query = select(User).where(User.id == user_id, User.role == UserRole.AUTHORITY)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Authority not found")
        
    # Unlink any users tied to this authority to prevent foreign key constraint failures
    await db.execute(update(User).where(User.authority_id == user.id).values(authority_id=None))
    
    # Delete the authority from public.users
    await db.delete(user)
    await db.commit()
    return {"message": "Authority deleted successfully."}


@router.get("/guardians/pending", response_model=list[UserResponse])
async def get_pending_guardians(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.AUTHORITY, UserRole.ADMIN))
):
    query = select(User).where(User.role == UserRole.GUARDIAN, User.status == UserStatus.PENDING_VERIFICATION)
    if current_user.role == UserRole.AUTHORITY:
        query = query.where(User.authority_id == current_user.id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/guardians/active", response_model=list[UserResponse])
async def get_active_guardians(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.AUTHORITY, UserRole.ADMIN))
):
    query = select(User).where(User.role == UserRole.GUARDIAN, User.status == UserStatus.ACTIVE)
    if current_user.role == UserRole.AUTHORITY:
        query = query.where(User.authority_id == current_user.id)
    result = await db.execute(query)
    return result.scalars().all()


@router.delete("/guardians/{user_id}", status_code=status.HTTP_200_OK)
async def delete_guardian(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.AUTHORITY, UserRole.ADMIN))
):
    query = select(User).where(User.id == user_id, User.role == UserRole.GUARDIAN)
    if current_user.role == UserRole.AUTHORITY:
        query = query.where(User.authority_id == current_user.id)
        
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Guardian not found")
        
    await db.delete(user)
    await db.commit()
    return {"message": "Guardian deleted successfully."}


@router.post("/guardians/{user_id}/approve", status_code=status.HTTP_200_OK)
async def approve_guardian(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.AUTHORITY, UserRole.ADMIN))
):
    query = select(User).where(User.id == user_id)
    if current_user.role == UserRole.AUTHORITY:
        query = query.where(User.authority_id == current_user.id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found or you don't have access")
    user.status = UserStatus.POLICE_VERIFICATION_PENDING
    await db.commit()
    return {"message": "Guardian approved. Sent email verification link (simulated) -> Police verification pending."}

@router.post("/guardians/{user_id}/reject", status_code=status.HTTP_200_OK)
async def reject_guardian(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.AUTHORITY, UserRole.ADMIN))
):
    query = select(User).where(User.id == user_id)
    if current_user.role == UserRole.AUTHORITY:
        query = query.where(User.authority_id == current_user.id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found or you don't have access")
    user.status = UserStatus.REJECTED
    await db.commit()
    return {"message": "Guardian application rejected."}

@router.post("/guardians/{user_id}/police-verify", status_code=status.HTTP_200_OK)
async def police_verify_guardian(
    user_id: str,
    approved: bool,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.AUTHORITY, UserRole.ADMIN))
):
    query = select(User).where(User.id == user_id)
    if current_user.role == UserRole.AUTHORITY:
        query = query.where(User.authority_id == current_user.id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user or user.status != UserStatus.POLICE_VERIFICATION_PENDING:
        raise HTTPException(status_code=400, detail="User not found or not in correct state")
    user.status = UserStatus.ACTIVE if approved else UserStatus.REJECTED
    await db.commit()
    return {"message": "Guardian is now Active" if approved else "Guardian Police Verification Rejected"}

@router.post("/deletion-request", response_model=DeletionRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_deletion_request(
    payload: DeletionRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.AUTHORITY))
):
    # Verify the target user belongs to this authority
    target = await db.execute(select(User).where(User.id == payload.target_user_id, User.authority_id == current_user.id))
    if not target.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Cannot request deletion for a user not under your authority")

    req = DeletionRequest(
        target_user_id=payload.target_user_id,
        requested_by_id=current_user.id,
        reason=payload.reason,
        status="PENDING"
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return req

# ── Admin Only Functions ────────────────────────────

@router.get("/deletion-requests", response_model=list[DeletionRequestResponse])
async def get_deletion_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    result = await db.execute(select(DeletionRequest).where(DeletionRequest.status == "PENDING"))
    return result.scalars().all()

@router.post("/deletion-requests/{req_id}/resolve", status_code=status.HTTP_200_OK)
async def resolve_deletion_request(
    req_id: str,
    approve: bool,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    result = await db.execute(select(DeletionRequest).where(DeletionRequest.id == req_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    req.status = "APPROVED" if approve else "REJECTED"
    
    if approve:
        target_result = await db.execute(select(User).where(User.id == req.target_user_id))
        target = target_result.scalar_one_or_none()
        if target:
            # MVP deletion: suspend or delete from DB. Let's delete.
            await db.delete(target)
            
    await db.commit()
    return {"message": f"Deletion request {req.status}"}

@router.post("/authority", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_authority(
    payload: AuthorityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
         raise HTTPException(status_code=409, detail="Email already registered")
         
    user = User(
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        name=payload.name,
        role=UserRole.AUTHORITY,
        status=UserStatus.ACTIVE,
        institution="Internal Authority"
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
