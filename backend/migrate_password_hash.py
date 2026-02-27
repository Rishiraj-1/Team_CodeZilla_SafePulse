import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("DATABASE_URL")
if not url:
    print("NO DB URL")
    exit(1)
    
engine = create_async_engine(url)

async def run_migration():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);"))
            print("Successfully added password_hash column.")
        except Exception as e:
            if "already exists" in str(e):
                print("password_hash Column already exists.")
            else:
                print(f"Error adding password_hash: {e}")
                
        try:
            # Also setting default value for existing rows so they aren't null breaking constraints
            await conn.execute(text("UPDATE users SET password_hash = '' WHERE password_hash IS NULL;"))
            await conn.execute(text("ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;"))
            print("Successfully set password_hash not null constraint.")
        except Exception as e:
            print(f"Error updating constraint: {e}")

if __name__ == "__main__":
    asyncio.run(run_migration())
