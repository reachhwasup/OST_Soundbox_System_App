-- Retire the device_types table: a product now carries its own hardware details.
--
--   products.device_model  the hardware model code (was device_types.device_model)
--   products.supplier_id   who the product comes from (was device_types.supplier_id)
--   devices.product_id     the product a device is (was devices.device_type_id)
--   products.name          the device type shown in the app (was device_types.device_type)
--
-- The backend applies exactly this on startup and records it in app_migrations, so running the app
-- once is enough. This script is the same migration for pgAdmin / psql, and is safe to run twice.
--
--   pg_dump "$DATABASE_URL" -t device_types -t products -t devices > device_types_backup.sql
--   psql "$DATABASE_URL" -f backend/migrations/20260919_device_types_into_products.sql

BEGIN;

CREATE TABLE IF NOT EXISTS app_migrations (
    name VARCHAR(150) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1. New columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS device_model VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE devices  ADD COLUMN IF NOT EXISTS product_id BIGINT REFERENCES products(id) ON DELETE SET NULL;

-- 2. Move the type's details onto the product
DO $$
BEGIN
    IF to_regclass('public.device_types') IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'device_types_id') THEN
        UPDATE products p
        SET device_model = COALESCE(p.device_model, dt.device_model),
            supplier_id  = COALESCE(p.supplier_id, dt.supplier_id)
        FROM device_types dt
        WHERE dt.id = p.device_types_id;

        -- 3a. Point each device at the product of its old device type
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'devices' AND column_name = 'device_type_id') THEN
            UPDATE devices d
            SET product_id = x.id
            FROM (
                SELECT DISTINCT ON (device_types_id) device_types_id, id
                FROM products
                WHERE device_types_id IS NOT NULL
                ORDER BY device_types_id, is_active DESC, is_order ASC NULLS LAST, id ASC
            ) x
            WHERE d.product_id IS NULL AND x.device_types_id = d.device_type_id;
        END IF;
    END IF;
END $$;

-- 3b. Anything still unlinked follows the product its serial was stocked as
UPDATE devices d
SET product_id = x.product_id
FROM (
    SELECT DISTINCT ON (serial_number) serial_number, product_id
    FROM stock_transactions
    WHERE serial_number IS NOT NULL AND product_id IS NOT NULL
    ORDER BY serial_number, transaction_id DESC
) x
WHERE d.product_id IS NULL AND x.serial_number = d.device_id;

-- 4. The model code falls back to the SKU so no product is left without one
UPDATE products SET device_model = sku WHERE device_model IS NULL OR device_model = '';
UPDATE products SET is_order = id WHERE is_order IS NULL;

-- 5. Drop the old links and the table (the stock view is rebuilt by the backend on startup)
DROP VIEW IF EXISTS v_branch_product_stock;
ALTER TABLE devices  DROP COLUMN IF EXISTS device_type_id;
ALTER TABLE products DROP COLUMN IF EXISTS device_types_id;
DROP TABLE IF EXISTS device_types CASCADE;

CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_devices_product_id ON devices(product_id);

INSERT INTO app_migrations (name) VALUES ('20260919_device_types_into_products')
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- Devices left without a product (no type, never stocked). Assign them in Manage Product / Manage Stock:
--   SELECT device_id FROM devices WHERE product_id IS NULL;
