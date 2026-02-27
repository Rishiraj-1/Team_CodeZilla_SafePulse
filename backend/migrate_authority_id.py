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
            await conn.execute(text("ALTER TABLE users ADD COLUMN authority_id UUID REFERENCES users(id);"))
            print("Successfully added authority_id column.")
        except Exception as e:
            if "already exists" in str(e):
                print("Column already exists.")
            else:
                print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(run_migration())
