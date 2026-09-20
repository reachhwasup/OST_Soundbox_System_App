import os
import asyncio
import logging
import asyncpg
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")


db_pool: Optional[asyncpg.Pool] = None


async def get_db_pool() -> asyncpg.Pool:
    global db_pool
    if db_pool is None:
        for attempt in range(1, 11):
            try:
                db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=20, command_timeout=60)
                logger.info(f"Connected to PostgreSQL database pool on attempt {attempt}.")
                break
            except Exception as e:
                if attempt == 10:
                    logger.error(f"Could not connect to PostgreSQL database after 10 attempts: {e}")
                    raise e
                logger.warning(f"PostgreSQL not ready yet (attempt {attempt}/10): {e}. Retrying in 1.5s...")
                await asyncio.sleep(1.5)
    return db_pool


async def init_db():
    """Initializes database schema, executes migrations and seeds default admin and demo users."""
    from backend.security import hash_password
    from backend.schema_migrations import (
        SALES_VIEW_SQL,
        STOCK_VIEW_SQL,
        align_legacy_schema_to_production,
        migrate_device_types_into_products,
        migrate_ledger_into_pos_tables,
        migrate_legacy_sales,
        run_statements,
    )

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        logger.info("Initializing database schema and checking migrations...")

        # 1. Custom Enum Types
        try:
            await conn.execute("""
                DO $$ BEGIN
                    CREATE TYPE currency_type AS ENUM ('USD', 'KHR');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;

                DO $$ BEGIN
                    CREATE TYPE device_status AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'IN_STOCK', 'RETIRED');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;

                DO $$ BEGIN
                    CREATE TYPE tx_status AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'DUPLICATE');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;

                DO $$ BEGIN
                    CREATE TYPE user_role AS ENUM ('ADMIN', 'USER');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;

                DO $$ BEGIN
                    CREATE TYPE user_status AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            """)

            # Safely ensure all device_status enum values exist in PostgreSQL
            for val in ['IN_STOCK', 'PENDING', 'RETIRED']:
                try:
                    await conn.execute(f"ALTER TYPE device_status ADD VALUE IF NOT EXISTS '{val}';")
                except Exception:
                    pass
            logger.info("Step 1 (Enums) initialized successfully.")
        except Exception as e:
            logger.warning(f"Step 1 (Enums) warning: {e}")

        # 2. Users Table
        try:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    phone_number VARCHAR(50) NOT NULL UNIQUE,
                    full_name VARCHAR(255),
                    password_hash VARCHAR(255) NOT NULL,
                    role user_role NOT NULL DEFAULT 'USER',
                    status user_status NOT NULL DEFAULT 'ACTIVE',
                    is_active BOOLEAN DEFAULT TRUE,
                    last_login_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
                UPDATE users SET is_active = TRUE WHERE is_active IS NULL;
                CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
                CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
                CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
                CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
            """)
            logger.info("Step 2 (Users Table) initialized successfully.")
        except Exception as e:
            logger.warning(f"Step 2 (Users Table) warning: {e}")

        # 3. Merchants Table
        try:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS merchants (
                    id SERIAL PRIMARY KEY,
                    merchant_id VARCHAR(100),
                    merchant_name VARCHAR(255),
                    name VARCHAR(255) NOT NULL,
                    place VARCHAR(255),
                    location VARCHAR(255),
                    telegram_chat_id VARCHAR(100),
                    user_id INT REFERENCES users(id) ON DELETE SET NULL,
                    owner_phone VARCHAR(50) NOT NULL,
                    province VARCHAR(100),
                    district VARCHAR(100),
                    commune VARCHAR(100),
                    village VARCHAR(100),
                    street VARCHAR(255),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );

                ALTER TABLE merchants ADD COLUMN IF NOT EXISTS id SERIAL;
                ALTER TABLE merchants ADD COLUMN IF NOT EXISTS merchant_id VARCHAR(100);
                ALTER TABLE merchants ADD COLUMN IF NOT EXISTS merchant_name VARCHAR(255);
                ALTER TABLE merchants ADD COLUMN IF NOT EXISTS name VARCHAR(255);
                ALTER TABLE merchants ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE SET NULL;
                ALTER TABLE merchants ADD COLUMN IF NOT EXISTS owner_phone VARCHAR(50);
                ALTER TABLE merchants ADD COLUMN IF NOT EXISTS province VARCHAR(100);
                ALTER TABLE merchants ADD COLUMN IF NOT EXISTS district VARCHAR(100);
                ALTER TABLE merchants ADD COLUMN IF NOT EXISTS commune VARCHAR(100);
                ALTER TABLE merchants ADD COLUMN IF NOT EXISTS village VARCHAR(100);
                ALTER TABLE merchants ADD COLUMN IF NOT EXISTS street VARCHAR(255);
                ALTER TABLE merchants ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(100);

                DO $$ BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                        WHERE tc.table_name = 'merchants' AND tc.constraint_type = 'PRIMARY KEY' AND kcu.column_name = 'merchant_id'
                    ) THEN
                        ALTER TABLE merchants ALTER COLUMN merchant_id DROP NOT NULL;
                    END IF;
                EXCEPTION WHEN OTHERS THEN null;
                END $$;

                DO $$ BEGIN
                    ALTER TABLE merchants ALTER COLUMN merchant_name DROP NOT NULL;
                EXCEPTION WHEN OTHERS THEN null;
                END $$;

                -- Auto-sync columns so merchant_id and merchant_name are always populated
                UPDATE merchants SET
                    merchant_id = COALESCE(merchant_id, id::text),
                    merchant_name = COALESCE(merchant_name, name, 'Store'),
                    name = COALESCE(name, merchant_name, 'Store'),
                    id = COALESCE(id, CASE WHEN merchant_id::text ~ '^[0-9]+$' THEN merchant_id::text::int ELSE NULL END)
                WHERE merchant_id IS NULL OR merchant_name IS NULL OR name IS NULL;

                ALTER TABLE merchants DROP CONSTRAINT IF EXISTS merchants_owner_phone_key;
                CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON merchants(user_id);
                CREATE INDEX IF NOT EXISTS idx_merchants_owner_phone ON merchants(owner_phone);
            """)
            logger.info("Step 3 (Merchants Table) initialized successfully.")
        except Exception as e:
            logger.warning(f"Step 3 (Merchants Table) warning: {e}")

        # 4. Suppliers Table
        try:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS suppliers (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(150) NOT NULL UNIQUE,
                    contact_person VARCHAR(150),
                    phone VARCHAR(50),
                    email VARCHAR(150),
                    address TEXT,
                    notes TEXT,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
                CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);

                -- Ensure default suppliers exist
                INSERT INTO suppliers (name, is_active)
                VALUES ('Feishu', TRUE), ('Hemi', TRUE)
                ON CONFLICT (name) DO NOTHING;
            """)
            logger.info("Step 4 (Suppliers Table) initialized successfully.")
        except Exception as e:
            logger.warning(f"Step 4 (Suppliers Table) warning: {e}")

        # 4b. Branches and the stock action enum (other tables reference them)
        await run_statements(conn, "Step 4b (Branches)", [
            """
            DO $$ BEGIN
                CREATE TYPE stock_action AS ENUM ('IN', 'OUT', 'REJECT');
            EXCEPTION WHEN duplicate_object THEN null; END $$;
            """,
            """
            CREATE TABLE IF NOT EXISTS branches (
                branch_id SERIAL PRIMARY KEY,
                branch_code VARCHAR(50) NOT NULL UNIQUE,
                branch_name VARCHAR(150) NOT NULL,
                location TEXT,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            );
            """,
            """
            INSERT INTO branches (branch_code, branch_name, location)
            VALUES
                ('PP-01', 'Phnom Penh Head Office', 'Phnom Penh'),
                ('KP-01', 'Kampot Branch', 'Kampot'),
                ('SR-01', 'Siem Reap Branch', 'Siem Reap')
            ON CONFLICT (branch_code) DO NOTHING;
            """,
        ])

        # 4c. Convert a legacy (pre-production-schema) local database to the production schema
        try:
            await align_legacy_schema_to_production(conn)
        except Exception as e:
            logger.warning(f"Step 4c (Align legacy schema to production) warning: {e}")

        # 5. Devices Table (production shape: the serial number is devices.device_id)
        await run_statements(conn, "Step 5 (Devices Table)", [
            """
            CREATE TABLE IF NOT EXISTS devices (
                id SERIAL PRIMARY KEY,
                device_id VARCHAR(100),
                merchant_id INTEGER,
                supplier_id INTEGER,
                telegram_chat_id VARCHAR(100),
                is_active BOOLEAN DEFAULT TRUE,
                battery VARCHAR(50),
                signal VARCHAR(50),
                version_4g VARCHAR(255),
                version_wifi VARCHAR(255),
                notes TEXT,
                last_heartbeat TIMESTAMP WITH TIME ZONE,
                qr_code TEXT,
                last_online TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """,
            "ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_merchant_id_fkey;",
            "ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_telegram_chat_id_key;",
            # Production columns (some are written by the hardware gateway service)
            *[f"ALTER TABLE devices ADD COLUMN IF NOT EXISTS {col};" for col in (
                "device_id VARCHAR(100)", "merchant_id INTEGER", "supplier_id INTEGER",
                "telegram_chat_id VARCHAR(100)", "is_active BOOLEAN DEFAULT TRUE",
                "battery VARCHAR(50)", "signal VARCHAR(50)", "version_4g VARCHAR(255)", "version_wifi VARCHAR(255)",
                "imei VARCHAR(50)", "imsi VARCHAR(50)", "iccid VARCHAR(50)", "volume INTEGER",
                "vlver VARCHAR(100)", "lang INTEGER", "batt_mv INTEGER", "adc VARCHAR(50)",
                "ssid VARCHAR(100)", "mac VARCHAR(50)", "notes TEXT",
                "last_heartbeat TIMESTAMP WITH TIME ZONE", "qr_code TEXT", "last_online TIMESTAMP WITH TIME ZONE",
                "created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",
                "updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",
                "firmware_version_4g VARCHAR(64)", "verno VARCHAR(32)", "firmware_version_wifi VARCHAR(64)",
                "battery_percentage INTEGER", "battery_mv INTEGER", "signal_strength INTEGER",
                "language VARCHAR(16)", "last_seen_at TIMESTAMP WITH TIME ZONE", "raw_telemetry JSONB",
            )],
            # Additions required by this app (no production equivalent)
            # status / price are added empty (existing rows are backfilled from real data in step 14),
            # then get a default for new rows
            "ALTER TABLE devices ADD COLUMN IF NOT EXISTS status device_status;",
            "ALTER TABLE devices ALTER COLUMN status SET DEFAULT 'ACTIVE';",
            "ALTER TABLE devices ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2);",
            "ALTER TABLE devices ALTER COLUMN price SET DEFAULT 29.00;",
            "ALTER TABLE devices ADD COLUMN IF NOT EXISTS batch_no VARCHAR(100);",
            "ALTER TABLE devices ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(branch_id);",
            "CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);",
            "CREATE INDEX IF NOT EXISTS idx_devices_telegram_chat_id ON devices(telegram_chat_id);",
            "CREATE INDEX IF NOT EXISTS idx_devices_branch_id ON devices(branch_id);",
        ])

        # 6. Remove long-retired legacy columns and tables
        await run_statements(conn, "Step 6 (Legacy Cleanup)", [
            # Legacy `sales` rows are copied into stock_transactions by step 12 (migrate_legacy_sales).
            # The table itself is dropped manually: backend/migrations/20260916_drop_legacy_sales_table.sql
            *[f"ALTER TABLE devices DROP COLUMN IF EXISTS {col};" for col in (
                "discount_amount", "discount_percent", "final_price", "warranty_days", "warranty_start_date",
                "warranty_end_date", "supplier", "chat_id", "device_name", "store_id", "telegram_bot_token",
            )],
            *[f"ALTER TABLE merchants DROP COLUMN IF EXISTS {col};" for col in (
                "password_hash", "role", "status", "telegram_bot_token",
            )],
            "DROP TABLE IF EXISTS stores CASCADE;",
        ])

        # 7. Transactions, Telegram bots and security alerts (production shape: text ids)
        await run_statements(conn, "Step 7 (Transactions & Security)", [
            """
            CREATE TABLE IF NOT EXISTS transactions (
                id VARCHAR(64) PRIMARY KEY,
                txid VARCHAR(150),
                bank_tx_id VARCHAR(150),
                bank_name VARCHAR(50),
                chat_id VARCHAR(100),
                device_id VARCHAR(100),
                amount NUMERIC(12, 2) NOT NULL,
                currency VARCHAR(10) NOT NULL DEFAULT 'USD',
                payer_name VARCHAR(255),
                raw_payload TEXT,
                raw_telegram_message TEXT,
                status VARCHAR(50) DEFAULT 'PROCESSED',
                device_ack BOOLEAN DEFAULT FALSE,
                ack_status VARCHAR(50),
                ack_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                raw_text TEXT,
                is_played BOOLEAN DEFAULT FALSE,
                playback_status VARCHAR(32) DEFAULT 'MQTT_DELIVERED',
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
            """,
            "CREATE SEQUENCE IF NOT EXISTS transactions_id_seq;",
            "ALTER TABLE transactions ALTER COLUMN id SET DEFAULT nextval('transactions_id_seq'::regclass);",
            "ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_device_id_fkey;",
            *[f"ALTER TABLE transactions ADD COLUMN IF NOT EXISTS {col};" for col in (
                "txid VARCHAR(150)", "chat_id VARCHAR(100)", "raw_payload TEXT", "device_ack BOOLEAN DEFAULT FALSE",
                "ack_status VARCHAR(50)", "ack_at TIMESTAMP WITH TIME ZONE", "raw_text TEXT",
                "is_played BOOLEAN DEFAULT FALSE", "playback_status VARCHAR(32) DEFAULT 'MQTT_DELIVERED'",
                "updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()",
            )],
            "CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);",
            "CREATE INDEX IF NOT EXISTS idx_transactions_device_id ON transactions(device_id);",
            """
            CREATE TABLE IF NOT EXISTS group_users (
                id SERIAL PRIMARY KEY,
                chat_id VARCHAR(50) NOT NULL,
                user_id VARCHAR(50) NOT NULL,
                username VARCHAR(100),
                full_name TEXT,
                is_authorized BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_chat_user UNIQUE (chat_id, user_id)
            );
            """,
            *[f"ALTER TABLE group_users DROP COLUMN IF EXISTS {col};" for col in ("first_name", "last_name", "is_bot")],
            """
            CREATE TABLE IF NOT EXISTS official_bank_bots (
                bot_id VARCHAR(50) PRIMARY KEY,
                bot_name VARCHAR(100),
                bank_name VARCHAR(50),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            INSERT INTO official_bank_bots (bot_id, bot_name, bank_name, is_active)
            VALUES
                ('123456789', 'ababank_bot', 'ABA Bank Bot', TRUE),
                ('987654321', 'acleda_bot', 'ACLEDA Bank Bot', TRUE)
            ON CONFLICT (bot_id) DO NOTHING;
            """,
            """
            CREATE TABLE IF NOT EXISTS security_alerts (
                id BIGSERIAL PRIMARY KEY,
                device_id VARCHAR(100),
                merchant_id VARCHAR(100),
                alert_type VARCHAR(50) NOT NULL,
                severity VARCHAR(20) DEFAULT 'WARNING',
                bank_name VARCHAR(50),
                bank_tx_id VARCHAR(150),
                amount NUMERIC(12, 2),
                currency VARCHAR(10) DEFAULT 'USD',
                sender_user_id VARCHAR(100),
                sender_name VARCHAR(255),
                raw_message TEXT,
                reason TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """,
            "ALTER TABLE security_alerts DROP CONSTRAINT IF EXISTS security_alerts_device_id_fkey;",
            "ALTER TABLE security_alerts DROP CONSTRAINT IF EXISTS security_alerts_merchant_id_fkey;",
            "CREATE INDEX IF NOT EXISTS idx_security_alerts_merchant ON security_alerts(merchant_id);",
            "CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at DESC);",
        ])

        # 8. Products (production shape). The stock_transactions ledger is retired: stock lives in
        #    inventory_serials and sales in pos_invoices / pos_invoice_items.
        await run_statements(conn, "Step 8 (Products)", [
            """
            CREATE TABLE IF NOT EXISTS products (
                id BIGSERIAL PRIMARY KEY,
                sku VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(100),
                base_price NUMERIC(10, 2) NOT NULL,
                default_warranty_months INTEGER DEFAULT 3,
                device_model VARCHAR(120),
                supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                is_order INTEGER
            );
            """,
            # Cost from the supplier. base_price is the selling price, so the two never share a column.
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(10, 2);",
            # Retired: selling_price is now base_price; unit / cost_price are pre-production leftovers
            "DROP VIEW IF EXISTS v_branch_product_stock;",
            *[f"ALTER TABLE products DROP COLUMN IF EXISTS {col};" for col in ("selling_price", "unit", "cost_price")],
            # Addition required by this app: reorder level for low-stock warnings
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 5;",
            "ALTER TABLE products ALTER COLUMN min_stock_level SET DEFAULT 5;",
            # Hardware details moved here when device_types was retired (step 11)
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS device_model VARCHAR(120);",
            # Widening only: production uses 120, older local databases were created at 50.
            # The stock view reads this column, so it is dropped first and rebuilt by step 13.
            "DROP VIEW IF EXISTS v_branch_product_stock;",
            "ALTER TABLE products ALTER COLUMN device_model TYPE VARCHAR(120);",
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL;",
            "CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);",
            # Addition required by this app: the product a device is (replaces devices.device_type_id)
            "ALTER TABLE devices ADD COLUMN IF NOT EXISTS product_id BIGINT REFERENCES products(id) ON DELETE SET NULL;",
            "CREATE INDEX IF NOT EXISTS idx_devices_product_id ON devices(product_id);",
            # device_model is a placeholder: production's hardware model codes are not in this repo
            """
            INSERT INTO products (sku, name, base_price, default_warranty_months, device_model, supplier_id, is_active, is_order)
            SELECT v.sku, v.name, v.base_price, 3, v.device_model, s.id, TRUE, v.is_order
            FROM (VALUES
                ('SCR-LED-W4G', 'Soundbox LED Screen (Wifi + 4G only)', 39.99, 'SCR-LED-W4G', 'Hemi', 1),
                ('SCR-NLED-W4G', 'Soundbox None LED Screen (Wifi + 4G only)', 29.99, 'SCR-NLED-W4G', 'Feishu', 2),
                ('SCR-NLED-4GO', 'Soundbox None LED Screen (4G only)', 24.99, 'SCR-NLED-4GO', 'Feishu', 3)
            ) AS v(sku, name, base_price, device_model, supplier_name, is_order)
            LEFT JOIN suppliers s ON s.name = v.supplier_name
            WHERE NOT EXISTS (SELECT 1 FROM products);
            """,
            # Additions required by this app: branch scoping and permissions
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(branch_id);",
            """ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"tabs": ["all"], "crud": ["all"]}'::jsonb;""",
        ])

        # 9. Seed Default Administrator Account (Configurable via environment)
        try:
            admin_phone = os.getenv("ADMIN_PHONE", "012345678").strip()
            admin_pass_raw = os.getenv("ADMIN_PASSWORD", "")
            admin_name = os.getenv("ADMIN_NAME", "System Administrator").strip()

            if admin_phone and admin_pass_raw:
                admin_pass = hash_password(admin_pass_raw)
                await conn.execute("""
                    INSERT INTO users (phone_number, full_name, password_hash, role, status)
                    VALUES ($1, $2, $3, 'ADMIN', 'ACTIVE')
                    ON CONFLICT (phone_number) DO NOTHING
                """, admin_phone, admin_name, admin_pass)

            logger.info("Step 9 (Admin Seed) initialized successfully.")
        except Exception as e:
            logger.warning(f"Step 9 (Admin Seed) warning: {e}")

        # 10. PRD compatibility tables
        await run_statements(conn, "Step 10 (PRD Compatibility Tables)", [
            """
            CREATE TABLE IF NOT EXISTS discounts (
                id BIGSERIAL PRIMARY KEY,
                code VARCHAR(50) NOT NULL UNIQUE,
                discount_type VARCHAR(20) NOT NULL,
                discount_value NUMERIC(10, 2) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS inventory_serials (
                id BIGSERIAL PRIMARY KEY,
                product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
                serial_number VARCHAR(100) NOT NULL UNIQUE,
                status VARCHAR(20) DEFAULT 'IN_STOCK',
                warehouse_location VARCHAR(50),
                received_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                purchase_price NUMERIC(10, 2) DEFAULT 0.00,
                branch_id INTEGER REFERENCES branches(branch_id) ON DELETE SET NULL
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_inv_serials_branch ON inventory_serials(branch_id);",
            "CREATE INDEX IF NOT EXISTS idx_inv_serials_product ON inventory_serials(product_id);",
            "CREATE INDEX IF NOT EXISTS idx_inv_serials_status ON inventory_serials(status);",
            """
            CREATE TABLE IF NOT EXISTS inventory_logs (
                id BIGSERIAL PRIMARY KEY,
                inventory_serial_id BIGINT REFERENCES inventory_serials(id) ON DELETE SET NULL,
                previous_status VARCHAR(20),
                new_status VARCHAR(20),
                changed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
                changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                branch_id INTEGER REFERENCES branches(branch_id) ON DELETE SET NULL
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_inv_logs_serial ON inventory_logs(inventory_serial_id);",
            "CREATE INDEX IF NOT EXISTS idx_inv_logs_branch ON inventory_logs(branch_id);",
            """
            CREATE TABLE IF NOT EXISTS pos_invoices (
                id BIGSERIAL PRIMARY KEY,
                receipt_no VARCHAR(50) NOT NULL UNIQUE,
                subtotal NUMERIC(10, 2) NOT NULL,
                total_discount NUMERIC(10, 2) DEFAULT 0.00,
                grand_total NUMERIC(10, 2) NOT NULL,
                payment_method VARCHAR(20) NOT NULL,
                cashier_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                sale_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                branch_id INTEGER NOT NULL REFERENCES branches(branch_id) ON DELETE RESTRICT
            );
            """,
            "CREATE INDEX IF NOT EXISTS idx_pos_invoices_branch ON pos_invoices(branch_id);",
            "CREATE INDEX IF NOT EXISTS idx_pos_invoices_cashier ON pos_invoices(cashier_id);",
            "CREATE INDEX IF NOT EXISTS idx_pos_invoices_date ON pos_invoices(sale_date);",
            """
            CREATE TABLE IF NOT EXISTS pos_invoice_items (
                id BIGSERIAL PRIMARY KEY,
                invoice_id BIGINT REFERENCES pos_invoices(id) ON DELETE CASCADE,
                product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
                inventory_serial_id BIGINT REFERENCES inventory_serials(id) ON DELETE SET NULL,
                original_price NUMERIC(10, 2) NOT NULL,
                discount_id BIGINT REFERENCES discounts(id) ON DELETE SET NULL,
                discount_amount NUMERIC(10, 2) DEFAULT 0.00,
                final_price NUMERIC(10, 2) NOT NULL,
                warranty_start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                warranty_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
                warranty_status VARCHAR(20) DEFAULT 'ACTIVE'
            );
            """,
            # Additions required by this app: the customer a sale belongs to, and a typed percentage
            "ALTER TABLE pos_invoices ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150);",
            "ALTER TABLE pos_invoices ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);",
            "ALTER TABLE pos_invoice_items ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) DEFAULT 0.00;",
            "ALTER TABLE pos_invoice_items ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);",
            "CREATE INDEX IF NOT EXISTS idx_pos_items_serial_number ON pos_invoice_items(serial_number);",
            "CREATE INDEX IF NOT EXISTS idx_pos_items_invoice ON pos_invoice_items(invoice_id);",
            "CREATE INDEX IF NOT EXISTS idx_pos_items_serial ON pos_invoice_items(inventory_serial_id);",
        ])

        # Reusable manual discount types; existing promotions retain their fixed values.
        from pathlib import Path
        await conn.execute((Path(__file__).parent / "migrations" / "20260920_custom_discount_types.sql").read_text())
        await conn.execute((Path(__file__).parent / "migrations" / "20260920_remove_store_subdomains.sql").read_text())

        # 11. One-time: fold the retired device_types table into products and point devices at products
        try:
            await migrate_device_types_into_products(conn)
        except Exception as e:
            logger.warning(f"Step 11 (Device types into products) warning: {e}")

        # 12a. Copy legacy `sales` rows into stock_transactions (runs only while the legacy table exists)
        try:
            await migrate_legacy_sales(conn)
        except Exception as e:
            logger.warning(f"Step 12a (Legacy sales migration) warning: {e}")

        # 12b. One-time: move the stock_transactions ledger into the POS tables and inventory_serials
        try:
            await migrate_ledger_into_pos_tables(conn)
        except Exception as e:
            logger.warning(f"Step 12b (Ledger into POS tables) warning: {e}")

        # 13. Warehouse stock view (dropped first so column changes never block it)
        await run_statements(conn, "Step 13 (Stock & Sales Views)", [
            "DROP VIEW IF EXISTS v_branch_product_stock;",
            STOCK_VIEW_SQL,
            "DROP VIEW IF EXISTS v_sales;",
            SALES_VIEW_SQL,
        ])

        # 14. Fill device status / price for rows that existed before those columns were added
        await run_statements(conn, "Step 14 (Device status backfill)", [
            """
            UPDATE devices d SET status = 'IN_STOCK'
            WHERE d.status IS NULL
              AND EXISTS (SELECT 1 FROM v_branch_product_stock v WHERE v.serial_number = d.device_id);
            """,
            "UPDATE devices SET status = 'ACTIVE' WHERE status IS NULL AND merchant_id IS NOT NULL;",
            # Sold but not linked to a store yet: waiting for registration
            """
            UPDATE devices d SET status = 'PENDING'
            WHERE d.status IS NULL
              AND EXISTS (SELECT 1 FROM inventory_serials inv
                          WHERE inv.serial_number = d.device_id AND inv.status = 'SOLD');
            """,
            """
            UPDATE devices d SET price = p.base_price
            FROM inventory_serials inv
            JOIN products p ON p.id = inv.product_id
            WHERE d.price IS NULL AND inv.serial_number = d.device_id;
            """,
        ])

        logger.info("Database schema and migrations check completed.")
