-- ====================================================================
-- OST SOUNDBOX SYSTEM - PRODUCTION UNIFIED DATABASE SCHEMA
-- ====================================================================

-- 1. Custom Enum Types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'USER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE device_status AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'IN_STOCK', 'PENDING', 'RETIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE currency_type AS ENUM ('USD', 'KHR');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE tx_status AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'DUPLICATE');
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- 2. Users Table (Authentication & Permissions)
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


-- 3. Merchants / Stores Table
CREATE TABLE IF NOT EXISTS merchants (
    id SERIAL PRIMARY KEY,
    merchant_id VARCHAR(100),
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    merchant_name VARCHAR(255),
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


-- 4. Suppliers Table
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

-- Seed default suppliers
INSERT INTO suppliers (name, is_active)
VALUES ('Feishu', TRUE), ('Hemi', TRUE)
ON CONFLICT (name) DO NOTHING;


-- 5. Soundbox Devices Table (Hardware Fleet & Telemetry)
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(100),
    device_sn VARCHAR(100) UNIQUE NOT NULL,
    merchant_id INT REFERENCES merchants(id) ON DELETE SET NULL,
    supplier_id INT REFERENCES suppliers(id) ON DELETE SET NULL,
    device_type VARCHAR(50) DEFAULT 'Display Soundbox',
    price NUMERIC(10, 2) DEFAULT 29.00,
    telegram_chat_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    is_active BOOLEAN DEFAULT TRUE,
    battery VARCHAR(50) DEFAULT '100%',
    signal VARCHAR(50) DEFAULT 'Good',
    version_4g VARCHAR(255),
    version_wifi VARCHAR(255),
    notes TEXT,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    last_online TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_devices_sn ON devices(device_sn);
CREATE INDEX IF NOT EXISTS idx_devices_merchant_id ON devices(merchant_id);
CREATE INDEX IF NOT EXISTS idx_devices_supplier_id ON devices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_devices_telegram ON devices(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);


-- 6. Sales Table (Device Sales Orders & Warranty Tracking)
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


-- 7. Payment Transactions Table (Deduplication & Voice Broadcasting)
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
CREATE INDEX IF NOT EXISTS idx_transactions_bank_txid ON transactions(bank_tx_id);
CREATE INDEX IF NOT EXISTS idx_transactions_device_id ON transactions(device_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);


-- 6. Telegram Group Users Table
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


-- 7. Official Bank Bots Whitelist
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


-- 8. Security & Fraud Alerts Table
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


-- 9. Inventory, Branches & Stock Transactions Module
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