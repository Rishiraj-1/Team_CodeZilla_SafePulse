"""Run the SafePulse schema migration against Supabase."""
import asyncio
import asyncpg


MIGRATION_SQL = """
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enum Types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
        CREATE TYPE userrole AS ENUM ('USER', 'GUARDIAN', 'ADMIN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reportcategory') THEN
        CREATE TYPE reportcategory AS ENUM ('DARKNESS', 'LOITERING', 'HARASSMENT', 'OTHER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guardiansessionstatus') THEN
        CREATE TYPE guardiansessionstatus AS ENUM ('REQUESTED', 'ACCEPTED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sosstatus') THEN
        CREATE TYPE sosstatus AS ENUM ('ACTIVE', 'RESOLVED');
    END IF;
END$$;

-- Users
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    role        userrole NOT NULL DEFAULT 'USER',
    name        VARCHAR(255) NOT NULL,
    phone       VARCHAR(20),
    institution VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users (firebase_uid);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    location    GEOGRAPHY(Point, 4326) NOT NULL,
    category    reportcategory NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_reports_location ON reports USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports (created_at);

-- Risk Zones
CREATE TABLE IF NOT EXISTS risk_zones (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centroid    GEOGRAPHY(Point, 4326) NOT NULL,
    polygon     GEOGRAPHY(Polygon, 4326),
    risk_score  INTEGER NOT NULL DEFAULT 0,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_risk_zones_centroid ON risk_zones USING GIST (centroid);
CREATE INDEX IF NOT EXISTS idx_risk_zones_active ON risk_zones (active);

-- Guardian Sessions
CREATE TABLE IF NOT EXISTS guardian_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    guardian_id     UUID REFERENCES users(id),
    status          guardiansessionstatus NOT NULL DEFAULT 'REQUESTED',
    start_time      TIMESTAMPTZ,
    end_time        TIMESTAMPTZ,
    pickup_location GEOGRAPHY(Point, 4326)
);
CREATE INDEX IF NOT EXISTS idx_guardian_sessions_status ON guardian_sessions (status);

-- SOS Events
CREATE TABLE IF NOT EXISTS sos_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    location    GEOGRAPHY(Point, 4326) NOT NULL,
    status      sosstatus NOT NULL DEFAULT 'ACTIVE',
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sos_events_status ON sos_events (status);
CREATE INDEX IF NOT EXISTS idx_sos_events_location ON sos_events USING GIST (location);

-- Checkins (Silent Witness)
CREATE TABLE IF NOT EXISTS checkins (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id   UUID NOT NULL REFERENCES users(id),
    location  GEOGRAPHY(Point, 4326) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_checkins_user_ts ON checkins (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_location ON checkins USING GIST (location);

-- NCRB Baseline Crime Stats (v2 – Oracle NCRB integration)
CREATE TABLE IF NOT EXISTS baseline_city_crime_stats (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_name           VARCHAR(100) NOT NULL,
    year                INTEGER NOT NULL,
    crime_type          VARCHAR(200) NOT NULL,
    total_cases         INTEGER NOT NULL DEFAULT 0,
    crime_rate_per_lakh NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    weighted_score      NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_baseline_city_year
    ON baseline_city_crime_stats (city_name, year);
CREATE INDEX IF NOT EXISTS idx_baseline_city
    ON baseline_city_crime_stats (city_name);
"""


async def run():
    conn = await asyncpg.connect(
        host="aws-1-ap-south-1.pooler.supabase.com",
        port=5432,
        user="postgres.avplsonmppbsjkpsqxsw",
        password="qHWn5AClqPc6gRdm",
        database="postgres",
        ssl="prefer",
    )
    print("Connected to Supabase...")

    try:
        await conn.execute(MIGRATION_SQL)
        print("✅ Migration complete! All tables created.")

        # Verify
        tables = await conn.fetch(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
        )
        print(f"\nTables in public schema:")
        for t in tables:
            print(f"  • {t['tablename']}")

        postgis = await conn.fetchval("SELECT PostGIS_Version()")
        print(f"\nPostGIS version: {postgis}")

    except Exception as e:
        print(f"❌ Migration failed: {e}")
    finally:
        await conn.close()


asyncio.run(run())
