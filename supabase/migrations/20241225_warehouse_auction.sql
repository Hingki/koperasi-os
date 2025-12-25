-- Add Auction Tables
CREATE TABLE IF NOT EXISTS auctions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    unit_usaha_id UUID REFERENCES unit_usaha(id),
    title TEXT NOT NULL,
    description TEXT,
    product_name TEXT NOT NULL,
    image_url TEXT,
    start_price DECIMAL(15, 2) NOT NULL,
    min_increment DECIMAL(15, 2) DEFAULT 1000,
    buy_now_price DECIMAL(15, 2),
    current_price DECIMAL(15, 2) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT CHECK (status IN ('draft', 'active', 'completed', 'cancelled')) DEFAULT 'draft',
    winner_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS auction_bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_auctions_koperasi_status ON auctions(koperasi_id, status);
CREATE INDEX IF NOT EXISTS idx_auction_bids_auction ON auction_bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_user ON auction_bids(user_id);

-- Add RLS Policies for Auctions
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;

-- Auctions Policies
CREATE POLICY "View auctions" ON auctions FOR SELECT USING (true); -- Public can view? Or only members? Let's say all authenticated for now.
CREATE POLICY "Manage auctions" ON auctions FOR ALL USING (
    auth.uid() IN (
        SELECT user_id FROM cooperatives_members WHERE koperasi_id = auctions.koperasi_id AND role IN ('admin', 'pengurus', 'manager')
    )
);

-- Bids Policies
CREATE POLICY "View bids" ON auction_bids FOR SELECT USING (true);
CREATE POLICY "Place bids" ON auction_bids FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add Warehouse/Cold Storage fields to Inventory
ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS storage_location TEXT; -- e.g. "Cold Storage A - Rak 1"
ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS batch_number TEXT;

-- Add Delivery Order tracking to POS Transactions (optional, but good for "Delivery Order" feature)
ALTER TABLE pos_transactions ADD COLUMN IF NOT EXISTS delivery_status TEXT CHECK (delivery_status IN ('pending', 'processing', 'shipped', 'delivered', 'picked_up'));
ALTER TABLE pos_transactions ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE pos_transactions ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- Create a view for Consolidated Financial Report (Revenue per Unit Usaha)
CREATE OR REPLACE VIEW view_consolidated_revenue AS
SELECT 
    koperasi_id,
    unit_usaha_id,
    DATE_TRUNC('month', transaction_date) as month,
    SUM(final_amount) as total_revenue,
    COUNT(*) as transaction_count
FROM pos_transactions
WHERE payment_status = 'paid'
GROUP BY koperasi_id, unit_usaha_id, DATE_TRUNC('month', transaction_date);
