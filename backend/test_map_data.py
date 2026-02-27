import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User, UserRole, UserStatus
from app.routes.map import get_map_data
from app.middleware.auth import _get_current_user

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == 'admin@safepulse.com'))
        admin = result.scalar_one_or_none()
        
        # Test the query that map.py is running:
        query = select(User).where(User.role != UserRole.ADMIN, User.status == UserStatus.ACTIVE)
        res = await db.execute(query)
        users = res.scalars().all()
        
        print(f"Total active non-admin users: {len(users)}")
        for u in users:
            print(f"User {u.email}: Role {u.role.value}, Status {u.status.value}")

asyncio.run(main())
