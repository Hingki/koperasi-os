-- PPOB Products
CREATE TABLE IF NOT EXISTS ppob_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    code TEXT NOT NULL, -- Product Code (e.g., TSEL10)
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- pulsa, data, pln, pdam, etc.
    provider TEXT NOT NULL, -- Telkomsel, XL, PLN, etc.
    description TEXT,
    price_base NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Harga Beli / Dasar
    price_sell NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Harga Jual ke Anggota
    admin_fee NUMERIC(12, 2) DEFAULT 0, -- Biaya Admin tambahan per produk if any
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(koperasi_id, code)
);

-- Add Trigger for updated_at
DROP TRIGGER IF EXISTS handle_ppob_products_updated_at ON ppob_products;
CREATE TRIGGER handle_ppob_products_updated_at BEFORE UPDATE ON ppob_products FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- RLS
ALTER TABLE ppob_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View PPOB Products" ON ppob_products;
CREATE POLICY "View PPOB Products" ON ppob_products FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Manage PPOB Products" ON ppob_products;
CREATE POLICY "Manage PPOB Products" ON ppob_products FOR ALL TO authenticated USING (
    koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid() AND role IN ('admin', 'pengurus', 'ketua', 'bendahara'))
);

-- Seed some default data (Optional, but helpful for testing)
-- Note: In a real multi-tenant app, we might not want to seed specific koperasi_id here without knowing it. 
-- But for development we can insert via UI.
