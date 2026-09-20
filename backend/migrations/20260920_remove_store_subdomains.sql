-- Remove retired merchant address data. Existing store records are preserved.
-- Deliberately omit CASCADE: unexpected external dependencies must be reviewed.
BEGIN;
DROP INDEX IF EXISTS public.uq_merchants_subdomain;
ALTER TABLE IF EXISTS public.merchants DROP COLUMN IF EXISTS subdomain;
COMMIT;
