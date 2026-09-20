-- Drop the legacy `sales` table.
-- Sales are stored in stock_transactions (action_type = 'OUT'); /api/sales reads from there.
--
-- Run manually, once per database, AFTER the backend has started with the new code
-- (startup step 12 copies every legacy sale into stock_transactions).
--
--   psql "$DATABASE_URL" -f backend/migrations/20260916_drop_legacy_sales_table.sql
--
-- Back up the table first:
--   pg_dump "$DATABASE_URL" -t sales > sales_backup.sql
--
-- Safe to run on a database that has no `sales` table: it does nothing.

BEGIN;

DO $$
DECLARE
    total_sales INTEGER;
    missing INTEGER;
    missing_ids TEXT;
BEGIN
    IF to_regclass('public.sales') IS NULL THEN
        RAISE NOTICE 'No legacy sales table; nothing to drop.';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO total_sales FROM sales;

    -- Every legacy sale must have an OUT row: copied by step 12 (marker) or recorded by the new flow
    SELECT COUNT(*), string_agg(s.id::text, ', ' ORDER BY s.id)
    INTO missing, missing_ids
    FROM sales s
    WHERE NOT EXISTS (
        SELECT 1 FROM stock_transactions st
        WHERE st.action_type = 'OUT'
          AND (
              POSITION('[legacy_sale_id=' || s.id || ']' IN COALESCE(st.remarks, '')) > 0
              OR (st.serial_number = s.device_sn
                  AND ABS(EXTRACT(EPOCH FROM (st.created_at - COALESCE(s.warranty_start_date, s.created_at)::timestamp))) <= 120)
          )
    );

    IF missing > 0 THEN
        RAISE EXCEPTION 'Not dropping sales: % of % legacy sales are not in stock_transactions (ids: %). Start the backend once, then retry.',
            missing, total_sales, missing_ids;
    END IF;

    RAISE NOTICE 'All % legacy sales are in stock_transactions. Dropping table sales.', total_sales;
    EXECUTE 'DROP TABLE sales';
END $$;

COMMIT;
