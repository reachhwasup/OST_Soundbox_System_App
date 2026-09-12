import os
import asyncio
import logging
import asyncpg
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:fDdiFw_KB2930otN@ost_postgres:5432/postgres")


db_pool: Optional[asyncpg.Pool] = None


async def get_db_pool() -> asyncpg.Pool:
    global db_pool
    if db_pool is None:
        for attempt in range(1, 11):
            try:
                db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10)
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
                    last_login_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
                CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
                CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
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
                    name VARCHAR(255),
                    place VARCHAR(150),
                    location VARCHAR(255),
                    telegram_chat_id VARCHAR(100),
                    user_id INT REFERENCES users(id) ON DELETE SET NULL,
                    owner_phone VARCHAR(50),
                    province VARCHAR(100),
                    district VARCHAR(100),
                    commune VARCHAR(100),
                    village VARCHAR(100),
                    street VARCHAR(150),
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
                ALTER TABLE merchants ADD COLUMN IF NOT EXISTS street VARCHAR(150);
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

        # 5. Devices Table (Multiple Soundbox speakers can share the same Telegram group)
        try:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS devices (
                    id SERIAL PRIMARY KEY,
                    merchant_id VARCHAR(100),
                    device_sn VARCHAR(100),
                    device_model VARCHAR(50) DEFAULT 'Y6B',
                    device_type VARCHAR(50) DEFAULT 'Display Soundbox',
                    telegram_chat_id VARCHAR(100),
                    status device_status DEFAULT 'ACTIVE',
                    last_heartbeat TIMESTAMP WITH TIME ZONE,
                    battery VARCHAR(50),
                    signal VARCHAR(50),
                    version_4g VARCHAR(255),
                    version_wifi VARCHAR(255),
                    last_online TIMESTAMP WITH TIME ZONE,
                    device_id VARCHAR(100),
                    chat_id VARCHAR(100),
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );

                -- Ensure all hardware telemetry & legacy PRD columns exist safely
                ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_merchant_id_fkey;
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS merchant_id VARCHAR(100);
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_sn VARCHAR(100);
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_type VARCHAR(50) DEFAULT 'Display Soundbox';
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_model VARCHAR(50) DEFAULT 'Y6B';
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(100);
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS status device_status DEFAULT 'ACTIVE';
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP WITH TIME ZONE;
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS battery VARCHAR(50);
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS signal VARCHAR(50);
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS version_4g VARCHAR(255);
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS version_wifi VARCHAR(255);
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS batch_no VARCHAR(100);
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS notes TEXT;
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 29.00;
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_online TIMESTAMP WITH TIME ZONE;
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_id VARCHAR(100);
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS qr_code TEXT;
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS supplier_id INT;

                DO $$ BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'devices_supplier_id_fkey'
                    ) AND EXISTS (
                        SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers'
                    ) THEN
                        ALTER TABLE devices ADD CONSTRAINT devices_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
                    END IF;
                EXCEPTION WHEN OTHERS THEN null;
                END $$;

                -- Fallback: assign any remaining unlinked devices to Feishu supplier
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM suppliers WHERE name = 'Feishu') THEN
                        UPDATE devices
                        SET supplier_id = (SELECT id FROM suppliers WHERE name = 'Feishu' LIMIT 1)
                        WHERE supplier_id IS NULL;
                    END IF;
                EXCEPTION WHEN OTHERS THEN null;
                END $$;

                ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_telegram_chat_id_key;
                CREATE INDEX IF NOT EXISTS idx_devices_telegram_chat_id ON devices(telegram_chat_id);
                CREATE INDEX IF NOT EXISTS idx_devices_sn ON devices(device_sn);
                CREATE INDEX IF NOT EXISTS idx_devices_supplier_id ON devices(supplier_id);
            """)
            logger.info("Step 5 (Devices Table) initialized successfully.")
        except Exception as e:
            logger.warning(f"Step 5 (Devices Table) warning: {e}")

        # 6. Sales Table (Device Sales Orders & Warranty Tracking)
        try:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS sales (
                    id SERIAL PRIMARY KEY,
                    device_id INT,
                    device_sn VARCHAR(100) NOT NULL,
                    merchant_id INT,
                    sold_by_user_id INT,
                    customer_name VARCHAR(150),
                    customer_phone VARCHAR(50),
                    price NUMERIC(10, 2) NOT NULL DEFAULT 29.00,
                    discount_type VARCHAR(20) DEFAULT 'NONE',
                    discount_percent NUMERIC(5, 2) DEFAULT 0.00,
                    discount_amount NUMERIC(10, 2) DEFAULT 0.00,
                    final_price NUMERIC(10, 2) NOT NULL DEFAULT 29.00,
                    currency VARCHAR(10) DEFAULT 'USD',
                    warranty_days INT DEFAULT 90,
                    warranty_start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    warranty_end_date TIMESTAMP WITH TIME ZONE,
                    payment_method VARCHAR(50) DEFAULT 'CASH',
                    status VARCHAR(50) DEFAULT 'COMPLETED',
                    notes TEXT,
                    quantity INT NOT NULL DEFAULT 1,
                    invoice_reference VARCHAR(100),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                ALTER TABLE sales ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 1;
                ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoice_reference VARCHAR(100);
                CREATE INDEX IF NOT EXISTS idx_sales_device_id ON sales(device_id);
                CREATE INDEX IF NOT EXISTS idx_sales_device_sn ON sales(device_sn);
                CREATE INDEX IF NOT EXISTS idx_sales_merchant_id ON sales(merchant_id);
                CREATE INDEX IF NOT EXISTS idx_sales_sold_by ON sales(sold_by_user_id);
                CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
                CREATE INDEX IF NOT EXISTS idx_sales_invoice_reference ON sales(invoice_reference);

                -- Ensure any existing active/sold devices are safely registered in sales before dropping columns
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'devices' AND column_name = 'discount_amount'
                    ) THEN
                        INSERT INTO sales (device_id, device_sn, merchant_id, price, discount_amount, discount_percent, final_price, warranty_days, warranty_start_date, warranty_end_date, status, created_at)
                        SELECT d.id, d.device_sn, 
                               CASE WHEN d.merchant_id::text ~ '^[0-9]+$' THEN d.merchant_id::text::int ELSE NULL END,
                               COALESCE(d.price, 29.00),
                               COALESCE(d.discount_amount, 0.00),
                               COALESCE(d.discount_percent, 0.00),
                               COALESCE(d.final_price, d.price, 29.00),
                               COALESCE(d.warranty_days, 90),
                               COALESCE(d.warranty_start_date, d.created_at, CURRENT_TIMESTAMP),
                               COALESCE(d.warranty_end_date, COALESCE(d.warranty_start_date, d.created_at, CURRENT_TIMESTAMP) + (COALESCE(d.warranty_days, 90) || ' days')::INTERVAL),
                               'COMPLETED',
                               COALESCE(d.warranty_start_date, d.created_at, CURRENT_TIMESTAMP)
                        FROM devices d
                        WHERE (d.status::text IN ('ACTIVE', 'PENDING') OR d.merchant_id IS NOT NULL)
                          AND NOT EXISTS (SELECT 1 FROM sales s WHERE s.device_id = d.id);
                    END IF;
                END $$;

                -- Clean and normalize devices schema by removing redundant transaction and duplicate columns
                ALTER TABLE devices DROP COLUMN IF EXISTS discount_amount;
                ALTER TABLE devices DROP COLUMN IF EXISTS discount_percent;
                ALTER TABLE devices DROP COLUMN IF EXISTS final_price;
                ALTER TABLE devices DROP COLUMN IF EXISTS warranty_days;
                ALTER TABLE devices DROP COLUMN IF EXISTS warranty_start_date;
                ALTER TABLE devices DROP COLUMN IF EXISTS warranty_end_date;
                ALTER TABLE devices DROP COLUMN IF EXISTS supplier;
                ALTER TABLE devices DROP COLUMN IF EXISTS chat_id;
                ALTER TABLE devices DROP COLUMN IF EXISTS device_name;
                ALTER TABLE devices DROP COLUMN IF EXISTS store_id;
                ALTER TABLE devices DROP COLUMN IF EXISTS telegram_bot_token;

                -- Remove legacy/unused fields from merchants and group_users
                ALTER TABLE merchants DROP COLUMN IF EXISTS password_hash;
                ALTER TABLE merchants DROP COLUMN IF EXISTS role;
                ALTER TABLE merchants DROP COLUMN IF EXISTS status;
                ALTER TABLE merchants DROP COLUMN IF EXISTS telegram_bot_token;
                ALTER TABLE group_users DROP COLUMN IF EXISTS first_name;
                ALTER TABLE group_users DROP COLUMN IF EXISTS last_name;
                ALTER TABLE group_users DROP COLUMN IF EXISTS is_bot;
                DROP TABLE IF EXISTS stores CASCADE;
            """)
            logger.info("Step 6 (Sales Table) initialized successfully.")
        except Exception as e:
            logger.warning(f"Step 6 (Sales Table) warning: {e}")

        # 7. Transactions Table
        try:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS transactions (
                    id BIGSERIAL PRIMARY KEY,
                    device_id INT,
                    bank_name VARCHAR(50) NOT NULL,
                    bank_tx_id VARCHAR(150) NOT NULL,
                    amount NUMERIC(12, 2) NOT NULL,
                    currency currency_type NOT NULL DEFAULT 'USD',
                    payer_name VARCHAR(255),
                    raw_telegram_message TEXT,
                    status tx_status DEFAULT 'PROCESSED',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT unique_bank_tx UNIQUE (bank_name, bank_tx_id)
                );
                CREATE INDEX IF NOT EXISTS idx_transactions_bank_tx ON transactions(bank_name, bank_tx_id);
                CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

                ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_device_id_fkey;
                ALTER TABLE transactions ADD COLUMN IF NOT EXISTS txid VARCHAR(150);
                ALTER TABLE transactions ADD COLUMN IF NOT EXISTS chat_id VARCHAR(100);
                ALTER TABLE transactions ADD COLUMN IF NOT EXISTS raw_payload TEXT;
                ALTER TABLE transactions ADD COLUMN IF NOT EXISTS device_ack BOOLEAN DEFAULT FALSE;
                ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ack_status VARCHAR(50);
                ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ack_at TIMESTAMP WITH TIME ZONE;

                CREATE TABLE IF NOT EXISTS group_users (
                    id SERIAL PRIMARY KEY,
                    chat_id VARCHAR(50) NOT NULL,
                    user_id VARCHAR(50) NOT NULL,
                    username VARCHAR(100),
                    full_name VARCHAR(150),
                    is_authorized BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT unique_chat_user UNIQUE (chat_id, user_id)
                );

                CREATE TABLE IF NOT EXISTS official_bank_bots (
                    bot_id VARCHAR(50) PRIMARY KEY,
                    bot_name VARCHAR(100),
                    bank_name VARCHAR(50),
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                ALTER TABLE official_bank_bots ADD COLUMN IF NOT EXISTS bot_id VARCHAR(50);
                ALTER TABLE official_bank_bots ADD COLUMN IF NOT EXISTS bot_name VARCHAR(100);
                ALTER TABLE official_bank_bots ADD COLUMN IF NOT EXISTS bank_name VARCHAR(50);
                ALTER TABLE official_bank_bots ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

                CREATE TABLE IF NOT EXISTS security_alerts (
                    id BIGSERIAL PRIMARY KEY,
                    device_id INT,
                    merchant_id INT,
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
                ALTER TABLE security_alerts DROP CONSTRAINT IF EXISTS security_alerts_device_id_fkey;
                ALTER TABLE security_alerts DROP CONSTRAINT IF EXISTS security_alerts_merchant_id_fkey;
                ALTER TABLE security_alerts ADD COLUMN IF NOT EXISTS device_id VARCHAR(100);
                ALTER TABLE security_alerts ADD COLUMN IF NOT EXISTS merchant_id VARCHAR(100);
                CREATE INDEX IF NOT EXISTS idx_security_alerts_merchant ON security_alerts(merchant_id);
                CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at DESC);

                INSERT INTO official_bank_bots (bot_id, bot_name, bank_name, is_active) 
                VALUES 
                    ('123456789', 'ababank_bot', 'ABA Bank Bot', TRUE),
                    ('987654321', 'acleda_bot', 'ACLEDA Bank Bot', TRUE)
                ON CONFLICT (bot_id) DO NOTHING;
            """)
            logger.info("Step 7 (Transactions & Security) initialized successfully.")
        except Exception as e:
            logger.warning(f"Step 7 (Transactions & Security) warning: {e}")

        # 8. Branches, Products & Stock Transactions Module
        try:
            await conn.execute("""
                DO $$ BEGIN
                    CREATE TYPE stock_action AS ENUM ('IN', 'OUT', 'REJECT');
                EXCEPTION WHEN duplicate_object THEN null; END $$;

                CREATE TABLE IF NOT EXISTS branches (
                    branch_id SERIAL PRIMARY KEY,
                    branch_code VARCHAR(50) NOT NULL UNIQUE,
                    branch_name VARCHAR(150) NOT NULL,
                    location TEXT,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE
                );

                CREATE TABLE IF NOT EXISTS products (
                    product_id SERIAL PRIMARY KEY,
                    item_code VARCHAR(50) NOT NULL UNIQUE,
                    item_name VARCHAR(150) NOT NULL,
                    unit VARCHAR(30) NOT NULL,
                    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                    min_stock_level INTEGER DEFAULT 5,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    warranty_months INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT TRUE
                );

                CREATE TABLE IF NOT EXISTS stock_transactions (
                    transaction_id SERIAL PRIMARY KEY,
                    branch_id INTEGER REFERENCES branches(branch_id) ON DELETE RESTRICT,
                    product_id INTEGER REFERENCES products(product_id) ON DELETE RESTRICT,
                    quantity INTEGER NOT NULL CHECK (quantity > 0),
                    action_type stock_action NOT NULL,
                    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                    reference_no VARCHAR(100),
                    remarks TEXT,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    discount_percent NUMERIC(5, 2) DEFAULT 0.00,
                    discount_amount NUMERIC(12, 2) DEFAULT 0.00,
                    serial_number VARCHAR(100),
                    warranty_expired_date DATE
                );

                CREATE INDEX IF NOT EXISTS idx_stock_trans_action ON stock_transactions(action_type);
                CREATE INDEX IF NOT EXISTS idx_stock_trans_branch ON stock_transactions(branch_id);
                CREATE INDEX IF NOT EXISTS idx_stock_trans_date ON stock_transactions(created_at);
                CREATE INDEX IF NOT EXISTS idx_stock_trans_product ON stock_transactions(product_id);
                CREATE INDEX IF NOT EXISTS idx_stock_trans_serial ON stock_transactions(serial_number);
            """)
            logger.info("Step 8 (Branches & Stock Transactions) initialized successfully.")
        except Exception as e:
            logger.warning(f"Step 8 (Branches & Stock Transactions) warning: {e}")

        # 9. Seed Default Administrator Account (Configurable via environment)
        try:
            admin_phone = os.getenv("ADMIN_PHONE", "012345678").strip()
            admin_pass_raw = os.getenv("ADMIN_PASSWORD", "Admin123!")
            admin_name = os.getenv("ADMIN_NAME", "System Administrator").strip()

            if admin_phone and admin_pass_raw:
                admin_pass = hash_password(admin_pass_raw)
                await conn.execute("""
                    INSERT INTO users (phone_number, full_name, password_hash, role, status)
                    VALUES ($1, $2, $3, 'ADMIN', 'ACTIVE')
                    ON CONFLICT (phone_number) DO UPDATE
                    SET role = 'ADMIN', status = 'ACTIVE'
                """, admin_phone, admin_name, admin_pass)

            logger.info("Step 9 (Admin Seed) initialized successfully.")
        except Exception as e:
            logger.warning(f"Step 9 (Admin Seed) warning: {e}")

        logger.info("Database schema and migrations check completed.")
