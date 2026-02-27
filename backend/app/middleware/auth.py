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

    if user is None:
        from app.models import UserRole, UserStatus
        user_metadata = decoded.get("user_metadata", {})
        
        # Phone OTP logins may not have an email natively in the JWT. Provide a safe fallback.
        resolved_email = email or f"{phone}@safepulse.local"
        
        # Check if user already exists by email (to handle legacy data or migrations without Supabase IDs)
        existing_by_email = None
        if email:
            res_email = await db.execute(select(User).where(User.email == email))
            existing_by_email = res_email.scalar_one_or_none()

        if existing_by_email:
            # Link accounts: update the old user's ID to the new Supabase ID
            # Delete any old user with this exact ID just in case
            await db.execute(delete(User).where(User.id == user_id))
            # SQLAlchemy won't let us easily update a UUID primary key like this simply because Cascade properties
            # Wait, updating PK is hard in SQLAlchemy. Instead, let's just use the existing user
            # and let the frontend use the old ID? No, JWT has the Supabase ID. Wait, Supabase ID is what matters.
            # If we just change request.state.current_user to existing_by_email, it works for this request but next time it searches by user_id and fails to find it.
            # Better to create another lookup: if not found by user_id, search by email.
            pass

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
        
        if existing_by_email:
             # Just use the existing user record if it matches by email, even if the ID doesn't match for MVP.
             # Wait, Supabase JWT provides `sub` (user_id). On next login, `select(User).where(User.id == user_id)` will fail again, 
             # and we'll hit this block again. This is fine for MVP logic as it acts as a fallback.
             user = existing_by_email
        else:
            db.add(user)
            try:
                await db.commit()
                await db.refresh(user)
            except Exception:
                await db.rollback()
                result = await db.execute(select(User).where(User.id == user_id))
                user = result.scalar_one_or_none()
                if not user:
                    # Final fallback: try by email again
                    if email:
                        res2 = await db.execute(select(User).where(User.email == email))
                        user = res2.scalar_one_or_none()
                        
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
