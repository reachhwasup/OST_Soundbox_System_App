"""
Schema migrations run by init_db on startup (backend/database.py).

Every function here is idempotent and safe on production: conversions only run when a legacy
shape is detected, and one-time data migrations are recorded in app_migrations.
"""
import logging

logger = logging.getLogger("backend.database")


LEGACY_SALE_REF_PREFIX = "LEGACY-SALE-"


async def migrate_legacy_sales(conn) -> None:
    """
    Copies every row of the legacy `sales` table into the POS sale tables, through the same service a
    live sale uses: an invoice and item, the serial marked SOLD, and an audit row.

    Idempotent: each copied sale keeps the receipt 'LEGACY-SALE-<id>', and a sale the new flow already
    recorded (same serial within 2 minutes) is not copied.
    Never drops the table; see backend/migrations/20260916_drop_legacy_sales_table.sql.
    """
    from backend.device_types import resolve_product_id_for_serial
    from backend.services import stock as stock_service

    if not await conn.fetchval("SELECT to_regclass('public.sales') IS NOT NULL"):
        return

    cols = {
        r["column_name"] for r in await conn.fetch(
            "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales'"
        )
    }

    def col(name: str, fallback_sql: str) -> str:
        return f"s.{name}" if name in cols else fallback_sql

    rows = await conn.fetch(f"""
        SELECT s.id, s.device_sn,
               {col('device_id', 'NULL::int')} AS device_id,
               {col('merchant_id', 'NULL::int')} AS merchant_id,
               {col('sold_by_user_id', 'NULL::int')} AS sold_by_user_id,
               {col('customer_name', 'NULL::text')} AS customer_name,
               {col('customer_phone', 'NULL::text')} AS customer_phone,
               {col('price', '29.00')} AS price,
               {col('discount_percent', '0.00')} AS discount_percent,
               {col('discount_amount', '0.00')} AS discount_amount,
               {col('final_price', 'NULL::numeric')} AS final_price,
               {col('quantity', '1')} AS quantity,
               {col('invoice_reference', 'NULL::text')} AS invoice_reference,
               {col('warranty_days', '90')} AS warranty_days,
               {col('warranty_start_date', 'NULL::timestamptz')} AS warranty_start_date,
               {col('warranty_end_date', 'NULL::timestamptz')} AS warranty_end_date,
               -- Local calendar date of the warranty end (session time zone), or start + warranty days
               COALESCE(
                   ({col('warranty_end_date', 'NULL::timestamptz')})::date,
                   (COALESCE({col('warranty_start_date', 'NULL::timestamptz')}, {col('created_at', 'NULL::timestamptz')})
                    + make_interval(days => COALESCE({col('warranty_days', '90')}, 90)::int))::date
               ) AS warranty_end_local,
               {col('payment_method', "'CASH'")} AS payment_method,
               {col('notes', 'NULL::text')} AS notes,
               {col('created_at', 'NULL::timestamptz')} AS created_at
        FROM sales s
        ORDER BY s.id
    """)
    if not rows:
        return

    first_branch = await conn.fetchval("SELECT branch_id FROM branches ORDER BY branch_id ASC LIMIT 1")
    copied = skipped = 0

    async with conn.transaction():
        for s in rows:
            sn = (s["device_sn"] or "").strip()
            ref = f"{LEGACY_SALE_REF_PREFIX}{s['id']}"
            marker = f"[legacy_sale_id={s['id']}]"
            if not sn:
                logger.warning(f"Step 12a: legacy sale #{s['id']} has no serial number; not copied.")
                continue

            sold_at = s["warranty_start_date"] or s["created_at"]
            already = await conn.fetchval("""
                SELECT 1 FROM pos_invoice_items it
                JOIN pos_invoices inv ON inv.id = it.invoice_id
                WHERE inv.receipt_no = $1
                   OR (it.serial_number = $2 AND $3::timestamptz IS NOT NULL
                       AND ABS(EXTRACT(EPOCH FROM (inv.sale_date - $3::timestamptz))) <= 120)
                LIMIT 1
            """, ref, sn, sold_at)
            if already:
                skipped += 1
                continue

            device = await conn.fetchrow("""
                SELECT id, branch_id, product_id FROM devices
                WHERE device_id = $1 OR ($2::int IS NOT NULL AND id = $2::int)
                ORDER BY (device_id = $1) DESC LIMIT 1
            """, sn, s["device_id"])

            price = float(s["price"] if s["price"] is not None else 29.00)
            final_price = float(s["final_price"]) if s["final_price"] is not None else price - float(s["discount_amount"] or 0)
            discount_amount = max(round(price - final_price, 2), 0.0)

            # Product: the serial's own row, else the product sold at this exact price, else by kind
            product_id = await conn.fetchval(
                "SELECT product_id FROM inventory_serials WHERE serial_number = $1 AND product_id IS NOT NULL", sn
            )
            if not product_id:
                price_matches = await conn.fetch(
                    "SELECT id FROM products WHERE is_active = TRUE AND base_price = $1", price
                )
                if len(price_matches) == 1:
                    product_id = price_matches[0]["id"]
            if not product_id:
                product_id = await resolve_product_id_for_serial(conn, sn, device["product_id"] if device else None)
            if not product_id:
                raise RuntimeError("No products exist; create a product before migrating legacy sales.")

            branch_id = (device["branch_id"] if device else None) or first_branch
            if not branch_id:
                raise RuntimeError("No branches exist; create a branch before migrating legacy sales.")

            warranty_end = s["warranty_end_local"]

            payment = (s["payment_method"] or "CASH").strip().upper()
            remarks = " | ".join(part for part in [
                f"Payment: {payment}",
                f"Customer: {(s['customer_name'] or '').strip() or 'N/A'}",
                f"Phone: {(s['customer_phone'] or '').strip() or 'N/A'}",
                (s["notes"] or "").strip() or None,
                f"Migrated from legacy sales {marker}" + (f" (merchant {s['merchant_id']})" if s["merchant_id"] else ""),
            ] if part)

            seller = s["sold_by_user_id"]
            if seller and not await conn.fetchval("SELECT 1 FROM users WHERE id = $1", seller):
                seller = None

            await stock_service.record_stock_out(
                conn,
                serial=sn,
                product_id=product_id,
                branch_id=branch_id,
                unit_price=final_price,
                discount_percent=float(s["discount_percent"] or 0),
                discount_amount=discount_amount,
                reference_no=s["invoice_reference"] or ref,
                warranty_end=warranty_end,
                warranty_start=sold_at,
                remarks=remarks,
                moved_at=sold_at,
                changed_by=seller,
                log_note=f"Migrated legacy sale {marker}",
                payment_method=payment,
                customer_name=(s["customer_name"] or "").strip() or None,
                customer_phone=(s["customer_phone"] or "").strip() or None,
            )
            copied += 1

    logger.info(f"Step 12a: copied {copied} legacy sales into the POS tables ({skipped} already present).")


