-- Migration: Enhance Retail Module
-- Description: Adds Stock Opname, Returns (Purchase/Sales), and Discounts
-- Date: 2025-12-23

-- 1. Stock Opname (Stok Opname)
CREATE TABLE IF NOT EXISTS inventory_stock_opname (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    unit_usaha_id UUID REFERENCES unit_usaha(id),
    
    opname_date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'draft', -- draft, final
    notes TEXT,
    
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_stock_opname_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opname_id UUID NOT NULL REFERENCES inventory_stock_opname(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES inventory_products(id),
    
    system_qty INTEGER NOT NULL DEFAULT 0, -- Quantity in system before opname
    actual_qty INTEGER NOT NULL DEFAULT 0, -- Quantity counted physically
    difference INTEGER GENERATED ALWAYS AS (actual_qty - system_qty) STORED,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Purchase Returns (Retur Pembelian)
CREATE TABLE IF NOT EXISTS inventory_purchase_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    unit_usaha_id UUID REFERENCES unit_usaha(id),
    purchase_id UUID REFERENCES inventory_purchases(id), -- Optional, can be return without specific purchase ref if needed (but rare)
    supplier_id UUID REFERENCES inventory_suppliers(id),
    
    return_date TIMESTAMPTZ DEFAULT NOW(),
    return_number TEXT NOT NULL, -- Auto-gen
    reason TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, completed, rejected
    total_refund_amount NUMERIC(15, 2) DEFAULT 0,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_purchase_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES inventory_purchase_returns(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES inventory_products(id),
    
    quantity INTEGER NOT NULL,
    refund_amount_per_item NUMERIC(15, 2) NOT NULL,
    subtotal NUMERIC(15, 2) NOT NULL
);

-- 3. Sales Returns (Retur Penjualan)
CREATE TABLE IF NOT EXISTS pos_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    unit_usaha_id UUID REFERENCES unit_usaha(id),
    transaction_id UUID REFERENCES pos_transactions(id),
    
    return_date TIMESTAMPTZ DEFAULT NOW(),
    return_number TEXT NOT NULL, -- Auto-gen
    reason TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, completed, rejected
    total_refund_amount NUMERIC(15, 2) DEFAULT 0,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pos_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES pos_returns(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES inventory_products(id),
    
    quantity INTEGER NOT NULL,
    refund_amount_per_item NUMERIC(15, 2) NOT NULL,
    subtotal NUMERIC(15, 2) NOT NULL
);

-- 4. Discounts (Diskon)
CREATE TABLE IF NOT EXISTS inventory_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    unit_usaha_id UUID REFERENCES unit_usaha(id),
    
    name TEXT NOT NULL,
    type TEXT DEFAULT 'percentage', -- percentage, fixed_amount
    value NUMERIC(15, 2) NOT NULL,
    
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    min_purchase_amount NUMERIC(15, 2) DEFAULT 0,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Invoice/Number Config (Optional, usually just a sequence or logic in app)
-- We can add a simple table for counters if needed, but UUIDs + generated strings are usually fine.
-- Let's stick to logic in app for now or use sequences.

-- RLS Policies
ALTER TABLE inventory_stock_opname ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_opname_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_purchase_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_discounts ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Allow all for authenticated for MVP)
DROP POLICY IF EXISTS "Manage Stock Opname" ON inventory_stock_opname;
CREATE POLICY "Manage Stock Opname" ON inventory_stock_opname FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Manage Stock Opname Items" ON inventory_stock_opname_items;
CREATE POLICY "Manage Stock Opname Items" ON inventory_stock_opname_items FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Manage Purchase Returns" ON inventory_purchase_returns;
CREATE POLICY "Manage Purchase Returns" ON inventory_purchase_returns FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Manage Purchase Return Items" ON inventory_purchase_return_items;
CREATE POLICY "Manage Purchase Return Items" ON inventory_purchase_return_items FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Manage Sales Returns" ON pos_returns;
CREATE POLICY "Manage Sales Returns" ON pos_returns FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Manage Sales Return Items" ON pos_return_items;
CREATE POLICY "Manage Sales Return Items" ON pos_return_items FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Manage Discounts" ON inventory_discounts;
CREATE POLICY "Manage Discounts" ON inventory_discounts FOR ALL TO authenticated USING (true);

-- Triggers for Updated At
DROP TRIGGER IF EXISTS handle_inventory_stock_opname_updated_at ON inventory_stock_opname;
CREATE TRIGGER handle_inventory_stock_opname_updated_at BEFORE UPDATE ON inventory_stock_opname FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
DROP TRIGGER IF EXISTS handle_inventory_purchase_returns_updated_at ON inventory_purchase_returns;
CREATE TRIGGER handle_inventory_purchase_returns_updated_at BEFORE UPDATE ON inventory_purchase_returns FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
DROP TRIGGER IF EXISTS handle_pos_returns_updated_at ON pos_returns;
CREATE TRIGGER handle_pos_returns_updated_at BEFORE UPDATE ON pos_returns FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
DROP TRIGGER IF EXISTS handle_inventory_discounts_updated_at ON inventory_discounts;
CREATE TRIGGER handle_inventory_discounts_updated_at BEFORE UPDATE ON inventory_discounts FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
