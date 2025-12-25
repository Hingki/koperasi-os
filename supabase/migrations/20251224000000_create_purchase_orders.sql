-- Migration: Create Purchase Order (PO) Module
-- Description: Adds Purchase Order tables and logic
-- Date: 2025-12-24

-- 1. Purchase Orders Table
CREATE TABLE IF NOT EXISTS inventory_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    unit_usaha_id UUID REFERENCES unit_usaha(id),
    
    po_number TEXT NOT NULL, -- Auto-generated (e.g., PO-20251224-001)
    supplier_id UUID REFERENCES inventory_suppliers(id),
    
    order_date TIMESTAMPTZ DEFAULT NOW(),
    expected_delivery_date TIMESTAMPTZ,
    
    status TEXT DEFAULT 'draft', -- draft, approved, ordered, received, cancelled
    
    total_amount NUMERIC(15, 2) DEFAULT 0,
    notes TEXT,
    
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Purchase Order Items Table
CREATE TABLE IF NOT EXISTS inventory_purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES inventory_purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES inventory_products(id),
    
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0, -- Track partial fulfillment if needed
    
    cost_per_item NUMERIC(15, 2) NOT NULL, -- Estimated cost
    subtotal NUMERIC(15, 2) NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS Policies
ALTER TABLE inventory_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Policy for Purchase Orders: Users can only manage POs for their koperasi
DROP POLICY IF EXISTS "Manage Purchase Orders" ON inventory_purchase_orders;
CREATE POLICY "Manage Purchase Orders" ON inventory_purchase_orders 
FOR ALL TO authenticated 
USING (
    koperasi_id IN (
        SELECT koperasi_id FROM user_role WHERE user_id = auth.uid()
    )
);

-- Policy for PO Items: Access via PO ownership
DROP POLICY IF EXISTS "Manage Purchase Order Items" ON inventory_purchase_order_items;
CREATE POLICY "Manage Purchase Order Items" ON inventory_purchase_order_items 
FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM inventory_purchase_orders po
        WHERE po.id = inventory_purchase_order_items.po_id
        AND po.koperasi_id IN (
            SELECT koperasi_id FROM user_role WHERE user_id = auth.uid()
        )
    )
);

-- 4. Triggers
DROP TRIGGER IF EXISTS handle_inventory_purchase_orders_updated_at ON inventory_purchase_orders;
CREATE TRIGGER handle_inventory_purchase_orders_updated_at 
    BEFORE UPDATE ON inventory_purchase_orders 
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- 5. Add PO reference to Purchases (Stock In)
-- When a PO is received, it becomes a Purchase. We should link them.
ALTER TABLE inventory_purchases ADD COLUMN IF NOT EXISTS po_id UUID;

-- Add constraint safely
ALTER TABLE inventory_purchases DROP CONSTRAINT IF EXISTS inventory_purchases_po_id_fkey;
ALTER TABLE inventory_purchases ADD CONSTRAINT inventory_purchases_po_id_fkey FOREIGN KEY (po_id) REFERENCES inventory_purchase_orders(id);
