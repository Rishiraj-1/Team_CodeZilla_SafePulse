-- ============================================================
-- SafePulse – NCRB Baseline Crime Stats Migration
-- Adds baseline_city_crime_stats table for NCRB static data.
-- Run this in the Supabase SQL Editor or via psql.
-- ============================================================

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

-- Composite index for fast lookups by city + year
CREATE INDEX IF NOT EXISTS idx_baseline_city_year
    ON baseline_city_crime_stats (city_name, year);

-- Index on city_name alone for aggregate queries
CREATE INDEX IF NOT EXISTS idx_baseline_city
    ON baseline_city_crime_stats (city_name);

-- ============================================================
-- Done! baseline_city_crime_stats table created.
-- ============================================================
