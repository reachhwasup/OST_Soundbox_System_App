-- Synthetic database with the PRODUCTION schema (generated from a pgAdmin column export on 2026-09-17)
-- plus a small sample of data. Used by backend/tests to verify the backend against production shapes.

CREATE TYPE user_role AS ENUM ('ADMIN','USER');
CREATE TYPE user_status AS ENUM ('ACTIVE','PENDING','SUSPENDED');
CREATE TYPE stock_action AS ENUM ('IN','OUT','REJECT');
CREATE SEQUENCE IF NOT EXISTS users_id_seq;
CREATE TABLE users (
  id integer DEFAULT nextval('users_id_seq'::regclass) NOT NULL,
  phone_number character varying(50) NOT NULL,
  full_name character varying(255),
  password_hash character varying(255) NOT NULL,
  role user_role DEFAULT 'USER'::user_role NOT NULL,
  status user_status DEFAULT 'ACTIVE'::user_status NOT NULL,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  is_active boolean DEFAULT true,
  PRIMARY KEY (id),
  UNIQUE (phone_number)
);
CREATE SEQUENCE IF NOT EXISTS suppliers_id_seq;
CREATE TABLE suppliers (
  id integer DEFAULT nextval('suppliers_id_seq'::regclass) NOT NULL,
  name character varying(150) NOT NULL,
  contact_person character varying(150),
  phone character varying(50),
  email character varying(150),
  address text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (name)
);
CREATE SEQUENCE IF NOT EXISTS branches_branch_id_seq;
CREATE TABLE branches (
  branch_id integer DEFAULT nextval('branches_branch_id_seq'::regclass) NOT NULL,
  branch_code character varying(50) NOT NULL,
  branch_name character varying(150) NOT NULL,
  location text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  is_active boolean DEFAULT true,
  PRIMARY KEY (branch_id),
  UNIQUE (branch_code)
);
CREATE SEQUENCE IF NOT EXISTS device_types_id_seq;
CREATE TABLE device_types (
  id integer DEFAULT nextval('device_types_id_seq'::regclass) NOT NULL,
  supplier_id integer,
  device_model character varying(50) NOT NULL,
  device_type character varying(150) NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  is_active boolean DEFAULT true,
  PRIMARY KEY (id)
);
CREATE SEQUENCE IF NOT EXISTS products_id_seq;
CREATE TABLE products (
  id bigint DEFAULT nextval('products_id_seq'::regclass) NOT NULL,
  sku character varying(50) NOT NULL,
  name character varying(100),
  base_price numeric(10,2) NOT NULL,
  default_warranty_months integer DEFAULT 3,
  device_types_id bigint,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  is_order integer,
  PRIMARY KEY (id),
  UNIQUE (sku)
);
CREATE SEQUENCE IF NOT EXISTS merchants_id_seq;
CREATE TABLE merchants (
  id integer DEFAULT nextval('merchants_id_seq'::regclass) NOT NULL,
  merchant_id character varying(100),
  user_id integer,
  name character varying(255) NOT NULL,
  merchant_name character varying(255),
  owner_phone character varying(50) NOT NULL,
  place character varying(255),
  location character varying(255),
  province character varying(100),
  district character varying(100),
  commune character varying(100),
  village character varying(100),
  street character varying(255),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  telegram_chat_id character varying(100),
  PRIMARY KEY (id)
);
CREATE SEQUENCE IF NOT EXISTS devices_id_seq;
CREATE TABLE devices (
  id integer DEFAULT nextval('devices_id_seq'::regclass) NOT NULL,
  device_id character varying(100),
  merchant_id integer,
  supplier_id integer,
  telegram_chat_id character varying(100),
  is_active boolean DEFAULT true,
  battery character varying(50),
  signal character varying(50),
  version_4g character varying(255),
  version_wifi character varying(255),
  imei character varying(50),
  imsi character varying(50),
  iccid character varying(50),
  volume integer,
  vlver character varying(100),
  lang integer,
  batt_mv integer,
  adc character varying(50),
  ssid character varying(100),
  mac character varying(50),
  notes text,
  last_heartbeat timestamp with time zone,
  qr_code text,
  last_online timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  firmware_version_4g character varying(64),
  verno character varying(32),
  firmware_version_wifi character varying(64),
  battery_percentage integer,
  battery_mv integer,
  signal_strength integer,
  language character varying(16),
  last_seen_at timestamp with time zone,
  raw_telemetry jsonb,
  PRIMARY KEY (id)
);
CREATE SEQUENCE IF NOT EXISTS discounts_id_seq;
CREATE TABLE discounts (
  id bigint DEFAULT nextval('discounts_id_seq'::regclass) NOT NULL,
  code character varying(50) NOT NULL,
  discount_type character varying(20) NOT NULL,
  discount_value numeric(10,2) NOT NULL,
  is_active boolean DEFAULT true,
  PRIMARY KEY (id),
  UNIQUE (code)
);
CREATE SEQUENCE IF NOT EXISTS group_users_id_seq;
CREATE TABLE group_users (
  id integer DEFAULT nextval('group_users_id_seq'::regclass) NOT NULL,
  chat_id character varying(50) NOT NULL,
  user_id character varying(50) NOT NULL,
  username character varying(100),
  full_name text,
  is_authorized boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE SEQUENCE IF NOT EXISTS inventory_serials_id_seq;
CREATE TABLE inventory_serials (
  id bigint DEFAULT nextval('inventory_serials_id_seq'::regclass) NOT NULL,
  product_id bigint,
  serial_number character varying(100) NOT NULL,
  status character varying(20) DEFAULT 'IN_STOCK'::character varying,
  warehouse_location character varying(50),
  received_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  purchase_price numeric(10,2) DEFAULT 0.00,
  branch_id integer,
  PRIMARY KEY (id),
  UNIQUE (serial_number)
);
CREATE SEQUENCE IF NOT EXISTS inventory_logs_id_seq;
CREATE TABLE inventory_logs (
  id bigint DEFAULT nextval('inventory_logs_id_seq'::regclass) NOT NULL,
  inventory_serial_id bigint,
  previous_status character varying(20),
  new_status character varying(20),
  changed_by bigint,
  changed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  notes text,
  branch_id integer,
  PRIMARY KEY (id)
);
CREATE TABLE official_bank_bots (
  bot_id character varying(50) NOT NULL,
  bot_name character varying(100),
  bank_name character varying(50),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (bot_id)
);
CREATE SEQUENCE IF NOT EXISTS pos_invoices_id_seq;
CREATE TABLE pos_invoices (
  id bigint DEFAULT nextval('pos_invoices_id_seq'::regclass) NOT NULL,
  receipt_no character varying(50) NOT NULL,
  subtotal numeric(10,2) NOT NULL,
  total_discount numeric(10,2) DEFAULT 0.00,
  grand_total numeric(10,2) NOT NULL,
  payment_method character varying(20) NOT NULL,
  cashier_id bigint NOT NULL,
  sale_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  branch_id integer NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (receipt_no)
);
CREATE SEQUENCE IF NOT EXISTS pos_invoice_items_id_seq;
CREATE TABLE pos_invoice_items (
  id bigint DEFAULT nextval('pos_invoice_items_id_seq'::regclass) NOT NULL,
  invoice_id bigint,
  product_id bigint,
  inventory_serial_id bigint,
  original_price numeric(10,2) NOT NULL,
  discount_id bigint,
  discount_amount numeric(10,2) DEFAULT 0.00,
  final_price numeric(10,2) NOT NULL,
  warranty_start_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  warranty_end_date timestamp with time zone NOT NULL,
  warranty_status character varying(20) DEFAULT 'ACTIVE'::character varying,
  PRIMARY KEY (id)
);
CREATE SEQUENCE IF NOT EXISTS sales_id_seq;
CREATE TABLE sales (
  id integer DEFAULT nextval('sales_id_seq'::regclass) NOT NULL,
  device_id integer,
  device_sn character varying(100) NOT NULL,
  merchant_id integer,
  sold_by_user_id integer,
  customer_name character varying(150),
  customer_phone character varying(50),
  price numeric(10,2) DEFAULT 29.00 NOT NULL,
  discount_type character varying(20) DEFAULT 'NONE'::character varying,
  discount_percent numeric(5,2) DEFAULT 0.00,
  discount_amount numeric(10,2) DEFAULT 0.00,
  final_price numeric(10,2) DEFAULT 29.00 NOT NULL,
  currency character varying(10) DEFAULT 'USD'::character varying,
  warranty_days integer DEFAULT 90,
  warranty_start_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  warranty_end_date timestamp with time zone,
  payment_method character varying(50) DEFAULT 'CASH'::character varying,
  status character varying(50) DEFAULT 'COMPLETED'::character varying,
  notes text,
  quantity integer DEFAULT 1 NOT NULL,
  invoice_reference character varying(100),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE SEQUENCE IF NOT EXISTS security_alerts_id_seq;
CREATE TABLE security_alerts (
  id bigint DEFAULT nextval('security_alerts_id_seq'::regclass) NOT NULL,
  device_id character varying(100),
  merchant_id character varying(100),
  alert_type character varying(50) NOT NULL,
  severity character varying(20) DEFAULT 'WARNING'::character varying,
  bank_name character varying(50),
  bank_tx_id character varying(150),
  amount numeric(12,2),
  currency character varying(10) DEFAULT 'USD'::character varying,
  sender_user_id character varying(100),
  sender_name character varying(255),
  raw_message text,
  reason text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE SEQUENCE IF NOT EXISTS stock_transactions_transaction_id_seq;
CREATE TABLE stock_transactions (
  transaction_id integer DEFAULT nextval('stock_transactions_transaction_id_seq'::regclass) NOT NULL,
  branch_id integer,
  product_id integer,
  quantity integer NOT NULL,
  action_type stock_action NOT NULL,
  unit_price numeric(12,2) DEFAULT 0.00 NOT NULL,
  reference_no character varying(100),
  remarks text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  discount_percent numeric(5,2) DEFAULT 0.00,
  discount_amount numeric(12,2) DEFAULT 0.00,
  serial_number character varying(100),
  warranty_expired_date date,
  PRIMARY KEY (transaction_id)
);
CREATE SEQUENCE IF NOT EXISTS transactions_id_seq;
CREATE TABLE transactions (
  id character varying(64) DEFAULT nextval('transactions_id_seq'::regclass) NOT NULL,
  txid character varying(150),
  bank_tx_id character varying(150),
  bank_name character varying(50),
  chat_id character varying(100),
  device_id character varying(100),
  amount numeric(12,2) NOT NULL,
  currency character varying(10) DEFAULT 'USD'::character varying NOT NULL,
  payer_name character varying(255),
  raw_payload text,
  raw_telegram_message text,
  status character varying(50) DEFAULT 'PROCESSED'::character varying,
  device_ack boolean DEFAULT false,
  ack_status character varying(50),
  ack_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  raw_text text,
  is_played boolean DEFAULT false,
  playback_status character varying(32) DEFAULT 'MQTT_DELIVERED'::character varying,
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE stock_transactions ADD FOREIGN KEY (product_id) REFERENCES products(id);
ALTER TABLE stock_transactions ADD FOREIGN KEY (branch_id) REFERENCES branches(branch_id);
ALTER TABLE products ADD FOREIGN KEY (device_types_id) REFERENCES device_types(id);

INSERT INTO suppliers (name) VALUES ('Feishu'), ('Hemi');
INSERT INTO device_types (supplier_id, device_model, device_type) VALUES (1, 'Y6B', 'Display Soundbox'), (2, 'Q3', 'Standard Soundbox');
INSERT INTO products (sku, name, base_price, default_warranty_months, device_types_id, is_order)
VALUES ('Y6B-DISP', 'Display Soundbox', 25.00, 12, 1, 1), ('Q3-STD', 'Standard Soundbox', 18.00, 3, 2, 2);
INSERT INTO branches (branch_code, branch_name, location) VALUES ('PP-01','Phnom Penh Head Office','Phnom Penh'), ('KP-01','Kampot Branch','Kampot');
INSERT INTO users (phone_number, full_name, password_hash, role, status) VALUES ('016441474', 'Prd Admin', 'x', 'ADMIN', 'ACTIVE'), ('086630666', 'Shop Owner', 'x', 'USER', 'ACTIVE');
INSERT INTO merchants (merchant_id, user_id, name, merchant_name, owner_phone) VALUES ('1', 2, 'Prd Coffee', 'Prd Coffee', '086630666');
INSERT INTO devices (device_id, merchant_id, supplier_id, telegram_chat_id, battery, signal, battery_percentage, signal_strength, firmware_version_4g, firmware_version_wifi, last_seen_at, raw_telemetry, imei)
VALUES ('PRD-001', 1, 1, '-100123', '90%', 'Good', 77, 21, 'FW4G-2.1', 'FWWIFI-3.0', now(), '{"volume": 70}', '8612345'),
       ('PRD-002', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
       ('PRD-003', NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO stock_transactions (branch_id, product_id, serial_number, quantity, action_type, unit_price, remarks, created_at)
VALUES (1, 1, 'PRD-002', 1, 'IN', 39.00, 'intake', '2026-09-01 10:00'),
       (1, 2, 'PRD-003', 1, 'IN', 29.00, 'intake', '2026-09-01 10:00'),
       (1, 2, 'PRD-003', 1, 'OUT', 29.00, 'Payment: CASH | Customer: A | Phone: 1', '2026-09-05 09:00');
INSERT INTO sales (device_id, device_sn, merchant_id, sold_by_user_id, customer_name, customer_phone, price, final_price, warranty_start_date, warranty_end_date, quantity, invoice_reference, created_at)
VALUES (3, 'PRD-003', NULL, 1, 'A', '1', 29.00, 29.00, '2026-09-05 09:00+07', '2026-12-04 09:00+07', 1, 'INV-1', '2026-09-05 09:00+07'),
       (NULL, 'PRD-LEGACY-9', 1, 1, 'Old Customer', '099', 39.00, 35.00, '2026-08-01 12:00+07', '2026-10-30 12:00+07', 1, NULL, '2026-08-01 12:00+07');
INSERT INTO transactions (id, txid, bank_tx_id, bank_name, chat_id, device_id, amount, currency, payer_name, status, raw_text, is_played)
VALUES ('tx-abc-1', 'TX1', 'BANK1', 'ABA', '-100123', 'PRD-001', 10.50, 'USD', 'Payer', 'PROCESSED', 'raw', TRUE);
INSERT INTO security_alerts (device_id, merchant_id, alert_type, bank_name, amount) VALUES ('PRD-001', '1', 'SPOOF', 'ABA', 5);
