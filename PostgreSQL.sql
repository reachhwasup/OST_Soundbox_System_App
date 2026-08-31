-- ====================================================================
-- OST SOUNDBOX SYSTEM - UNIFIED DATABASE SCHEMA (PostgreSQL)
-- ====================================================================

-- 1. Custom Enum Types
DO $$ BEGIN
    CREATE TYPE currency_type AS ENUM ('USD', 'KHR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE device_status AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');
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


-- 2. Users Table (ការគ្រប់គ្រងអ្នកប្រើប្រាស់ និងសិទ្ធិប្រើប្រាស់)
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


-- 3. Merchants / Stores Table (ព័ត៌មានអាជីវករ និងសាខាហាង)
CREATE TABLE IF NOT EXISTS merchants (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    owner_phone VARCHAR(50) NOT NULL,
    place VARCHAR(255),
    location VARCHAR(255),
    province VARCHAR(100),
    district VARCHAR(100),
    commune VARCHAR(100),
    village VARCHAR(100),
    street VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON merchants(user_id);
CREATE INDEX IF NOT EXISTS idx_merchants_owner_phone ON merchants(owner_phone);


-- 4. Devices Table (ការគ្រប់គ្រងឧបករណ៍ Soundbox Y6B Speaker)
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    merchant_id INT REFERENCES merchants(id) ON DELETE SET NULL,
    device_sn VARCHAR(100),                          -- Serial Number របស់ Y6B
    device_model VARCHAR(50) DEFAULT 'Y6B',
    telegram_chat_id VARCHAR(100),                    -- Telegram Group Verification Code / Chat ID
    status device_status DEFAULT 'ACTIVE',
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    battery VARCHAR(50),                              -- Battery percentage (e.g. '100%')
    signal VARCHAR(50),                               -- Signal strength (e.g. 'Excellent (-47 dBm)')
    version_4g VARCHAR(255),                          -- 4G Modem Firmware Version
    version_wifi VARCHAR(255),                        -- WiFi ESP32 Firmware Version
    last_online TIMESTAMP WITH TIME ZONE,             -- Last online timestamp
    device_id VARCHAR(100),                           -- Hardware Device ID alias
    device_name VARCHAR(255),                         -- Device Name alias
    chat_id VARCHAR(100),                             -- Telegram Chat ID alias
    is_active BOOLEAN DEFAULT TRUE,                   -- Active status boolean
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_devices_telegram_chat_id ON devices(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_devices_sn ON devices(device_sn);
CREATE INDEX IF NOT EXISTS idx_devices_merchant ON devices(merchant_id);


-- 5. Transactions Table (រក្សាទុកប្រវត្តិប្រតិបត្តិការទូទាត់ និងការពារការស្រែកឌុប)
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    bank_name VARCHAR(50) NOT NULL,                  -- ABA, ACLEDA, WING, etc.
    bank_tx_id VARCHAR(150) NOT NULL,                -- Transaction ID របស់ធនាគារ
    amount NUMERIC(12, 2) NOT NULL,
    currency currency_type NOT NULL DEFAULT 'USD',
    payer_name VARCHAR(255),
    raw_telegram_message TEXT,
    status tx_status DEFAULT 'PROCESSED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint ការពារមិនឱ្យទិន្នន័យដដែលចូល ២ ដង
    CONSTRAINT unique_bank_tx UNIQUE (bank_name, bank_tx_id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_bank_tx ON transactions(bank_name, bank_tx_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_device ON transactions(device_id);


-- 6. Telegram Group Users & Authorized Bank Bots
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
    id SERIAL PRIMARY KEY,
    bank_name VARCHAR(50) NOT NULL,
    bot_user_id VARCHAR(50) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO official_bank_bots (bank_name, bot_user_id) 
VALUES 
    ('ABA Bank Bot', '123456789'),
    ('ACLEDA Bank Bot', '987654321')
ON CONFLICT (bot_user_id) DO NOTHING;


-- 7. Security Alerts Table (ការ Audit សុវត្ថិភាព និងការទប់ស្កាត់ Fake Payments)
CREATE TABLE IF NOT EXISTS security_alerts (
    id BIGSERIAL PRIMARY KEY,
    device_id INT REFERENCES devices(id) ON DELETE CASCADE,
    merchant_id INT REFERENCES merchants(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,                 -- 'DUPLICATE_TX', 'UNAUTHORIZED_SENDER', 'MALFORMED_PAYMENT'
    severity VARCHAR(20) DEFAULT 'WARNING',          -- 'WARNING', 'CRITICAL', 'INFO'
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