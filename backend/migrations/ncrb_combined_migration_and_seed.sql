-- ============================================================
-- SafePulse – NCRB Baseline: Migration + Seed Data
-- Paste this entire script into the Supabase SQL Editor and run.
-- ============================================================

-- ── STEP 1: Create the table ─────────────────────────
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

-- ── STEP 2: Seed Indore NCRB data ───────────────────
-- SOURCE: NCRB "Crime in India" 2022, Madhya Pradesh state data
-- Indore is NOT in NCRB metropolitan list, so we estimate using
-- population ratio: Indore (35.5 lakh) / MP (846 lakh) ≈ 4.2%
-- Court pendency/conviction tables intentionally excluded.

INSERT INTO baseline_city_crime_stats
    (city_name, year, crime_type, total_cases, crime_rate_per_lakh, weighted_score)
VALUES
    ('Indore', 2022, 'Assault on Women (Sec 354)',     222,  6.25, 66.29),
    ('Indore', 2022, 'Attempt to Commit Rape',          17,  0.48,  7.27),
    ('Indore', 2022, 'Rape',                           234,  6.59, 99.85),
    ('Indore', 2022, 'Kidnapping & Abduction',         161,  4.54, 55.03),
    ('Indore', 2022, 'Women-Centric Cyber Crimes',      17,  0.48,  2.91),
    ('Indore', 2022, 'Total IPC Crimes Against Women', 1082, 30.48, 92.36)
ON CONFLICT DO NOTHING;

-- ── Verify ───────────────────────────────────────────
SELECT crime_type, total_cases, crime_rate_per_lakh, weighted_score
FROM baseline_city_crime_stats
WHERE city_name = 'Indore'
ORDER BY weighted_score DESC;

-- ============================================================
-- Done! Table created and seeded with 6 Indore NCRB records.
-- ============================================================
