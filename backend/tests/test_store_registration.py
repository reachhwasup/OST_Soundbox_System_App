"""Store creation works with the merchant schema and preserves ownership."""
from backend.database import init_db, get_db_pool
from backend.routers import stores
from backend.tests.conftest import super_admin


def test_store_registration_preserves_owner(production_db):
    async def scenario():
        await init_db()
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            admin_id = await conn.fetchval("SELECT id FROM users WHERE role = 'ADMIN' ORDER BY id LIMIT 1")
        result = await stores.register_store(stores.StoreRegisterSchema(
            name="Moon Store", place="Market", location="Kampot"), current_user=super_admin(admin_id))
        assert result["status"] == "success"
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT name, user_id FROM merchants WHERE id=$1", result["store_id"])
        assert row["name"] == "Moon Store"
        assert row["user_id"] == admin_id
        assert result["store"]["id"] == result["store_id"]
    production_db.run(scenario)


def test_retired_store_address_is_removed(production_db):
    async def scenario():
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            await conn.execute("ALTER TABLE merchants ADD COLUMN subdomain VARCHAR(100)")
            await conn.execute("CREATE UNIQUE INDEX uq_merchants_subdomain ON merchants (LOWER(subdomain))")
            await conn.execute("UPDATE merchants SET subdomain = 'store-' || id")
            before = await conn.fetchval("SELECT count(*) FROM merchants")
        await init_db()
        await init_db()
        async with pool.acquire() as conn:
            assert not await conn.fetchval("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='merchants' AND column_name='subdomain')")
            assert await conn.fetchval("SELECT to_regclass('public.uq_merchants_subdomain')") is None
            assert await conn.fetchval("SELECT count(*) FROM merchants") == before
    production_db.run(scenario)
