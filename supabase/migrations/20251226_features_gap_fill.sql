-- Migration: Gap Fill for Modal Penyertaan and SHU
-- Description: Adds tables for Equity Participation (Modal Penyertaan) and SHU Calculation
-- Date: 2025-12-26

-- ==========================================
-- 1. MODAL PENYERTAAN (Capital Participation)
-- ==========================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'capital_status') THEN
        CREATE TYPE capital_status AS ENUM ('active', 'withdrawn', 'locked');
    END IF;
END $$;

-- Produk Modal Penyertaan (Investment Products per Unit Usaha)
CREATE TABLE IF NOT EXISTS capital_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    unit_usaha_id UUID REFERENCES unit_usaha(id), -- Specific to a unit or general
    
    name TEXT NOT NULL, -- e.g. "Investasi Unit Retail 2025"
    description TEXT,
    
    target_amount NUMERIC(15,2) NOT NULL DEFAULT 0, -- Target fundraise
    min_investment NUMERIC(15,2) NOT NULL DEFAULT 100000,
    
    profit_share_percent NUMERIC(5,2) NOT NULL, -- e.g. 40% of unit profit shared to investors
    
    start_date DATE NOT NULL,
    end_date DATE, -- Maturity date
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portofolio Modal Penyertaan (Investor Holdings)
CREATE TABLE IF NOT EXISTS capital_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    product_id UUID NOT NULL REFERENCES capital_products(id),
    
    investor_type TEXT NOT NULL CHECK (investor_type IN ('member', 'external')),
    member_id UUID REFERENCES member(id), -- If member
    external_investor_name TEXT, -- If external body
    
    amount_invested NUMERIC(15,2) NOT NULL DEFAULT 0,
    status capital_status DEFAULT 'active',
    
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaksi Modal (In/Out/Profit Share)
CREATE TABLE IF NOT EXISTS capital_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    account_id UUID NOT NULL REFERENCES capital_accounts(id),
    
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'profit_share')),
    amount NUMERIC(15,2) NOT NULL,
    
    description TEXT,
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);


-- ==========================================
-- 2. SHU AUTO CALCULATION (Sisa Hasil Usaha)
-- ==========================================

-- SHU Configuration per Period
CREATE TABLE IF NOT EXISTS shu_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    year INTEGER NOT NULL,
    
    total_revenue NUMERIC(15,2) DEFAULT 0, -- Pendapatan
    total_expense NUMERIC(15,2) DEFAULT 0, -- Biaya
    net_profit NUMERIC(15,2) DEFAULT 0, -- SHU Sebelum Pajak/Zakat
    
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'calculating', 'distributed', 'closed')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SHU Allocation Rules (Pembagian SHU)
CREATE TABLE IF NOT EXISTS shu_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES shu_periods(id) ON DELETE CASCADE,
    
    allocation_name TEXT NOT NULL, -- e.g. "Cadangan Modal", "Jasa Anggota", "Dana Pengurus"
    percentage NUMERIC(5,2) NOT NULL, -- e.g. 25.00 for 25%
    amount NUMERIC(15,2) DEFAULT 0, -- Calculated amount
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SHU Member Scores (Activity Tracking)
CREATE TABLE IF NOT EXISTS shu_member_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES shu_periods(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES member(id),
    
    -- Activity Metrics
    savings_balance_average NUMERIC(15,2) DEFAULT 0, -- For Jasa Modal
    loan_interest_paid NUMERIC(15,2) DEFAULT 0, -- For Jasa Usaha (Pinjaman)
    shopping_margin_contribution NUMERIC(15,2) DEFAULT 0, -- For Jasa Usaha (Retail)
    
    -- Calculated SHU Parts
    shu_jasa_modal NUMERIC(15,2) DEFAULT 0,
    shu_jasa_usaha NUMERIC(15,2) DEFAULT 0,
    total_shu_received NUMERIC(15,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE capital_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shu_periods ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users for now (simplified)
CREATE POLICY "Auth read capital products" ON capital_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read capital accounts" ON capital_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read shu" ON shu_periods FOR SELECT TO authenticated USING (true);
