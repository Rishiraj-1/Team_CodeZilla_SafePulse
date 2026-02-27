import sys
import asyncio
from pathlib import Path

# Add backend directory to sys.path so app module can be imported
sys.path.append(str(Path(__file__).parent))

from sqlalchemy import text
from app.database.session import engine

async def migrate():
    eng = engine()
    async with eng.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20) NULL;"))
            print("Successfully added emergency_contact_phone to users table.")
        except Exception as e:
            print(f"Error during migration: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
