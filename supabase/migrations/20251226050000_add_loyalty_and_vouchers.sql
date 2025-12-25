-- Migration: Add Loyalty Points, Vouchers, and Consignment Features
-- Description: Adds tables for loyalty program, vouchers, and consignment tracking
-- Date: 2025-12-26

-- 1. Loyalty Points System
CREATE TABLE IF NOT EXISTS loyalty_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    member_id UUID NOT NULL REFERENCES member(id),
    balance INTEGER NOT NULL DEFAULT 0,
    total_earned INTEGER NOT NULL DEFAULT 0,
    total_redeemed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(koperasi_id, member_id)
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES loyalty_accounts(id),
    transaction_type TEXT NOT NULL, -- 'earn' (purchase), 'redeem' (payment), 'adjustment'
    points INTEGER NOT NULL, -- Positive for earn, Negative for redeem
    reference_id UUID, -- Link to pos_transactions.id
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Vouchers
CREATE TABLE IF NOT EXISTS vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    code TEXT NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL, -- 'percentage', 'fixed'
    discount_value NUMERIC(15, 2) NOT NULL,
    min_purchase NUMERIC(15, 2) DEFAULT 0,
    max_discount NUMERIC(15, 2), -- Cap for percentage
    
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    usage_limit INTEGER, -- Max times can be used globally
    usage_count INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(koperasi_id, code)
);

CREATE TABLE IF NOT EXISTS voucher_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id UUID NOT NULL REFERENCES vouchers(id),
    member_id UUID REFERENCES member(id), -- Optional
    transaction_id UUID, -- Link to pos_transactions.id
    discount_amount NUMERIC(15, 2) NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Consignment Features (Enhance Inventory Products)
ALTER TABLE inventory_products 
ADD COLUMN IF NOT EXISTS is_consignment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS consignment_supplier_id UUID REFERENCES inventory_suppliers(id),
ADD COLUMN IF NOT EXISTS consignment_fee_percent NUMERIC(5, 2) DEFAULT 0; -- Koperasi's share/fee

-- 4. Donation Feature (Enhance POS Transaction)
ALTER TABLE pos_transactions
ADD COLUMN IF NOT EXISTS donation_amount NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS voucher_code TEXT,
ADD COLUMN IF NOT EXISTS points_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS points_value NUMERIC(15, 2) DEFAULT 0;

-- 5. RLS Policies
ALTER TABLE loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- Admins manage all
CREATE POLICY "Admins manage loyalty" ON loyalty_accounts FOR ALL TO authenticated USING (
    koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid())
);
CREATE POLICY "Admins manage vouchers" ON vouchers FOR ALL TO authenticated USING (
    koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid())
);

-- Members view their own
CREATE POLICY "Members view own loyalty" ON loyalty_accounts FOR SELECT TO authenticated USING (
    member_id IN (SELECT id FROM member WHERE user_id = auth.uid())
);
