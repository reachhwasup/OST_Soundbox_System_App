-- ====================================================================
-- OST SOUNDBOX SYSTEM - PRODUCTION-MATCHED UNIFIED SCHEMA
-- ====================================================================

-- 1. Users Table (Authentication & Permissions)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'USER',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);


-- 2. Merchants Table (Stores & Branches)
CREATE TABLE IF NOT EXISTS merchants (
    merchant_id VARCHAR(100) PRIMARY KEY,
    id SERIAL,
    merchant_name VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    owner_phone VARCHAR(50),
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
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


-- 3. Devices Table (Soundbox Speakers & Telemetry)
CREATE TABLE IF NOT EXISTS devices (
    device_id VARCHAR(100) PRIMARY KEY,
    id SERIAL,
    merchant_id VARCHAR(100),
    chat_id VARCHAR(100),
    device_name VARCHAR(255),
    device_sn VARCHAR(100),
    device_model VARCHAR(50) DEFAULT 'Y6B',
    till_id VARCHAR(100),
    telegram_chat_id VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    battery VARCHAR(50),
    signal VARCHAR(50),
    version_4g VARCHAR(255),
    version_wifi VARCHAR(255),
    last_online TIMESTAMP WITH TIME ZONE,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_devices_chat_id ON devices(chat_id);
CREATE INDEX IF NOT EXISTS idx_devices_merchant_id ON devices(merchant_id);
CREATE INDEX IF NOT EXISTS idx_devices_sn ON devices(device_sn);


-- 4. Transactions Table (Bank Payments & Deduplication)
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_txid ON transactions(txid);
CREATE INDEX IF NOT EXISTS idx_transactions_device_id ON transactions(device_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);


-- 5. Group Users Table (Telegram Group Members)
CREATE TABLE IF NOT EXISTS group_users (
    id SERIAL PRIMARY KEY,
    chat_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    username VARCHAR(100),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name TEXT,
    is_bot BOOLEAN DEFAULT FALSE,
    is_authorized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_chat_user UNIQUE (chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_users_lookup ON group_users(chat_id, user_id);


-- 6. Official Bank Bots Table
CREATE TABLE IF NOT EXISTS official_bank_bots (
    bot_id VARCHAR(50) PRIMARY KEY,
    bot_name VARCHAR(100),
    bank_name VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO official_bank_bots (bot_id, bot_name, bank_name, is_active) 
VALUES 
    ('123456789', 'ababank_bot', 'ABA Bank Bot', TRUE),
    ('987654321', 'acleda_bot', 'ACLEDA Bank Bot', TRUE)
ON CONFLICT (bot_id) DO NOTHING;


-- 7. Security Alerts Table
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

CREATE INDEX IF NOT EXISTS idx_security_alerts_merchant ON security_alerts(merchant_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at DESC);