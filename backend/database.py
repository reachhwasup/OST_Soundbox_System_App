import os
import asyncio
import logging
import asyncpg
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ADVANCED 1: ដកលេខសម្ងាត់ចេញពីកូដទាំងស្រុង។ បើគ្មាន DATABASE_URL ក្នុង .env ទេ ប្រព័ន្ធនឹង Error ភ្លាមៗ។
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("CRITICAL ERROR: DATABASE_URL environment variable is not set!")

db_pool: Optional[asyncpg.Pool] = None

async def get_db_pool() -> asyncpg.Pool:
    global db_pool
    if db_pool is None:
        for attempt in range(1, 11):
            try:
                # ADVANCED 2: កំណត់ Pool Size ដើម្បីកុំឲ្យមានបញ្ហាគាំងពេលមានអ្នកប្រើច្រើន
                db_pool = await asyncpg.create_pool(
                    DATABASE_URL, 
                    min_size=2,          
                    max_size=20,         
                    command_timeout=60,  
                )
                logger.info(f"Connected to PostgreSQL database pool on attempt {attempt}.")
                break
            except Exception as e:
                if attempt == 10:
                    logger.error(f"Could not connect to PostgreSQL database after 10 attempts: {e}")
                    raise e
                logger.warning(f"PostgreSQL not ready yet (attempt {attempt}/10): {e}. Retrying in 2s...")
                await asyncio.sleep(2)
    return db_pool

# ADVANCED 3: ប្រមូលផ្តុំកូដ SQL មកដាក់ខាងក្រៅ ដើម្បីឲ្យកូដ Main Function ខ្លីនិងស្រួលមើល
SCHEMA_STEPS = {
    "1_Enums": """
        DO $$ BEGIN CREATE TYPE user_role AS ENUM ('ADMIN', 'USER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
        DO $$ BEGIN CREATE TYPE user_status AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
    """,
    "2_Users_Table": """
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
    """
}

async def init_db():
    """Initializes database schema, executes migrations and seeds default admin and demo users."""
    from backend.security import hash_password

    pool = await get_db_pool()
    
    async with pool.acquire() as conn:
        logger.info("Initializing database schema and checking migrations...")

        # ADVANCED 4: ប្រើ Transaction និង Fail-Fast (ឈប់ភ្លាមបើមាន Error)
        for step_name, sql_query in SCHEMA_STEPS.items():
            try:
                # រាល់ការបង្កើត Table ត្រូវស្ថិតក្នុង Transaction Block តែមួយ
                async with conn.transaction():
                    await conn.execute(sql_query)
                logger.info(f"Step {step_name} initialized successfully.")
            except asyncpg.exceptions.PostgresError as db_err:
                logger.error(f"CRITICAL: Failed at Step {step_name}. Migration aborted. Error: {db_err}")
                raise # បញ្ឈប់ដំណើរការភ្លាមៗ ការពារកុំឲ្យខូច Database
            except Exception as e:
                logger.error(f"Unexpected error at Step {step_name}: {e}")
                raise

        # 9. Seed Default Administrator Account
        logger.info("Seeding Administrator account...")
        try:
            admin_phone = os.getenv("ADMIN_PHONE", "012345678").strip()
            # បង្ខំឲ្យទាញលេខសម្ងាត់ Admin ពី .env ប៉ុណ្ណោះ
            admin_pass_raw = os.getenv("ADMIN_PASSWORD")
            admin_name = os.getenv("ADMIN_NAME", "System Administrator").strip()

            if admin_phone and admin_pass_raw:
                admin_pass = hash_password(admin_pass_raw)
                
                # ការបញ្ចូលទិន្នន័យ (Insert) ក៏ត្រូវប្រើ Transaction ដែរ
                async with conn.transaction():
                    await conn.execute("""
                        INSERT INTO users (phone_number, full_name, password_hash, role, status)
                        VALUES ($1, $2, $3, 'ADMIN', 'ACTIVE')
                        ON CONFLICT (phone_number) DO UPDATE
                        SET role = 'ADMIN', status = 'ACTIVE'
                    """, admin_phone, admin_name, admin_pass)
                logger.info("Step 9 (Admin Seed) initialized successfully.")
            else:
                logger.warning("Admin seeding skipped: ADMIN_PHONE or ADMIN_PASSWORD missing in .env")
                
        except Exception as e:
            logger.error(f"Step 9 (Admin Seed) warning/error: {e}")
            raise # បញ្ឈប់បើបញ្ចូល Admin បរាជ័យ

        logger.info("Database schema and migrations check completed.")