async def run_statements(conn, step: str, statements: list) -> int:
    """
    Runs each statement on its own so one failure (for example a column that differs on production)
    cannot roll back the rest of the step. Returns the number of failed statements.
    """
    failures = 0
    for sql in statements:
        try:
            await conn.execute(sql)
        except Exception as e:
            failures += 1
            logger.warning(f"{step}: {e} [{' '.join(sql.split())[:140]}]")
    if not failures:
        logger.info(f"{step} initialized successfully.")
    return failures


# Warehouse stock: a serial is in stock when inventory_serials says IN_STOCK, at the branch on that row.
# inventory_serials is the source of truth for current state; inventory_logs holds the history of moves
# and pos_invoices / pos_invoice_items hold sales.
STOCK_VIEW_SQL = """
CREATE VIEW v_branch_product_stock AS
SELECT
    inv.id AS inventory_serial_id,
    inv.id AS transaction_id,
    inv.serial_number,
    inv.branch_id,
    b.branch_name,
    b.branch_code,
    p.id AS product_id,
    p.sku,
    p.name AS product_name,
    p.device_model,
    COALESCE(p.base_price, 0.00) AS price,
    COALESCE(inv.purchase_price, p.purchase_price) AS unit_cost,
    p.default_warranty_months AS warranty_months,
    s.name AS supplier,
    inv.received_date AS intake_date,
    inv.warehouse_location AS notes
FROM inventory_serials inv
JOIN products p ON p.id = inv.product_id
JOIN branches b ON b.branch_id = inv.branch_id
LEFT JOIN suppliers s ON s.id = p.supplier_id
WHERE inv.status = 'IN_STOCK';
"""


