"""Startup migrations: production stays untouched except additive columns; fresh databases match production."""
import csv

from backend.database import init_db, get_db_pool
from backend.tests.conftest import FIXTURES, ROOT

# Columns this app adds on top of the production schema
APP_ADDITIONS = {
    ("discounts", "is_custom"),
    ("app_migrations", "name"), ("app_migrations", "applied_at"),
    ("devices", "status"), ("devices", "price"), ("devices", "batch_no"),
    ("devices", "branch_id"), ("devices", "product_id"),
    ("products", "purchase_price"), ("products", "min_stock_level"),
    ("pos_invoices", "customer_name"), ("pos_invoices", "customer_phone"),
    ("pos_invoice_items", "discount_percent"), ("pos_invoice_items", "serial_number"),
    ("users", "branch_id"), ("users", "permissions"),
}

COLUMNS_SQL = """
    SELECT c.table_name, c.column_name,
           CASE WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name
                WHEN c.character_maximum_length IS NOT NULL THEN c.data_type || '(' || c.character_maximum_length || ')'
                WHEN c.data_type = 'numeric' AND c.numeric_precision IS NOT NULL
                     THEN 'numeric(' || c.numeric_precision || ',' || c.numeric_scale || ')'
                ELSE c.data_type END AS data_type,
           c.is_nullable
    FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
"""


def production_columns() -> dict:
    with open(FIXTURES / "production_columns.csv") as f:
        return {(r["table_name"], r["column_name"]): (r["data_type"], r["is_nullable"]) for r in csv.DictReader(f)}


async def _columns() -> dict:
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        return {(r["table_name"], r["column_name"]): (r["data_type"], r["is_nullable"]) for r in await conn.fetch(COLUMNS_SQL)}


# Tables kept only until their manual drop script is run on that database
RETIRED = {"sales", "stock_transactions"}


def _assert_production_shape(columns: dict, allow_legacy_sales: bool):
    expected = production_columns()
    missing = sorted(k for k in expected if k not in columns and not (allow_legacy_sales and k[0] in RETIRED))
    different = sorted((k, expected[k], columns[k]) for k in expected if k in columns and expected[k] != columns[k])
    extra = sorted(k for k in columns if k not in expected and k not in APP_ADDITIONS and k[0] not in RETIRED)
    assert not missing, f"production columns missing: {missing}"
    assert not different, f"production columns changed: {different}"
    assert not extra, f"unexpected columns: {extra}"


def test_startup_on_production_is_additive_and_quiet(production_db, warnings_log):
    async def scenario():
        await init_db()
        await init_db()  # idempotent
        return await _columns()

    columns = production_db.run(scenario)
    assert not warnings_log.messages, warnings_log.messages
    _assert_production_shape(columns, allow_legacy_sales=False)


def test_schema_file_matches_production(temp_db):
    temp_db.load_sql(ROOT / "PostgreSQL.sql")
    columns = temp_db.run(_columns)
    _assert_production_shape(columns, allow_legacy_sales=True)


def test_startup_on_empty_database(temp_db, warnings_log):
    async def scenario():
        await init_db()
        return await _columns()

    columns = temp_db.run(scenario)
    assert not warnings_log.messages, warnings_log.messages
    _assert_production_shape(columns, allow_legacy_sales=True)
