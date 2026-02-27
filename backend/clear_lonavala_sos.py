"""
One-time cleanup: delete all SOS alerts/records that have Indore coordinates
(lat ≈ 22.7, lng ≈ 75.8) and any existing risk zones or reports.

Run from the backend directory:
    python clear_indore_sos.py
"""
import asyncio
from sqlalchemy import text
from app.database.session import _get_session_factory

# Lonavala bounding box – keep only alerts within this area.
# Everything outside is old Indore/demo data.
LONAVALA_LAT = 18.7537
LONAVALA_LNG = 73.4129

async def main():
    session_factory = _get_session_factory()
    async with session_factory() as db:
        # Delete guardian_alerts first (FK to sos_events)
        result1b = await db.execute(
            text("""
                DELETE FROM guardian_alerts
                WHERE sos_id IN (
                    SELECT id FROM sos_events
                    WHERE NOT ST_DWithin(
                        location::geography,
                        ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                        100000
                    )
                )
            """).bindparams(lat=LONAVALA_LAT, lng=LONAVALA_LNG)
        )
        print(f"Deleted {result1b.rowcount} guardian alerts (Indore SOS linked)")

        # Delete SOS events outside Lonavala (Indore area)
        result = await db.execute(
            text("""
                DELETE FROM sos_events
                WHERE NOT ST_DWithin(
                    location::geography,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                    100000
                )
                RETURNING id
            """).bindparams(lat=LONAVALA_LAT, lng=LONAVALA_LNG)
        )
        deleted_sos = result.rowcount
        print(f"Deleted {deleted_sos} SOS events outside Lonavala")

        # Delete risk zones outside Lonavala
        result2 = await db.execute(
            text("""
                DELETE FROM risk_zones
                WHERE ST_DWithin(
                    centroid::geography,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                    100000
                ) = FALSE
            """).bindparams(lat=LONAVALA_LAT, lng=LONAVALA_LNG)
        )
        print(f"Deleted {result2.rowcount} risk zones outside Lonavala")

        # Delete risk reports outside Lonavala
        result3 = await db.execute(
            text("""
                DELETE FROM risk_reports
                WHERE ST_DWithin(
                    location::geography,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                    100000
                ) = FALSE
            """).bindparams(lat=LONAVALA_LAT, lng=LONAVALA_LNG)
        )
        print(f"Deleted {result3.rowcount} risk reports outside Lonavala")

        await db.commit()
        print("✅ Done! Database cleaned up for Lonavala.")

if __name__ == "__main__":
    asyncio.run(main())