# Sales: one row per sold serial, over the POS tables. Shaped like the retired stock_transactions OUT
# rows so reporting reads the same columns (unit_price is the final price, remarks is rebuilt text).
SALES_VIEW_SQL = """
CREATE VIEW v_sales AS
SELECT
    it.id AS transaction_id,
    inv.id AS invoice_id,
    it.serial_number,
    it.product_id,
    inv.branch_id,
    1 AS quantity,
    'OUT'::text AS action_type,
    it.final_price AS unit_price,
    it.original_price,
    COALESCE(it.discount_percent, 0.00) AS discount_percent,
    COALESCE(it.discount_amount, 0.00) AS discount_amount,
    inv.receipt_no AS reference_no,
    inv.payment_method,
    inv.customer_name,
    inv.customer_phone,
    inv.cashier_id,
    'Payment: ' || COALESCE(inv.payment_method, 'CASH')
        || ' | Customer: ' || COALESCE(NULLIF(inv.customer_name, ''), 'N/A')
        || ' | Phone: ' || COALESCE(NULLIF(inv.customer_phone, ''), 'N/A') AS remarks,
    it.warranty_start_date,
    it.warranty_end_date::date AS warranty_expired_date,
    inv.sale_date AS created_at
FROM pos_invoice_items it
JOIN pos_invoices inv ON inv.id = it.invoice_id;
"""


async def _column_info(conn, table: str) -> dict:
    rows = await conn.fetch("""
        SELECT column_name, data_type, udt_name, character_maximum_length,
               numeric_precision, numeric_scale, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
    """, table)
    return {r["column_name"]: r for r in rows}


def _type_repr(col) -> str:
    if col["data_type"] == "character varying":
        return f"varchar({col['character_maximum_length']})" if col["character_maximum_length"] else "varchar"
    if col["data_type"] == "numeric":
        return f"numeric({col['numeric_precision']},{col['numeric_scale']})" if col["numeric_precision"] else "numeric"
    if col["data_type"] == "USER-DEFINED":
        return col["udt_name"]
    return col["data_type"]


# Column types on production that differ from older local databases: (table, column, target SQL type, repr).
# products.device_model is deliberately absent: production defines it wider than this repo does, and
# narrowing a production column could truncate data. The app accepts whatever width production uses.
PRODUCTION_COLUMN_TYPES = [
    ("discounts", "discount_type", "VARCHAR(20)", "varchar(20)"),
    ("discounts", "discount_value", "NUMERIC(10, 2)", "numeric(10,2)"),
    ("inventory_logs", "previous_status", "VARCHAR(20)", "varchar(20)"),
    ("inventory_logs", "new_status", "VARCHAR(20)", "varchar(20)"),
    ("inventory_serials", "status", "VARCHAR(20)", "varchar(20)"),
    ("inventory_serials", "warehouse_location", "VARCHAR(50)", "varchar(50)"),
    ("inventory_serials", "purchase_price", "NUMERIC(10, 2)", "numeric(10,2)"),
    ("pos_invoices", "receipt_no", "VARCHAR(50)", "varchar(50)"),
    ("pos_invoices", "subtotal", "NUMERIC(10, 2)", "numeric(10,2)"),
    ("pos_invoices", "total_discount", "NUMERIC(10, 2)", "numeric(10,2)"),
    ("pos_invoices", "grand_total", "NUMERIC(10, 2)", "numeric(10,2)"),
    ("pos_invoices", "payment_method", "VARCHAR(20)", "varchar(20)"),
    ("pos_invoice_items", "original_price", "NUMERIC(10, 2)", "numeric(10,2)"),
    ("pos_invoice_items", "discount_amount", "NUMERIC(10, 2)", "numeric(10,2)"),
    ("pos_invoice_items", "final_price", "NUMERIC(10, 2)", "numeric(10,2)"),
    ("pos_invoice_items", "warranty_status", "VARCHAR(20)", "varchar(20)"),
]


