"""
Seed NCRB baseline crime data for Indore into baseline_city_crime_stats.

──────────────────────────────────────────────────────────────────────────
DATA SOURCING ASSUMPTIONS (documented per requirements):
──────────────────────────────────────────────────────────────────────────
1. NCRB (National Crime Records Bureau) publishes "Crime in India" reports
   annually. Metropolitan-city-level data covers only 19 cities — Indore
   is NOT in this list.

2. Therefore, we use Madhya Pradesh (MP) STATE-LEVEL data from NCRB 2022
   ("Crime Against Women" chapter) and estimate Indore's share using a
   population ratio.

3. Population basis (2022 estimates):
   - Madhya Pradesh total:  ~8,46,00,000 (8.46 crore)
   - Indore urban agglom.: ~35,50,000  (35.5 lakh)
   - Ratio = 35.5 / 846 ≈ 0.042 (4.2%)

4. MP state-level figures (NCRB 2022, Crimes Against Women):
   - Assault on Women (Sec 354):         5,284 cases
   - Attempt to Commit Rape:               413 cases
   - Rape (Sec 376):                     5,564 cases
   - Kidnapping & Abduction of Women:    3,840 cases
   - Women-Centric Cyber Crimes:           398 cases
   - Total IPC Crimes Against Women:    25,750 cases

5. crime_rate_per_lakh = (estimated_cases / 35.5) — per 1 lakh of Indore
   population.

6. weighted_score is a 0–100 severity index computed using:
   - Severity multiplier per crime type (higher for violent crimes)
   - Normalised against a theoretical max

   This score feeds directly into the Oracle risk blending formula.

COURT PENDENCY / CONVICTION DATA: Intentionally excluded per requirements.
──────────────────────────────────────────────────────────────────────────
"""

import asyncio
import asyncpg


# ── Indore NCRB Baseline Data (estimated from MP state, 2022) ─────────
# Each tuple: (crime_type, total_cases, crime_rate_per_lakh, weighted_score)
#
# weighted_score methodology:
#   - Rape / Attempt Rape:           severity multiplier = 5.0
#   - Kidnapping & Abduction:        severity multiplier = 4.0
#   - Assault on Women (Sec 354):    severity multiplier = 3.5
#   - Women-Centric Cyber Crimes:    severity multiplier = 2.0
#   - Total IPC (aggregate):         severity multiplier = 1.0 (used as baseline)
#
#   raw = (crime_rate_per_lakh × multiplier)
#   weighted_score = min(raw / max_possible × 100, 100)
#   max_possible is set to 33.0 (theoretical ceiling for this dataset)

INDORE_POP_LAKH = 35.5  # Indore urban agglomeration in lakhs
MP_POPULATION = 846.0   # MP state population in lakhs
POP_RATIO = INDORE_POP_LAKH / MP_POPULATION  # ≈ 0.042

# MP state-level raw cases (NCRB 2022)
MP_STATE_DATA = [
    ("Assault on Women (Sec 354)",     5284, 3.5),
    ("Attempt to Commit Rape",          413, 5.0),
    ("Rape",                           5564, 5.0),
    ("Kidnapping & Abduction",         3840, 4.0),
    ("Women-Centric Cyber Crimes",      398, 2.0),
    ("Total IPC Crimes Against Women", 25750, 1.0),
]

MAX_POSSIBLE_SCORE = 33.0  # Normalisation ceiling for weighted_score
YEAR = 2022
CITY = "Indore"


def _compute_rows():
    """Derive Indore estimates from MP state data."""
    rows = []
    for crime_type, mp_cases, severity in MP_STATE_DATA:
        # Step 1: Estimate Indore cases via population ratio
        estimated_cases = round(mp_cases * POP_RATIO)

        # Step 2: Crime rate per lakh of Indore population
        rate_per_lakh = round(estimated_cases / INDORE_POP_LAKH, 2)

        # Step 3: Weighted severity score (0–100)
        raw_score = rate_per_lakh * severity
        weighted = round(min((raw_score / MAX_POSSIBLE_SCORE) * 100, 100), 2)

        rows.append((CITY, YEAR, crime_type, estimated_cases, rate_per_lakh, weighted))
    return rows


SEED_SQL = """
INSERT INTO baseline_city_crime_stats
    (city_name, year, crime_type, total_cases, crime_rate_per_lakh, weighted_score)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT DO NOTHING;
"""


async def run():
    # Uses same connection pattern as run_migration.py
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
        rows = _compute_rows()

        print(f"\nSeeding {len(rows)} NCRB baseline records for {CITY} ({YEAR}):\n")
        print(f"{'Crime Type':<40} {'Cases':>6} {'Rate/Lakh':>10} {'Score':>7}")
        print("─" * 70)

        for row in rows:
            city, year, crime_type, cases, rate, score = row
            print(f"{crime_type:<40} {cases:>6} {rate:>10.2f} {score:>7.2f}")
            await conn.execute(SEED_SQL, city, year, crime_type, cases, rate, score)

        print(f"\n✅ Seeded {len(rows)} records into baseline_city_crime_stats.")

        # Verify
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM baseline_city_crime_stats WHERE city_name = $1",
            CITY,
        )
        print(f"   Total records for {CITY}: {count}")

    except Exception as e:
        print(f"❌ Seeding failed: {e}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
