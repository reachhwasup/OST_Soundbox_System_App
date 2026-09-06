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

        # 2. Users Table
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

        # 3. Merchants Table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS merchants (
                merchant_id SERIAL PRIMARY KEY,
                merchant_name VARCHAR(150) NOT NULL,
                name VARCHAR(150),
                id INT,
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
            ALTER TABLE merchants ADD COLUMN IF NOT EXISTS merchant_id VARCHAR(100);
            ALTER TABLE merchants ADD COLUMN IF NOT EXISTS merchant_name VARCHAR(255);
            ALTER TABLE merchants ADD COLUMN IF NOT EXISTS name VARCHAR(255);
            ALTER TABLE merchants ADD COLUMN IF NOT EXISTS id INT;
            ALTER TABLE merchants ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE SET NULL;
            ALTER TABLE merchants ADD COLUMN IF NOT EXISTS owner_phone VARCHAR(50);
            ALTER TABLE merchants ADD COLUMN IF NOT EXISTS province VARCHAR(100);
            ALTER TABLE merchants ADD COLUMN IF NOT EXISTS district VARCHAR(100);
            ALTER TABLE merchants ADD COLUMN IF NOT EXISTS commune VARCHAR(100);
            ALTER TABLE merchants ADD COLUMN IF NOT EXISTS village VARCHAR(100);
            ALTER TABLE merchants ADD COLUMN IF NOT EXISTS street VARCHAR(150);
            ALTER TABLE merchants ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(100);
            ALTER TABLE merchants ALTER COLUMN merchant_id DROP NOT NULL;
            ALTER TABLE merchants ALTER COLUMN merchant_name DROP NOT NULL;

            -- Auto-sync columns so merchant_id and merchant_name are always populated
            UPDATE merchants SET
                merchant_id = COALESCE(merchant_id, id::text),
                merchant_name = COALESCE(merchant_name, name, 'Store'),
                name = COALESCE(name, merchant_name, 'Store'),
                id = COALESCE(id, CASE WHEN merchant_id ~ '^[0-9]+$' THEN merchant_id::int ELSE NULL END)
            WHERE merchant_id IS NULL OR merchant_name IS NULL OR name IS NULL;

            ALTER TABLE merchants DROP CONSTRAINT IF EXISTS merchants_owner_phone_key;
            CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON merchants(user_id);
            CREATE INDEX IF NOT EXISTS idx_merchants_owner_phone ON merchants(owner_phone);
        """)

        # 4. Suppliers Table
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

        # 5. Devices Table (Multiple Soundbox speakers can share the same Telegram group)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS devices (
                id SERIAL PRIMARY KEY,
                merchant_id INT REFERENCES merchants(id) ON DELETE SET NULL,
                device_sn VARCHAR(100),
                device_model VARCHAR(50) DEFAULT 'Y6B',
                telegram_chat_id VARCHAR(100),
                status device_status DEFAULT 'ACTIVE',
                last_heartbeat TIMESTAMP WITH TIME ZONE,
                battery VARCHAR(50),
                signal VARCHAR(50),
                version_4g VARCHAR(255),
                version_wifi VARCHAR(255),
                last_online TIMESTAMP WITH TIME ZONE,
                device_id VARCHAR(100),
                device_name VARCHAR(255),
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
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0.00;
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) DEFAULT 0.00;
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS final_price NUMERIC(10, 2) DEFAULT 29.00;
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS warranty_days INT DEFAULT 90;
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS warranty_start_date TIMESTAMP WITH TIME ZONE;
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS warranty_end_date TIMESTAMP WITH TIME ZONE;
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_online TIMESTAMP WITH TIME ZONE;
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_id VARCHAR(100);
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_name VARCHAR(255);
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS chat_id VARCHAR(100);
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS qr_code TEXT;
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS supplier VARCHAR(100) DEFAULT 'Feishu';
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS supplier_id INT REFERENCES suppliers(id) ON DELETE SET NULL;

            -- Migrate any existing records with legacy or null supplier to Feishu
            UPDATE devices SET supplier = 'Feishu' WHERE supplier = 'Eishu' OR supplier IS NULL;

            -- Auto-link supplier_id based on supplier name
            UPDATE devices d
            SET supplier_id = s.id
            FROM suppliers s
            WHERE LOWER(TRIM(d.supplier)) = LOWER(TRIM(s.name)) AND d.supplier_id IS NULL;

            -- Fallback: assign any remaining unlinked devices to Feishu
            UPDATE devices
            SET supplier_id = (SELECT id FROM suppliers WHERE name = 'Feishu' LIMIT 1)
            WHERE supplier_id IS NULL;

            -- Synchronize supplier string from supplier_id
            UPDATE devices d
            SET supplier = s.name
            FROM suppliers s
            WHERE d.supplier_id = s.id AND (d.supplier IS NULL OR d.supplier != s.name);

            -- Auto-sync columns if existing records have legacy names
            UPDATE devices SET
                device_sn = COALESCE(device_sn, device_id, id::text),
                device_model = COALESCE(device_model, device_name, 'Y6B'),
                telegram_chat_id = COALESCE(telegram_chat_id, chat_id),
                last_heartbeat = COALESCE(last_heartbeat, last_online)
            WHERE device_sn IS NULL OR telegram_chat_id IS NULL;

            ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_telegram_chat_id_key;
            CREATE INDEX IF NOT EXISTS idx_devices_telegram_chat_id ON devices(telegram_chat_id);
            CREATE INDEX IF NOT EXISTS idx_devices_sn ON devices(device_sn);
            CREATE INDEX IF NOT EXISTS idx_devices_supplier_id ON devices(supplier_id);
        """)

        # 6. Sales Table (Device Sales Orders & Warranty Tracking)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS sales (
                id SERIAL PRIMARY KEY,
                device_id INT REFERENCES devices(id) ON DELETE SET NULL,
                device_sn VARCHAR(100) NOT NULL,
                merchant_id INT REFERENCES merchants(id) ON DELETE SET NULL,
                sold_by_user_id INT REFERENCES users(id) ON DELETE SET NULL,
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
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_sales_device_id ON sales(device_id);
            CREATE INDEX IF NOT EXISTS idx_sales_device_sn ON sales(device_sn);
            CREATE INDEX IF NOT EXISTS idx_sales_merchant_id ON sales(merchant_id);
            CREATE INDEX IF NOT EXISTS idx_sales_sold_by ON sales(sold_by_user_id);
            CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

            -- Auto-migrate existing sold or pending devices into sales ledger if not present
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
        """)

        # 7. Transactions Table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id BIGSERIAL PRIMARY KEY,
                device_id INT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
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
                alert_type VARCHAR(50) NOT NULL, -- 'DUPLICATE_TX', 'UNAUTHORIZED_SENDER', 'MALFORMED_PAYMENT'
                severity VARCHAR(20) DEFAULT 'WARNING', -- 'WARNING', 'CRITICAL', 'INFO'
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



        # 6. Seed Default Administrator Account (Configurable via environment)
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

        logger.info("Database schema and admin initialized successfully.")