async def align_legacy_schema_to_production(conn) -> None:
    """
    Converts an older local database to the production schema. Every conversion is conditional,
    so on production (already in shape) this does nothing. Renames and type changes only; columns
    that exist only on legacy local databases are kept (nullable) and removed by the manual script
    backend/migrations/20260917_drop_legacy_local_columns.sql.
    """
    products = await _column_info(conn, "products")
    transactions = await _column_info(conn, "transactions")
    alerts = await _column_info(conn, "security_alerts")
    devices = await _column_info(conn, "devices")

    products_legacy = "item_code" in products or "product_id" in products
    transactions_legacy = bool(transactions) and transactions.get("id") is not None and transactions["id"]["data_type"] != "character varying"
    alerts_legacy = bool(alerts) and alerts.get("device_id") is not None and alerts["device_id"]["data_type"] != "character varying"
    type_changes = []
    for table, column, sql_type, repr_ in PRODUCTION_COLUMN_TYPES:
        info = (await _column_info(conn, table)).get(column)
        if info is not None and _type_repr(info) != repr_:
            type_changes.append((table, column, sql_type))

    if not (products_legacy or transactions_legacy or alerts_legacy or type_changes or "device_sn" in devices):
        return

    # Views block column type changes; step 13 recreates the stock view
    await conn.execute("DROP VIEW IF EXISTS v_branch_product_stock;")

    if products_legacy:
        async with conn.transaction():
            renames = [("product_id", "id"), ("item_code", "sku"), ("item_name", "name"),
                       ("warranty_months", "default_warranty_months")]
            for old, new in renames:
                if old in products and new not in products:
                    await conn.execute(f"ALTER TABLE products RENAME COLUMN {old} TO {new};")
            products = await _column_info(conn, "products")
            await conn.execute("ALTER TABLE products ALTER COLUMN id TYPE BIGINT;")
            if await conn.fetchval("SELECT to_regclass('public.products_product_id_seq') IS NOT NULL") and \
                    not await conn.fetchval("SELECT to_regclass('public.products_id_seq') IS NOT NULL"):
                await conn.execute("ALTER SEQUENCE products_product_id_seq RENAME TO products_id_seq;")
            await conn.execute("ALTER TABLE products ALTER COLUMN name TYPE VARCHAR(100), ALTER COLUMN name DROP NOT NULL;")
            if "base_price" not in products:
                await conn.execute("ALTER TABLE products ADD COLUMN base_price NUMERIC(10, 2);")
                src = "COALESCE(selling_price, cost_price, 0)" if "selling_price" in products else "0"
                await conn.execute(f"UPDATE products SET base_price = {src} WHERE base_price IS NULL;")
                await conn.execute("ALTER TABLE products ALTER COLUMN base_price SET NOT NULL;")
            # A legacy cost column becomes the product's purchase price before it is dropped
            await conn.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(10, 2);")
            if "cost_price" in products:
                await conn.execute("UPDATE products SET purchase_price = cost_price WHERE purchase_price IS NULL;")
            await conn.execute("ALTER TABLE products ALTER COLUMN default_warranty_months SET DEFAULT 3;")
            await conn.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS device_model VARCHAR(120);")
            await conn.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL;")
            await conn.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS is_order INTEGER;")
            await conn.execute("UPDATE products SET is_order = id WHERE is_order IS NULL;")
            await conn.execute("ALTER TABLE products ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;")
            for legacy_col in ("unit", "cost_price"):
                if legacy_col in products:
                    await conn.execute(f"ALTER TABLE products ALTER COLUMN {legacy_col} DROP NOT NULL;")
        logger.info("Step 4c: products converted to the production schema.")

    if transactions_legacy:
        async with conn.transaction():
            await conn.execute("CREATE SEQUENCE IF NOT EXISTS transactions_id_seq;")
            await conn.execute("""
                ALTER TABLE transactions
                    ALTER COLUMN id DROP DEFAULT,
                    ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
            """)
            await conn.execute("ALTER TABLE transactions ALTER COLUMN id SET DEFAULT nextval('transactions_id_seq'::regclass);")
            await conn.execute("""
                ALTER TABLE transactions
                    ALTER COLUMN device_id DROP NOT NULL,
                    ALTER COLUMN device_id TYPE VARCHAR(100) USING device_id::text,
                    ALTER COLUMN bank_name DROP NOT NULL,
                    ALTER COLUMN bank_tx_id DROP NOT NULL,
                    ALTER COLUMN currency DROP DEFAULT,
                    ALTER COLUMN currency TYPE VARCHAR(10) USING currency::text,
                    ALTER COLUMN status DROP DEFAULT,
                    ALTER COLUMN status TYPE VARCHAR(50) USING status::text;
            """)
            await conn.execute("""
                ALTER TABLE transactions
                    ALTER COLUMN currency SET DEFAULT 'USD',
                    ALTER COLUMN status SET DEFAULT 'PROCESSED';
            """)
            # Production stores the device serial number in transactions.device_id
            await conn.execute("""
                UPDATE transactions t SET device_id = d.device_id
                FROM devices d
                WHERE t.device_id = d.id::text AND d.device_id IS NOT NULL AND d.device_id <> '';
            """)
        logger.info("Step 4c: transactions converted to the production schema.")

    if alerts_legacy:
        await conn.execute("""
            ALTER TABLE security_alerts
                ALTER COLUMN device_id TYPE VARCHAR(100) USING device_id::text,
                ALTER COLUMN merchant_id TYPE VARCHAR(100) USING merchant_id::text;
        """)
        logger.info("Step 4c: security_alerts converted to the production schema.")

    if "device_sn" in devices:
        # Production keeps the serial number in devices.device_id
        await conn.execute("""
            UPDATE devices SET device_id = device_sn
            WHERE (device_id IS NULL OR device_id = '') AND device_sn IS NOT NULL;
        """)
        await conn.execute("ALTER TABLE devices ALTER COLUMN device_sn DROP NOT NULL;")

    for table, column, sql_type in type_changes:
        try:
            await conn.execute(f"ALTER TABLE {table} ALTER COLUMN {column} TYPE {sql_type};")
        except Exception as e:
            logger.warning(f"Step 4c: could not change {table}.{column} to {sql_type}: {e}")


