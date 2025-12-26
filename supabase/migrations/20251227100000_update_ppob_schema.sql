-- Migration to update PPOB Products schema for profit tracking and multi-tenancy
-- Date: 2025-12-27

-- 1. Add columns
ALTER TABLE ppob_products 
ADD COLUMN IF NOT EXISTS koperasi_id UUID REFERENCES koperasi(id),
ADD COLUMN IF NOT EXISTS price_buy NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS code TEXT;

-- 2. Rename price to price_sell if not already
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'ppob_products' AND column_name = 'price') THEN
    ALTER TABLE ppob_products RENAME COLUMN price TO price_sell;
  END IF;
END $$;

-- 3. Populate code from id if empty
UPDATE ppob_products SET code = id WHERE code IS NULL;

-- 4. Update price_buy (assume 2% margin for existing data)
UPDATE ppob_products SET price_buy = price_sell * 0.98 WHERE price_buy = 0;

-- 5. Link existing products to a Koperasi (Optional: For now we might leave null if global, but Service expects it)
-- If we want global products, we should remove koperasi_id check in Service.
-- But strict multi-tenancy says data belongs to tenant.
-- Let's assign all current products to the first found Koperasi for dev purposes.
UPDATE ppob_products 
SET koperasi_id = (SELECT id FROM koperasi LIMIT 1) 
WHERE koperasi_id IS NULL;

-- 6. Add Indexes
CREATE INDEX IF NOT EXISTS idx_ppob_products_koperasi ON ppob_products(koperasi_id);
CREATE INDEX IF NOT EXISTS idx_ppob_products_code ON ppob_products(code);
CREATE INDEX IF NOT EXISTS idx_ppob_products_category ON ppob_products(category);

-- 7. Update RLS to check koperasi_id
DROP POLICY IF EXISTS "Everyone can view active products" ON ppob_products;
CREATE POLICY "Members view active products"
  ON ppob_products FOR SELECT
  TO authenticated
  USING (
    is_active = true AND 
    (koperasi_id IS NULL OR koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid()))
  );
  -- Note: We allow koperasi_id IS NULL to support "System Global" products if we decide to use them later.

-- 8. Add is_test_transaction to ppob_transactions for consistency
ALTER TABLE ppob_transactions
ADD COLUMN IF NOT EXISTS is_test_transaction BOOLEAN DEFAULT FALSE;
