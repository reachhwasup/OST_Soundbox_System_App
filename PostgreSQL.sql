-- ====================================================================
-- OST SOUNDBOX SYSTEM - PRODUCTION UNIFIED DATABASE SCHEMA
-- ====================================================================
-- Matches the production database. Columns marked "app addition" do not exist on older
-- production databases; the backend adds them automatically on startup (backend/database.py).

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
    CREATE TYPE stock_action AS ENUM ('IN', 'OUT', 'REJECT');
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- 2. Branches
CREATE TABLE IF NOT EXISTS branches (
    branch_id SERIAL PRIMARY KEY,
    branch_code VARCHAR(50) NOT NULL UNIQUE,
    branch_name VARCHAR(150) NOT NULL,
    location TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO branches (branch_code, branch_name, location)
VALUES
    ('PP-01', 'Phnom Penh Head Office', 'Phnom Penh'),
    ('KP-01', 'Kampot Branch', 'Kampot'),
    ('SR-01', 'Siem Reap Branch', 'Siem Reap')
ON CONFLICT (branch_code) DO NOTHING;


-- 3. Users (Authentication & Permissions)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'USER',
    status user_status NOT NULL DEFAULT 'ACTIVE',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    branch_id INTEGER REFERENCES branches(branch_id),                                   -- app addition
    permissions JSONB DEFAULT '{"tabs": ["all"], "crud": ["all"]}'::jsonb                -- app addition
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);


-- 4. Merchants / Stores
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    telegram_chat_id VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON merchants(user_id);
CREATE INDEX IF NOT EXISTS idx_merchants_owner_phone ON merchants(owner_phone);


-- 5. Suppliers
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

CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);

INSERT INTO suppliers (name, is_active)
VALUES ('Feishu', TRUE), ('Hemi', TRUE)
ON CONFLICT (name) DO NOTHING;


-- 6. Products (catalog). base_price = selling price; purchase_price = cost from the supplier.
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
    is_order INTEGER,
    purchase_price NUMERIC(10, 2),                                                        -- app addition: cost from the supplier
    min_stock_level INTEGER DEFAULT 5                                                     -- app addition: reorder level
);

CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);

-- device_model is a placeholder: production's hardware model codes are not in this repo
INSERT INTO products (sku, name, base_price, default_warranty_months, device_model, supplier_id, is_order, is_active)
SELECT v.sku, v.name, v.base_price, 3, v.device_model, s.id, v.is_order, TRUE
FROM (VALUES
    ('SCR-LED-W4G', 'Soundbox LED Screen (Wifi + 4G only)', 39.99, 'SCR-LED-W4G', 'Hemi', 1),
    ('SCR-NLED-W4G', 'Soundbox None LED Screen (Wifi + 4G only)', 29.99, 'SCR-NLED-W4G', 'Feishu', 2),
    ('SCR-NLED-4GO', 'Soundbox None LED Screen (4G only)', 24.99, 'SCR-NLED-4GO', 'Feishu', 3)
) AS v(sku, name, base_price, device_model, supplier_name, is_order)
LEFT JOIN suppliers s ON s.name = v.supplier_name
ON CONFLICT (sku) DO NOTHING;


-- 7. Soundbox Devices (hardware fleet & telemetry). The serial number is device_id.
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
    -- Written by the hardware gateway service
    imei VARCHAR(50),
    imsi VARCHAR(50),
    iccid VARCHAR(50),
    volume INTEGER,
    vlver VARCHAR(100),
    lang INTEGER,
    batt_mv INTEGER,
    adc VARCHAR(50),
    ssid VARCHAR(100),
    mac VARCHAR(50),
    notes TEXT,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    qr_code TEXT,
    last_online TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    firmware_version_4g VARCHAR(64),
    verno VARCHAR(32),
    firmware_version_wifi VARCHAR(64),
    battery_percentage INTEGER,
    battery_mv INTEGER,
    signal_strength INTEGER,
    language VARCHAR(16),
    last_seen_at TIMESTAMP WITH TIME ZONE,
    raw_telemetry JSONB,
    status device_status DEFAULT 'ACTIVE',                                                -- app addition
    price NUMERIC(10, 2) DEFAULT 29.00,                                                   -- app addition
    batch_no VARCHAR(100),                                                                -- app addition
    branch_id INTEGER REFERENCES branches(branch_id),                                     -- app addition
    product_id BIGINT REFERENCES products(id) ON DELETE SET NULL                          -- app addition
);

CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_merchant_id ON devices(merchant_id);
CREATE INDEX IF NOT EXISTS idx_devices_telegram_chat_id ON devices(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_devices_product_id ON devices(product_id);
CREATE INDEX IF NOT EXISTS idx_devices_branch_id ON devices(branch_id);


-- 8. Views over the tables above: what is in stock, and what has been sold.
-- Stock lives in inventory_serials; sales live in pos_invoices + pos_invoice_items.
-- Both are created at the end of this file, after those tables exist.


-- 9. Payment Transactions (deduplication & voice broadcasting). device_id holds the device serial.
CREATE SEQUENCE IF NOT EXISTS transactions_id_seq;
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(64) PRIMARY KEY DEFAULT nextval('transactions_id_seq'::regclass),
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

CREATE INDEX IF NOT EXISTS idx_transactions_txid ON transactions(txid);
CREATE INDEX IF NOT EXISTS idx_transactions_bank_txid ON transactions(bank_tx_id);
CREATE INDEX IF NOT EXISTS idx_transactions_device_id ON transactions(device_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);


-- 10. Telegram Group Users
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


-- 11. Official Bank Bots Whitelist
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


-- 12. Security & Fraud Alerts. device_id holds the device serial, merchant_id the store id as text.
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


-- 13. Discounts
CREATE TABLE IF NOT EXISTS discounts (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type VARCHAR(20) NOT NULL,
    discount_value NUMERIC(10, 2) NOT NULL,
    is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);


-- 14. Inventory Serials (per-serial status; purchase_price = supplier cost of that unit)
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

CREATE INDEX IF NOT EXISTS idx_inv_serials_branch ON inventory_serials(branch_id);
CREATE INDEX IF NOT EXISTS idx_inv_serials_product ON inventory_serials(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_serials_status ON inventory_serials(status);


-- 15. Inventory Logs (status audit trail)
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

CREATE INDEX IF NOT EXISTS idx_inv_logs_serial ON inventory_logs(inventory_serial_id);
CREATE INDEX IF NOT EXISTS idx_inv_logs_branch ON inventory_logs(branch_id);


-- 16. POS Invoices
CREATE TABLE IF NOT EXISTS pos_invoices (
    id BIGSERIAL PRIMARY KEY,
    receipt_no VARCHAR(50) NOT NULL UNIQUE,
    subtotal NUMERIC(10, 2) NOT NULL,
    total_discount NUMERIC(10, 2) DEFAULT 0.00,
    grand_total NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    cashier_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    branch_id INTEGER NOT NULL REFERENCES branches(branch_id) ON DELETE RESTRICT,
    customer_name VARCHAR(150),                                                           -- app addition
    customer_phone VARCHAR(50)                                                            -- app addition
);

CREATE INDEX IF NOT EXISTS idx_pos_invoices_branch ON pos_invoices(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_invoices_cashier ON pos_invoices(cashier_id);
CREATE INDEX IF NOT EXISTS idx_pos_invoices_date ON pos_invoices(sale_date);


-- 17. POS Invoice Items
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
    warranty_status VARCHAR(20) DEFAULT 'ACTIVE',
    discount_percent NUMERIC(5, 2) DEFAULT 0.00,                                          -- app addition
    serial_number VARCHAR(100)                                                            -- app addition
);

CREATE INDEX IF NOT EXISTS idx_pos_items_invoice ON pos_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_pos_items_serial ON pos_invoice_items(inventory_serial_id);


-- 18. Applied app migrations (app addition)
CREATE TABLE IF NOT EXISTS app_migrations (
    name VARCHAR(150) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Views (defined last: they read the tables above)
CREATE OR REPLACE VIEW v_branch_product_stock AS
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

CREATE OR REPLACE VIEW v_sales AS
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
