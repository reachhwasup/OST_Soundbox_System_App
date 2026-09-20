"""
Test harness: every test gets a fresh, temporary PostgreSQL database.

Connection: TEST_DATABASE_URL (any database on the target server, used to create/drop test databases),
falling back to DATABASE_URL from .env with the docker host `ost_postgres` replaced by `localhost`.

Run:  .venv/bin/python -m pytest backend/tests -q
"""
import asyncio
import logging
import os
import shutil
import subprocess
import uuid
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import asyncpg
import pytest
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[2]
os.environ.setdefault("JWT_SECRET_KEY", "test-only-secret-not-for-deployment-0123456789")
FIXTURES = Path(__file__).resolve().parent / "fixtures"


def _server_url() -> str:
    url = os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL") or dotenv_values(ROOT / ".env").get("DATABASE_URL")
    if not url:
        pytest.skip("No TEST_DATABASE_URL / DATABASE_URL configured for tests.")
    return url.replace("@ost_postgres:", "@localhost:")


def _with_database(url: str, name: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, f"/{name}", parts.query, parts.fragment))


class WarningCollector(logging.Handler):
    def __init__(self):
        super().__init__(level=logging.WARNING)
        self.messages = []

    def emit(self, record):
        self.messages.append(f"{record.name}: {record.getMessage()}")


class TempDatabase:
    """A throwaway database. `load` fills it; `run` executes an async scenario against it with the app pool."""

    def __init__(self):
        self.server_url = _server_url()
        self.name = f"ost_test_{uuid.uuid4().hex[:10]}"
        self.url = _with_database(self.server_url, self.name)

    async def _admin(self, sql: str):
        conn = await asyncpg.connect(_with_database(self.server_url, "postgres"))
        try:
            await conn.execute(sql)
        finally:
            await conn.close()

    def create(self):
        asyncio.run(self._admin(f'CREATE DATABASE "{self.name}"'))

    def drop(self):
        asyncio.run(self._admin(f'DROP DATABASE IF EXISTS "{self.name}" WITH (FORCE)'))

    def load_sql(self, path: Path):
        async def _load():
            conn = await asyncpg.connect(self.url)
            try:
                await conn.execute(path.read_text())
            finally:
                await conn.close()
        asyncio.run(_load())

    def load_dump(self, path: Path):
        """Loads a pg_dump file (uses psql because dumps contain COPY ... FROM stdin)."""
        if not shutil.which("psql"):
            pytest.skip("psql is required to load pg_dump fixtures.")
        subprocess.run(["psql", "-q", "-o", os.devnull, self.url, "-f", str(path)],
                       check=True, capture_output=True)

    def run(self, scenario):
        """Runs `await scenario()` with backend.database pointed at this database. Returns its result."""
        from backend import database

        async def _run():
            database.DATABASE_URL = self.url
            database.db_pool = None
            try:
                return await scenario()
            finally:
                if database.db_pool is not None:
                    await database.db_pool.close()
                database.db_pool = None
        return asyncio.run(_run())


@pytest.fixture
def temp_db():
    db = TempDatabase()
    db.create()
    try:
        yield db
    finally:
        db.drop()


@pytest.fixture
def production_db(temp_db):
    """Temporary database with the production schema and sample data (not yet started by the app)."""
    temp_db.load_sql(FIXTURES / "production_schema_sample.sql")
    return temp_db


@pytest.fixture
def warnings_log():
    collector = WarningCollector()
    root = logging.getLogger()
    root.addHandler(collector)
    try:
        yield collector
    finally:
        root.removeHandler(collector)


# Users used by the scenarios (the backend reads these dicts as `current_user`)
def super_admin(user_id: int) -> dict:
    return {"id": user_id, "role": "ADMIN", "branch_id": None, "phone_number": "x",
            "full_name": "Test Admin", "permissions": {"crud": ["all"]}}


def branch_admin(user_id: int, branch_id: int, crud=("read",)) -> dict:
    return {"id": user_id, "role": "ADMIN", "branch_id": branch_id, "branch_name": "Branch",
            "phone_number": "x", "full_name": "Branch Admin", "permissions": {"crud": list(crud)}}
