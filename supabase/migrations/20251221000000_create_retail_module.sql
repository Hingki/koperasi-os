
-- Inventory Categories
CREATE TABLE IF NOT EXISTS inventory_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    unit_usaha_id UUID REFERENCES unit_usaha(id),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS inventory_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Products
CREATE TABLE IF NOT EXISTS inventory_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    unit_usaha_id UUID NOT NULL REFERENCES unit_usaha(id),
    category_id UUID REFERENCES inventory_categories(id),
    supplier_id UUID REFERENCES inventory_suppliers(id), -- Default supplier
    
    barcode TEXT, -- Scan code
    sku TEXT, -- Internal code
    name TEXT NOT NULL,
    description TEXT,
    
    product_type TEXT DEFAULT 'regular', -- regular, consignment
    
    -- Pricing
    price_cost NUMERIC(15, 2) NOT NULL DEFAULT 0, -- HPP
    price_sell_public NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Harga Umum
    price_sell_member NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Harga Anggota
    
    -- Stock
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_alert INTEGER DEFAULT 5,
    unit TEXT DEFAULT 'pcs', -- pcs, kg, liter, etc.
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Purchasing (Pembelian/Stok Masuk)
CREATE TABLE IF NOT EXISTS inventory_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    unit_usaha_id UUID NOT NULL REFERENCES unit_usaha(id),
    supplier_id UUID REFERENCES inventory_suppliers(id),
    
    invoice_number TEXT, -- No Faktur Pembelian
    purchase_date TIMESTAMPTZ DEFAULT NOW(),
    
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'completed', -- pending, completed, cancelled
    payment_status TEXT DEFAULT 'paid', -- paid, debt (hutang)
    
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES inventory_purchases(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES inventory_products(id),
    
    quantity INTEGER NOT NULL,
    cost_per_item NUMERIC(15, 2) NOT NULL,
    subtotal NUMERIC(15, 2) NOT NULL
);

-- POS Transactions (Sales)
CREATE TABLE IF NOT EXISTS pos_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    unit_usaha_id UUID NOT NULL REFERENCES unit_usaha(id),
    
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    invoice_number TEXT NOT NULL, -- Auto-gen
    
    member_id UUID REFERENCES member(id), -- Optional (can be non-member)
    customer_name TEXT, -- If non-member
    
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(15, 2) DEFAULT 0,
    tax_amount NUMERIC(15, 2) DEFAULT 0,
    final_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    
    payment_method TEXT NOT NULL, -- cash, transfer, qris, savings_deduction
    payment_status TEXT DEFAULT 'paid', -- paid, pending (debt)
    
    notes TEXT,
    created_by UUID, -- Cashier
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- POS Items
CREATE TABLE IF NOT EXISTS pos_transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES pos_transactions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES inventory_products(id),
    
    quantity INTEGER NOT NULL DEFAULT 1,
    price_at_sale NUMERIC(15, 2) NOT NULL, -- Price snapshot
    cost_at_sale NUMERIC(15, 2) NOT NULL, -- Cost snapshot for profit calc
    subtotal NUMERIC(15, 2) NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers for Updated At
DROP TRIGGER IF EXISTS handle_inventory_categories_updated_at ON inventory_categories;
CREATE TRIGGER handle_inventory_categories_updated_at BEFORE UPDATE ON inventory_categories FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_inventory_products_updated_at ON inventory_products;
CREATE TRIGGER handle_inventory_products_updated_at BEFORE UPDATE ON inventory_products FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- RLS Policies (Basic)
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_transaction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Inventory" ON inventory_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage Inventory" ON inventory_products FOR ALL TO authenticated USING (true); -- Simplified for MVP

CREATE POLICY "View Categories" ON inventory_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage Categories" ON inventory_categories FOR ALL TO authenticated USING (true); -- Simplified for MVP

CREATE POLICY "View Sales" ON pos_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create Sales" ON pos_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Manage Sales" ON pos_transactions FOR ALL TO authenticated USING (true);

CREATE POLICY "View Sale Items" ON pos_transaction_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create Sale Items" ON pos_transaction_items FOR INSERT TO authenticated WITH CHECK (true);
