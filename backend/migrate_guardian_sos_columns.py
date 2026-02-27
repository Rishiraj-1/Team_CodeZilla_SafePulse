"""
One-shot migration: add new guardian SOS columns to the users table.

Adds:
  - telegram_chat_id  VARCHAR(100)
  - availability_status  guardianavailabilitystatus  (ON_DUTY / OFF_DUTY)
  - online_status         guardianonlinestatus        (ONLINE / OFFLINE)

Also creates the required enum types if they don't exist yet.
Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS pattern).
"""

import asyncio
import os
import sys

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env")
    sys.exit(1)

import asyncpg

# asyncpg needs the plain postgresql:// URL (not +asyncpg prefix)
PG_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")


async def run():
    conn = await asyncpg.connect(PG_URL)
    try:
        print("Connected to Supabase PostgreSQL.")

        # 1. Create enum types (idempotent)
        await conn.execute("""
            DO $$ BEGIN
                CREATE TYPE guardianavailabilitystatus AS ENUM ('ON_DUTY', 'OFF_DUTY');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        """)
        print("✓ guardianavailabilitystatus enum")

        await conn.execute("""
            DO $$ BEGIN
                CREATE TYPE guardianonlinestatus AS ENUM ('ONLINE', 'OFFLINE');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        """)
        print("✓ guardianonlinestatus enum")

        await conn.execute("""
            DO $$ BEGIN
                CREATE TYPE guardianalertstatus AS ENUM ('NEW', 'ACCEPTED', 'DECLINED');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        """)
        print("✓ guardianalertstatus enum")

        # 2. Add columns to users table (safe, IF NOT EXISTS)
        await conn.execute("""
            ALTER TABLE users
                ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(100),
                ADD COLUMN IF NOT EXISTS availability_status guardianavailabilitystatus DEFAULT 'OFF_DUTY',
                ADD COLUMN IF NOT EXISTS online_status guardianonlinestatus DEFAULT 'OFFLINE';
        """)
        print("✓ Added telegram_chat_id, availability_status, online_status to users")

        # 3. Verify sos_events has the ASSIGNED status in its enum
        # Check if ASSIGNED already exists in sosstatusenum
        await conn.execute("""
            DO $$ BEGIN
                ALTER TYPE sosstatusenum ADD VALUE IF NOT EXISTS 'ASSIGNED';
            EXCEPTION WHEN others THEN NULL;
            END $$;
        """)
        print("✓ Ensured ASSIGNED value in sosstatusenum")

        print("\n✅ Migration complete!")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
