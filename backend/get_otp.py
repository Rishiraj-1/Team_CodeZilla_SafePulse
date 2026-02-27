import asyncio
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy import select
from app.database.session import _get_engine
from app.models import PhoneOTP
async def get():
    engine = _get_engine()
    async with engine.begin() as conn:
        res = await conn.execute(select(PhoneOTP.id, PhoneOTP.phone, PhoneOTP.verified))
        for row in res.all():
            print(f"ID={row.id}, Phone={row.phone}, Verified={row.verified}")
if __name__ == "__main__":
    asyncio.run(get())
