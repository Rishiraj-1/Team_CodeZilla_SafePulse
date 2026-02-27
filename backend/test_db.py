import asyncio
import asyncpg

async def test_pooler():
    try:
        conn = await asyncpg.connect("postgresql://postgres.avplsonmppbsjkpsqxsw:qHWn5AClqPc6gRdm@aws-1-ap-south-1.pooler.supabase.com:5432/postgres")
        print("Pooler (aws-1) success!")
        await conn.close()
    except Exception as e:
        print(f"Pooler (aws-1) failed: {e}")

async def test_pooler_6543():
    try:
        conn = await asyncpg.connect("postgresql://postgres.avplsonmppbsjkpsqxsw:qHWn5AClqPc6gRdm@aws-1-ap-south-1.pooler.supabase.com:6543/postgres")
        print("Pooler 6543 success!")
        await conn.close()
    except Exception as e:
        print(f"Pooler 6543 failed: {e}")

async def test_direct():
    try:
        conn = await asyncpg.connect("postgresql://postgres:qHWn5AClqPc6gRdm@db.avplsonmppbsjkpsqxsw.supabase.co:5432/postgres")
        print("Direct success!")
        await conn.close()
    except Exception as e:
        print(f"Direct failed: {e}")

async def run_tests():
    print("Testing connections...")
    await test_pooler()
    await test_pooler_6543()
    await test_direct()

asyncio.run(run_tests())
