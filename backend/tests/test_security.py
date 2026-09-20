"""Local API authorization regression tests; all database writes use a disposable database."""
import asyncio
from datetime import datetime, timezone, timedelta

import httpx
import jwt
import pytest
from fastapi import HTTPException

from backend import security
from backend.database import init_db, get_db_pool
from backend.main import app


def test_jwt_requires_expiration_and_rejects_forgery():
    now = datetime.now(timezone.utc)
    for claims, key in [
        ({"sub": "1", "iat": now}, security.SECRET_KEY),
        ({"sub": "1", "iat": now, "exp": now - timedelta(seconds=5)}, security.SECRET_KEY),
        ({"sub": "1", "iat": now, "exp": now + timedelta(hours=1)}, "attacker-controlled-secret-value-12345"),
    ]:
        assert security.decode_access_token(jwt.encode(claims, key, algorithm="HS256")) is None


@pytest.mark.parametrize("actor,target,action", [
    ({"role": "USER", "branch_id": None}, None, "update"),
    ({"role": "ADMIN", "branch_id": 1, "permissions": {"crud": ["read"]}}, {"branch_id": 1}, "update"),
    ({"role": "ADMIN", "branch_id": 1, "permissions": {"crud": ["all"]}}, {"branch_id": 2}, "update"),
    ({"role": "ADMIN", "branch_id": 1, "permissions": {"crud": ["all"]}}, {"branch_id": None}, "delete"),
])
def test_account_scope_denies_unauthorized_changes(actor, target, action):
    with pytest.raises(HTTPException) as err:
        security.check_account_management(actor, target, action)
    assert err.value.status_code == 403


def test_own_branch_account_changes_allowed():
    security.check_account_management({"role": "ADMIN", "branch_id": 1, "permissions": {"crud": ["update"]}}, {"branch_id": 1})


def test_hostile_cors_origin_is_rejected():
    async def scenario():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            for origin, expected in [("https://evil.example", 400), ("https://shop.ostsoundboxsystem.com.evil.example", 400), ("http://localhost:5175", 200), ("https://shop.ostsoundboxsystem.com", 400)]:
                result = await client.options('/api/auth/me', headers={"Origin": origin, "Access-Control-Request-Method": "GET"})
                assert result.status_code == expected
    asyncio.run(scenario())


def test_api_authentication_and_branch_isolation(production_db):
    async def scenario():
        await init_db()
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            branch = await conn.fetchval("SELECT branch_id FROM branches LIMIT 1")
            target = await conn.fetchval("SELECT id FROM users WHERE role = 'ADMIN' AND branch_id IS NULL LIMIT 1")
            actor = await conn.fetchval("""INSERT INTO users (phone_number, full_name, password_hash, role, status, branch_id, permissions)
                VALUES ('099100100', 'Scoped Admin', 'unchanged', 'ADMIN', 'ACTIVE', $1, '{"crud":["all"]}') RETURNING id""", branch)
            merchant = await conn.fetchval("SELECT id FROM users WHERE role = 'USER' LIMIT 1")
            original_hash = await conn.fetchval("SELECT password_hash FROM users WHERE id=$1", target)
        token = lambda uid: {"Authorization": "Bearer " + security.create_access_token({"sub": str(uid), "user_id": uid})}
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            assert (await client.get('/api/admin/users')).status_code == 401
            stale = security.create_access_token({"sub": "2147480000", "user_id": target})
            assert (await client.get('/api/auth/me', headers={"Authorization": "Bearer " + stale})).status_code == 401
            assert (await client.get('/api/admin/users', headers=token(merchant))).status_code == 403
            assert (await client.patch(f'/api/admin/users/{target}/reset-password', headers=token(actor), json={"new_password": "ShouldNotChange123!"})).status_code == 403
            assert (await client.put(f'/api/admin/users/{actor}', headers=token(actor), json={"branch_id": 0})).status_code == 403
            assert (await client.patch(f'/api/admin/users/{target}/status', headers=token(actor), json={"status": "SUSPENDED"})).status_code == 403
            assert (await client.delete(f'/api/admin/users/{target}', headers=token(actor))).status_code == 403
            async with pool.acquire() as conn:
                assert await conn.fetchval("SELECT password_hash FROM users WHERE id=$1", target) == original_hash
                await conn.execute("UPDATE users SET is_active=FALSE WHERE id=$1", actor)
            assert (await client.get('/api/auth/me', headers=token(actor))).status_code == 403
    production_db.run(scenario)


def test_phone_match_does_not_claim_someone_elses_store(production_db):
    async def scenario():
        await init_db()
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            victim = await conn.fetchval("SELECT id FROM users WHERE role='USER' LIMIT 1")
            attacker = await conn.fetchval("""INSERT INTO users (phone_number, full_name, password_hash, role, status)
                VALUES ('099200200', 'Attacker', 'x', 'USER', 'ACTIVE') RETURNING id""")
            store = await conn.fetchval("""INSERT INTO merchants (merchant_id, merchant_name, name, owner_phone, user_id)
                VALUES ('SECURITY-STORE', 'Victim', 'Victim', '099200200', $1) RETURNING id""", victim)
        headers = {"Authorization": "Bearer " + security.create_access_token({"sub": str(attacker), "user_id": attacker})}
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            result = await client.get('/api/stores/my-stores', headers=headers)
            assert result.status_code == 200, result.text
            assert result.json()['stores'] == []
            assert (await client.get('/api/auth/me', headers=headers)).json()['user']['has_store'] is False
            assert (await client.delete(f'/api/stores/{store}', headers=headers)).status_code == 404
        async with pool.acquire() as conn:
            assert await conn.fetchval("SELECT user_id FROM merchants WHERE id=$1", store) == victim
    production_db.run(scenario)
