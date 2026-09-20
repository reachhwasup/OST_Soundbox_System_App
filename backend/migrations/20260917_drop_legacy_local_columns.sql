-- Remove columns that exist only on older LOCAL databases (never on production).
-- Production is the target schema; the backend no longer reads or writes these columns.
--
-- Run manually, once, AFTER the backend has started with the new code
-- (startup steps 4c and 11 copy their data into the production-shaped columns).
--
--   pg_dump "$DATABASE_URL" -t devices -t products > legacy_columns_backup.sql
--   psql "$DATABASE_URL" -f backend/migrations/20260917_drop_legacy_local_columns.sql
--
-- Safe on production: every column below is absent there, so nothing is dropped.

BEGIN;

DO $$
BEGIN
    -- devices.device_sn: the serial number now lives in devices.device_id
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'devices' AND column_name = 'device_sn') THEN
        IF EXISTS (SELECT 1 FROM devices
                   WHERE device_sn IS NOT NULL AND device_sn <> '' AND (device_id IS NULL OR device_id <> device_sn)) THEN
            RAISE EXCEPTION 'Some devices have device_sn different from device_id. Start the backend once, then check them.';
        END IF;
    END IF;

    -- devices.device_type / device_model: the device now points at a product (devices.product_id),
    -- and the product carries the model code and the supplier.
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'devices' AND column_name = 'device_type') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                       WHERE table_schema = 'public' AND table_name = 'app_migrations')
           OR NOT EXISTS (SELECT 1 FROM app_migrations WHERE name = '20260919_device_types_into_products') THEN
            RAISE EXCEPTION 'Start the backend once first so devices are linked to products.';
        END IF;
        IF EXISTS (SELECT 1 FROM devices WHERE product_id IS NULL) THEN
            RAISE EXCEPTION 'Some devices have no product_id. Fix them before dropping the legacy columns.';
        END IF;
    END IF;
END $$;

DROP INDEX IF EXISTS idx_devices_sn;
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_device_sn_key;
ALTER TABLE devices
    DROP COLUMN IF EXISTS device_sn,
    DROP COLUMN IF EXISTS device_type,
    DROP COLUMN IF EXISTS device_model;

-- products: legacy columns replaced by base_price (supplier cost).
-- products.supplier_id is KEPT: it is where a product's supplier lives now.
ALTER TABLE products
    DROP COLUMN IF EXISTS unit,
    DROP COLUMN IF EXISTS cost_price;
-- products.min_stock_level is kept: it is the reorder level used by Manage Stock

COMMIT;
