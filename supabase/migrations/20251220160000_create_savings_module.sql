-- Migration: Create Savings Module Tables
-- Description: Creates tables for Savings Products, Accounts, and Transactions
-- Date: 2025-12-20

-- 1. Create ENUMs (Idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'savings_type') THEN
        CREATE TYPE savings_type AS ENUM ('pokok', 'wajib', 'sukarela', 'berjangka');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'savings_status') THEN
        CREATE TYPE savings_status AS ENUM ('active', 'dormant', 'closed');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'savings_transaction_type') THEN
        CREATE TYPE savings_transaction_type AS ENUM ('deposit', 'withdrawal', 'interest', 'admin_fee');
    END IF;
END $$;

-- 2. Create Savings Products Table
CREATE TABLE IF NOT EXISTS savings_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type savings_type NOT NULL,
    description TEXT,
    
    -- Financial Rules
    interest_rate NUMERIC(5,2) NOT NULL DEFAULT 0, -- Annual Percentage
    min_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
    min_deposit NUMERIC(15,2) NOT NULL DEFAULT 0,
    is_withdrawal_allowed BOOLEAN DEFAULT true,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(koperasi_id, code)
);

-- 3. Create Savings Accounts Table
CREATE TABLE IF NOT EXISTS savings_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    member_id UUID NOT NULL REFERENCES member(id),
    product_id UUID NOT NULL REFERENCES savings_products(id),
    
    account_number TEXT NOT NULL,
    balance NUMERIC(15,2) NOT NULL DEFAULT 0,
    status savings_status NOT NULL DEFAULT 'active',
    
    last_transaction_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(koperasi_id, account_number),
    UNIQUE(member_id, product_id) -- One account per product per member (usually)
);

-- 4. Create Savings Transactions Table (Read Model)
CREATE TABLE IF NOT EXISTS savings_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    account_id UUID NOT NULL REFERENCES savings_accounts(id),
    member_id UUID NOT NULL REFERENCES member(id),
    
    type savings_transaction_type NOT NULL,
    amount NUMERIC(15,2) NOT NULL, -- Positive for deposit/interest, Negative for withdrawal/fee
    balance_after NUMERIC(15,2) NOT NULL,
    
    description TEXT,
    reference_number TEXT, -- External ref or generated
    ledger_entry_id UUID, -- Link to Accounting (Removed FK due to partitioning)
    
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 5. Create Indexes
CREATE INDEX IF NOT EXISTS idx_savings_products_koperasi ON savings_products(koperasi_id);
CREATE INDEX IF NOT EXISTS idx_savings_accounts_member ON savings_accounts(member_id);
CREATE INDEX IF NOT EXISTS idx_savings_accounts_number ON savings_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_savings_transactions_account ON savings_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_savings_transactions_date ON savings_transactions(transaction_date);

-- 6. Enable RLS
ALTER TABLE savings_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_transactions ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies

-- Savings Products: Viewable by Authenticated, Managed by Admin
DROP POLICY IF EXISTS "Authenticated users can view active savings products" ON savings_products;
CREATE POLICY "Authenticated users can view active savings products"
    ON savings_products FOR SELECT
    TO authenticated
    USING (is_active = true AND koperasi_id IS NOT NULL);

-- Policy: Admins can manage savings products
DROP POLICY IF EXISTS "Admins can manage savings products" ON savings_products;
CREATE POLICY "Admins can manage savings products"
    ON savings_products FOR ALL
    TO authenticated
    USING (
        public.has_permission(koperasi_id, ARRAY['admin', 'pengurus', 'ketua', 'bendahara']::user_role_type[])
    )
    WITH CHECK (
        public.has_permission(koperasi_id, ARRAY['admin', 'pengurus', 'ketua', 'bendahara']::user_role_type[])
    );

-- Savings Accounts: View Own, Manage Admin
DROP POLICY IF EXISTS "Members can view own savings accounts" ON savings_accounts;
CREATE POLICY "Members can view own savings accounts"
    ON savings_accounts FOR SELECT
    TO authenticated
    USING (
        member_id IN (SELECT id FROM member WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can manage savings accounts" ON savings_accounts;
CREATE POLICY "Admins can manage savings accounts"
    ON savings_accounts FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_role
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'pengurus', 'ketua', 'bendahara')
            AND koperasi_id = savings_accounts.koperasi_id
        )
    );

-- Savings Transactions: View Own, Manage Admin
DROP POLICY IF EXISTS "Members can view own savings transactions" ON savings_transactions;
CREATE POLICY "Members can view own savings transactions"
    ON savings_transactions FOR SELECT
    TO authenticated
    USING (
        member_id IN (SELECT id FROM member WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can manage savings transactions" ON savings_transactions;
CREATE POLICY "Admins can manage savings transactions"
    ON savings_transactions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_role
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'pengurus', 'ketua', 'bendahara')
            AND koperasi_id = savings_transactions.koperasi_id
        )
    );

-- 8. Add Triggers for updated_at
DROP TRIGGER IF EXISTS update_savings_products_modtime ON savings_products;
CREATE TRIGGER update_savings_products_modtime
    BEFORE UPDATE ON savings_products
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS update_savings_accounts_modtime ON savings_accounts;
CREATE TRIGGER update_savings_accounts_modtime
    BEFORE UPDATE ON savings_accounts
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
