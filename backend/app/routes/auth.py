"""
Authentication routes for generating JWT tokens and processing signups.
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User, UserRole, UserStatus
from app.schemas.schemas import UserCreate, UserResponse, UserLogin, Token, SupabaseSync
from app.utils.security import verify_password, get_password_hash, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/sync", response_model=UserResponse)
async def sync_supabase_user(payload: SupabaseSync, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == payload.id))
    user = result.scalar_one_or_none()
    
    if not user:
        email_res = await db.execute(select(User).where(User.email == payload.email))
        user = email_res.scalar_one_or_none()
        
    if user:
        # Prevent duplicate inserts if record already exists
        return user
        
    role_upper = payload.role.upper()
    assigned_role = UserRole.CITIZEN
    assigned_status = UserStatus.ACTIVE
    
    if role_upper == "AUTHORITY":
        assigned_role = UserRole.AUTHORITY
        assigned_status = UserStatus.PENDING_VERIFICATION
    elif role_upper == "GUARDIAN":
        assigned_role = UserRole.GUARDIAN
        assigned_status = UserStatus.PENDING_VERIFICATION
        
    new_user = User(
        id=payload.id,
        email=payload.email,
        name=payload.name,
        password_hash="",
        role=assigned_role,
        status=assigned_status,
        authority_id=None
    )
    db.add(new_user)
    try:
        await db.commit()
        await db.refresh(new_user)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Database insertion failed")
        
    return new_user

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")
        
    # Default to ACTIVE. If guardian, set to PENDING_VERIFICATION. Citizen needs email verification
    initial_status = UserStatus.ACTIVE if payload.role == UserRole.CITIZEN else UserStatus.PENDING_VERIFICATION
    
    # Do not allow someone to sign up as ADMIN or AUTHORITY via the generic endpoint
    if payload.role in [UserRole.ADMIN, UserRole.AUTHORITY]:
        raise HTTPException(status_code=403, detail="Cannot register as Authority or Admin")

    if payload.role in [UserRole.CITIZEN, UserRole.GUARDIAN]:
        if not payload.authority_id:
            raise HTTPException(status_code=400, detail="authority_id is required for Citizen and Guardian roles")
        
        # Verify valid AUTHORITY
        authority = await db.execute(select(User).where(User.id == payload.authority_id, User.role == UserRole.AUTHORITY))
        if not authority.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Invalid authority_id: Must refer to an existing Authority")

    user = User(
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        name=payload.name,
        phone=payload.phone,
        gender=payload.gender,
        institution=payload.institution,
        role=payload.role,
        status=initial_status,
        authority_id=payload.authority_id,
        category=payload.category,
        aadhaar_number=payload.aadhaar_number,
        document_url=payload.document_url
    )
    db.add(user)
    await db.flush()
    return user

@router.post("/login", response_model=Token)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value},
        expires_delta=timedelta(days=7) # extended for MVP convenience
    )
    return {"access_token": access_token, "token_type": "bearer"}
