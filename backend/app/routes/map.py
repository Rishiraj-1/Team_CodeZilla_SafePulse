from fastapi import APIRouter, Depends
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
import hashlib
from typing import Optional, List

from app.database import get_db
from app.middleware.auth import _get_current_user
from app.models import User, UserRole, UserStatus
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["Map"])


class MapUserItem(BaseModel):
    id: str
    lat: float
    lng: float
    name: str
    status: str
    profile_image_url: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        from_attributes = True


class MapDataResponse(BaseModel):
    citizens: List[MapUserItem]
    guardians: List[MapUserItem]
    authorities: List[MapUserItem]


@router.get("/map-data")
async def get_map_data(
    authority_id: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_get_current_user)
):
    query = select(User).where(User.role != UserRole.ADMIN, User.status == UserStatus.ACTIVE)
    
    if current_user.role == UserRole.AUTHORITY:
        query = query.where(
            or_(
                User.id == current_user.id,
                User.authority_id == current_user.id
            )
        )
    elif current_user.role == UserRole.ADMIN and authority_id:
        import uuid
        try:
            auth_uuid = uuid.UUID(authority_id)
            query = query.where(
                or_(
                    User.id == auth_uuid,
                    User.authority_id == auth_uuid
                )
            )
        except ValueError:
            pass
        
    result = await db.execute(query)
    users = result.scalars().all()
    
    citizens = []
    guardians = []
    authorities = []
    
    for u in users:
        hash_val = int(hashlib.md5(str(u.id).encode()).hexdigest()[:8], 16)
        lat_offset = ((hash_val % 1000) - 500) / 25000.0
        lng_offset = (((hash_val // 1000) % 1000) - 500) / 25000.0
        
        item = MapUserItem(
            id=str(u.id),
            lat=18.7537 + lat_offset,
            lng=73.4129 + lng_offset,
            name=u.name,
            status=u.status.value,
            profile_image_url=u.profile_image_url,
            gender=u.gender,
            phone=u.phone,
        )
        if u.role == UserRole.CITIZEN:
            citizens.append(item)
        elif u.role == UserRole.GUARDIAN:
            # Only include guardians with complete profiles
            profile_complete = bool(u.profile_image_url and u.gender and u.phone_verified)
            if profile_complete:
                guardians.append(item)
        elif u.role == UserRole.AUTHORITY:
            authorities.append(item)
            
    return MapDataResponse(
        citizens=citizens, 
        guardians=guardians, 
        authorities=authorities
    )
