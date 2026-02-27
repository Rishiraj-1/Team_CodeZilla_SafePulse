"""
JWT verification middleware for SafePulse.
Extracts user identity and role from the Authorization header.
"""

from typing import Optional
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, UserRole
from app.config.settings import get_settings
from app.utils.security import ALGORITHM
from app.utils.logging import logger

settings = get_settings()
security = HTTPBearer(auto_error=False)

async def _get_current_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Verify PyJWT and return the corresponding database user."""
    if creds is None:
        logger.warning("Auth error: Missing authorization header (creds is None)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )

    token = creds.credentials
    try:
        if settings.JWT_SECRET == "safepulse-super-secret-key-for-mvp":
            # Bypass validation when using Supabase without configuring the backend's JWT_SECRET
            decoded = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
        else:
            decoded = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM], options={"verify_aud": False})
    except jwt.ExpiredSignatureError:
        logger.warning("Auth error: Token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        )

    email: str = decoded.get("email")
    phone: str = decoded.get("phone")
    user_id: str = decoded.get("sub")
    
    if not user_id or (not email and not phone):
         raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing identity fields (email or phone)",
        )

    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    # Check if user exists by email if ID not found (important for migrations)
    if user is None and email:
        res_email = await db.execute(select(User).where(User.email == email))
        user = res_email.scalar_one_or_none()

    if user is None:
        from app.models import UserRole, UserStatus
        user_metadata = decoded.get("user_metadata", {})
        
        # Phone OTP logins may not have an email natively in the JWT. Provide a safe fallback.
        resolved_email = email or f"{phone}@safepulse.local"

        # Extract role from metadata if frontend passed it during signup
        meta_role = user_metadata.get("role")
        assigned_role = UserRole.CITIZEN
        assigned_status = UserStatus.ACTIVE
        
        if meta_role:
            meta_role_upper = str(meta_role).upper()
            if meta_role_upper == "AUTHORITY":
                assigned_role = UserRole.AUTHORITY
                assigned_status = UserStatus.PENDING_VERIFICATION
            elif meta_role_upper == "GUARDIAN":
                assigned_role = UserRole.GUARDIAN
                assigned_status = UserStatus.PENDING_VERIFICATION

        user = User(
            id=user_id,
            email=resolved_email,
            phone=phone,
            password_hash="",
            role=assigned_role,
            status=assigned_status,
            name=user_metadata.get("full_name") or (email.split("@")[0] if email else "User"),
            gender=None
        )
        
        db.add(user)
        try:
            await db.commit()
            await db.refresh(user)
        except Exception:
            await db.rollback()
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if not user:
                raise HTTPException(status_code=500, detail="Failed to create user profile")

    request.state.current_user = user
    return user


async def get_current_active_user(user: User = Depends(_get_current_user)) -> User:
    from app.models import UserStatus
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "account_inactive", "status": user.status.value}
        )
    return user


def get_current_user():
    """Dependency shorthand."""
    return Depends(get_current_active_user)


def require_role(*roles: UserRole):
    """
    Returns a FastAPI dependency that checks the user has one
    of the specified roles.
    """

    async def _check(user: User = Depends(get_current_active_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": "insufficient_permissions"}
            )
            
        if user.role in [UserRole.GUARDIAN, UserRole.AUTHORITY] and not user.phone_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": "phone_verification_required", "message": "Phone verification is required for this role"}
            )
            
        return user

    return _check
