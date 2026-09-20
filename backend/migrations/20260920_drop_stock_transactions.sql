-- Retire the stock_transactions ledger.
--
-- What replaced it:
--   sales            -> pos_invoices + pos_invoice_items (read through the view v_sales)
--   stock state      -> inventory_serials (read through the view v_branch_product_stock)
--   movement history -> inventory_logs
--
-- Run this only AFTER the backend has started with the new code, because startup step 12b copies
-- every OUT row into the POS tables and confirms every in-stock serial. This script refuses to run
-- if that migration has not been recorded, or if any sale is missing from the new tables.
--
--   pg_dump "$DATABASE_URL" -t stock_transactions > stock_transactions_backup.sql
--   psql "$DATABASE_URL" -f backend/migrations/20260920_drop_stock_transactions.sql

BEGIN;

DO $$
DECLARE
    missing_sales integer;
    missing_stock integer;
BEGIN
    IF to_regclass('public.stock_transactions') IS NULL THEN
        RAISE NOTICE 'stock_transactions is already gone; nothing to do.';
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public' AND table_name = 'app_migrations')
       OR NOT EXISTS (SELECT 1 FROM app_migrations WHERE name = '20260920_ledger_into_pos_tables') THEN
        RAISE EXCEPTION 'Start the backend once first: it copies the ledger into the POS tables.';
    END IF;

    -- Every sale in the ledger must exist as an invoice item
    SELECT COUNT(*) INTO missing_sales
    FROM stock_transactions st
    WHERE st.action_type = 'OUT'
      AND st.serial_number IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM pos_invoice_items it WHERE it.serial_number = st.serial_number);
    IF missing_sales > 0 THEN
        RAISE EXCEPTION '% sale(s) are not in pos_invoice_items yet. Aborting.', missing_sales;
    END IF;

    -- Every serial the ledger still counts as in stock must be IN_STOCK in inventory_serials
    SELECT COUNT(*) INTO missing_stock
    FROM (
        SELECT DISTINCT ON (serial_number) serial_number, action_type
        FROM stock_transactions WHERE serial_number IS NOT NULL
        ORDER BY serial_number, transaction_id DESC
    ) latest
    WHERE latest.action_type = 'IN'
      AND NOT EXISTS (
          SELECT 1 FROM inventory_serials inv
          WHERE inv.serial_number = latest.serial_number AND inv.status = 'IN_STOCK'
      );
    IF missing_stock > 0 THEN
        RAISE EXCEPTION '% in-stock serial(s) are missing from inventory_serials. Aborting.', missing_stock;
    END IF;
END $$;

DROP TABLE IF EXISTS stock_transactions CASCADE;

COMMIT;

-- The views are rebuilt by the backend on its next start. To rebuild them by hand, restart the app.