async def migrate_ledger_into_pos_tables(conn) -> None:
    """
    One-time: move stock_transactions into the tables that replace it.

    - every OUT row becomes a pos_invoices row with one pos_invoice_items row, carrying the price,
      discount, reference, warranty dates and the customer parsed out of the remarks
    - every serial with an IN as its latest movement is confirmed IN_STOCK in inventory_serials
    - the ledger itself is left in place; drop it with
      backend/migrations/20260920_drop_stock_transactions.sql once you are satisfied

    Recorded in app_migrations, so it runs once.
    """
    migration_name = "20260920_ledger_into_pos_tables"
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS app_migrations (
            name VARCHAR(150) PRIMARY KEY,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    """)
    if await conn.fetchval("SELECT 1 FROM app_migrations WHERE name = $1", migration_name):
        return
    if not await conn.fetchval("SELECT to_regclass('public.stock_transactions') IS NOT NULL"):
        await conn.execute("INSERT INTO app_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING", migration_name)
        return

    def field(remarks: str, label: str) -> str:
        for part in (remarks or "").split("|"):
            part = part.strip()
            if part.lower().startswith(f"{label.lower()}:"):
                value = part.split(":", 1)[1].strip()
                return "" if value.upper() in ("N/A", "") else value
        return ""

    async with conn.transaction():
        # Serials that are in stock according to the ledger must exist in inventory_serials
        await conn.execute("""
            INSERT INTO inventory_serials (product_id, serial_number, status, purchase_price, branch_id, received_date)
            SELECT st.product_id, st.serial_number, 'IN_STOCK',
                   COALESCE((SELECT purchase_price FROM products WHERE id = st.product_id), 0),
                   st.branch_id, st.created_at
            FROM (
                SELECT DISTINCT ON (serial_number) * FROM stock_transactions
                WHERE serial_number IS NOT NULL ORDER BY serial_number, transaction_id DESC
            ) st
            WHERE st.action_type = 'IN'
            ON CONFLICT (serial_number) DO UPDATE
            SET status = 'IN_STOCK', branch_id = EXCLUDED.branch_id, updated_at = CURRENT_TIMESTAMP
        """)

        sales = await conn.fetch("""
            SELECT st.transaction_id, st.serial_number, st.product_id, st.branch_id, st.unit_price,
                   st.discount_percent, st.discount_amount, st.reference_no, st.remarks,
                   st.warranty_expired_date, st.created_at
            FROM stock_transactions st
            WHERE st.action_type = 'OUT' AND st.serial_number IS NOT NULL
            ORDER BY st.transaction_id
        """)

        copied = 0
        for sale in sales:
            reference = sale["reference_no"] or f"SALE-{sale['transaction_id']}"
            if await conn.fetchval("SELECT 1 FROM pos_invoices WHERE receipt_no = $1", reference):
                continue

            remarks = sale["remarks"] or ""
            payment = (field(remarks, "Payment") or "CASH").upper()
            final_price = float(sale["unit_price"] or 0)
            discount = float(sale["discount_amount"] or 0)
            branch_id = sale["branch_id"] or await conn.fetchval("SELECT branch_id FROM branches ORDER BY branch_id LIMIT 1")

            # The seller was recorded on the audit row that marked the serial SOLD
            cashier_id = await conn.fetchval("""
                SELECT il.changed_by FROM inventory_logs il
                JOIN inventory_serials ins ON ins.id = il.inventory_serial_id
                WHERE ins.serial_number = $1 AND il.new_status = 'SOLD' AND il.changed_by IS NOT NULL
                ORDER BY il.id DESC LIMIT 1
            """, sale["serial_number"])
            if not cashier_id:
                # pos_invoices.cashier_id is NOT NULL and these sales predate the audit trail
                cashier_id = await conn.fetchval(
                    "SELECT id FROM users ORDER BY (role = 'ADMIN') DESC, id ASC LIMIT 1"
                )

            invoice_id = await conn.fetchval("""
                INSERT INTO pos_invoices (receipt_no, subtotal, total_discount, grand_total, payment_method,
                                          cashier_id, sale_date, branch_id, customer_name, customer_phone)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id
            """, reference, final_price + discount, discount, final_price, payment, cashier_id,
                sale["created_at"], branch_id, field(remarks, "Customer") or None, field(remarks, "Phone") or None)

            inventory_serial_id = await conn.fetchval("""
                INSERT INTO inventory_serials (product_id, serial_number, status, purchase_price, branch_id)
                VALUES ($1, $2, 'SOLD', COALESCE((SELECT purchase_price FROM products WHERE id = $1), 0), $3)
                ON CONFLICT (serial_number) DO UPDATE SET status = 'SOLD', updated_at = CURRENT_TIMESTAMP
                RETURNING id
            """, sale["product_id"], sale["serial_number"], branch_id)

            await conn.execute("""
                INSERT INTO pos_invoice_items (invoice_id, product_id, inventory_serial_id, serial_number,
                                               original_price, discount_percent, discount_amount, final_price,
                                               warranty_start_date, warranty_end_date, warranty_status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
                        COALESCE($10::timestamptz, $9::timestamptz + INTERVAL '90 days'), 'ACTIVE')
            """, invoice_id, sale["product_id"], inventory_serial_id, sale["serial_number"],
                final_price + discount, float(sale["discount_percent"] or 0), discount, final_price,
                sale["created_at"], sale["warranty_expired_date"])
            copied += 1

        await conn.execute("INSERT INTO app_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING", migration_name)

    logger.info(f"Step 12: copied {copied} sales from stock_transactions into the POS tables.")


async def migrate_device_types_into_products(conn) -> None:
    """
    One-time: fold the retired `device_types` table into `products` and point devices at products.

    - products.device_model / products.supplier_id are filled from the product's device type
    - devices.product_id is filled from the device's type, else from the serial's latest stock intake
    - devices.device_type_id, products.device_types_id and the device_types table are then dropped

    Recorded in app_migrations, so it runs once. On a database that never had device_types (a fresh
    install) it only records itself.
    """
    from backend.device_types import resolve_product_id

    migration_name = "20260919_device_types_into_products"
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS app_migrations (
            name VARCHAR(150) PRIMARY KEY,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    """)
    if await conn.fetchval("SELECT 1 FROM app_migrations WHERE name = $1", migration_name):
        return

    had_table = await conn.fetchval("SELECT to_regclass('public.device_types') IS NOT NULL")
    product_cols = await _column_info(conn, "products")
    device_cols = await _column_info(conn, "devices")

    async with conn.transaction():
        if had_table and "device_types_id" in product_cols:
            # The model code and supplier of the type become the product's own
            await conn.execute("""
                UPDATE products p
                SET device_model = COALESCE(p.device_model, dt.device_model),
                    supplier_id = COALESCE(p.supplier_id, dt.supplier_id)
                FROM device_types dt
                WHERE dt.id = p.device_types_id;
            """)

        if "product_id" in device_cols:
            if had_table and "device_type_id" in device_cols and "device_types_id" in product_cols:
                await conn.execute("""
                    UPDATE devices d
                    SET product_id = x.id
                    FROM (
                        SELECT DISTINCT ON (device_types_id) device_types_id, id
                        FROM products
                        WHERE device_types_id IS NOT NULL
                        ORDER BY device_types_id, is_active DESC, is_order ASC NULLS LAST, id ASC
                    ) x
                    WHERE d.product_id IS NULL AND x.device_types_id = d.device_type_id;
                """)
            # Anything still unlinked follows the product on its serial
            await conn.execute("""
                UPDATE devices d
                SET product_id = inv.product_id
                FROM inventory_serials inv
                WHERE d.product_id IS NULL AND inv.serial_number = d.device_id
                  AND inv.product_id IS NOT NULL;
            """)

            # Last resort: match the legacy type text (or the old type name) to a product of the same kind
            leftovers = await conn.fetch("""
                SELECT d.id,
                       {type_text} AS device_type,
                       {model_text} AS device_model,
                       {supplier} AS supplier_id
                FROM devices d WHERE d.product_id IS NULL
            """.format(
                type_text=("(SELECT dt.device_type FROM device_types dt WHERE dt.id = d.device_type_id)"
                           if had_table and "device_type_id" in device_cols else "NULL::text"),
                model_text=("(SELECT dt.device_model FROM device_types dt WHERE dt.id = d.device_type_id)"
                            if had_table and "device_type_id" in device_cols else "NULL::text"),
                supplier=("d.supplier_id" if "supplier_id" in device_cols else "NULL::int"),
            ))
            for row in leftovers:
                product_id = await resolve_product_id(conn, row["device_type"], row["device_model"], row["supplier_id"])
                if product_id:
                    await conn.execute("UPDATE devices SET product_id = $1 WHERE id = $2", product_id, row["id"])

        await conn.execute("ALTER TABLE devices DROP COLUMN IF EXISTS device_type_id;")
        await conn.execute("ALTER TABLE products DROP COLUMN IF EXISTS device_types_id;")
        await conn.execute("DROP TABLE IF EXISTS device_types CASCADE;")
        await conn.execute("UPDATE products SET is_order = id WHERE is_order IS NULL;")
        await conn.execute("INSERT INTO app_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", migration_name)

    linked = await conn.fetchval("SELECT COUNT(*) FROM devices WHERE product_id IS NOT NULL")
    total = await conn.fetchval("SELECT COUNT(*) FROM devices")
    logger.info(f"Step 11: device_types folded into products; {linked} of {total} devices linked to a product.")
