import os
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
                logger.warning(f"PostgreSQL not ready yet (attempt {attempt}/10). Retrying in 1.5s...")
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
                ALTER TYPE device_status ADD VALUE IF NOT EXISTS 'IN_STOCK';
            EXCEPTION WHEN duplicate_object THEN null; END $$;

            DO $$ BEGIN
                ALTER TYPE device_status ADD VALUE IF NOT EXISTS 'RETIRED';
            EXCEPTION WHEN duplicate_object THEN null; END $$;

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

        # 3. Merchants / Stores Table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS merchants (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE SET NULL,
                name VARCHAR(255) NOT NULL,
                owner_phone VARCHAR(50) NOT NULL,
                place VARCHAR(255),
                location VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Ensure missing columns in merchants are added if table pre-existed
        await conn.execute("""
            ALTER TABLE merchants ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE SET NULL;
            ALTER TABLE merchants ADD COLUMN IF NOT EXISTS place VARCHAR(255);
            ALTER TABLE merchants ADD COLUMN IF NOT EXISTS location VARCHAR(255);
            ALTER TABLE merchants ADD COLUMN IF NOT EXISTS province VARCHAR(100);
            ALTER TABLE merchants ADD COLUMN IF NOT EXISTS district VARCHAR(100);
            ALTER TABLE merchants ADD COLUMN IF NOT EXISTS commune VARCHAR(100);
            ALTER TABLE merchants ADD COLUMN IF NOT EXISTS village VARCHAR(100);
            ALTER TABLE merchants ADD COLUMN IF NOT EXISTS street VARCHAR(255);
            ALTER TABLE merchants ALTER COLUMN owner_phone TYPE VARCHAR(50);
            ALTER TABLE merchants DROP CONSTRAINT IF EXISTS merchants_owner_phone_key;
            CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON merchants(user_id);
            CREATE INDEX IF NOT EXISTS idx_merchants_owner_phone ON merchants(owner_phone);
        """)

        # 4. Devices Table (Multiple Soundbox speakers can share the same Telegram group)
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
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS merchant_id INT REFERENCES merchants(id) ON DELETE SET NULL;
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_sn VARCHAR(100);
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
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_online TIMESTAMP WITH TIME ZONE;
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_id VARCHAR(100);
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_name VARCHAR(255);
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS chat_id VARCHAR(100);
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

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
        """)


        # 5. Transactions Table
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
