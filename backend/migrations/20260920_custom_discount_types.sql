-- Reusable types for entered discounts; preserve existing named promotions.
BEGIN;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT FALSE;
LOCK TABLE discounts IN SHARE ROW EXCLUSIVE MODE;
INSERT INTO discounts (code, discount_type, discount_value, is_active, is_custom)
SELECT 'CUSTOM-PERCENTAGE', 'PERCENTAGE', 0, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM discounts WHERE is_custom = TRUE AND discount_type = 'PERCENTAGE');
INSERT INTO discounts (code, discount_type, discount_value, is_active, is_custom)
SELECT 'CUSTOM-FIXED', 'FIXED', 0, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM discounts WHERE is_custom = TRUE AND discount_type = 'FIXED');
COMMIT;
