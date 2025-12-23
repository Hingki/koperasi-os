-- UAT SETUP SCRIPT
-- Run this in Supabase SQL Editor to prepare the database for testing

-- 1. Ensure Payment Sources Table Exists
CREATE TABLE IF NOT EXISTS payment_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    unit_usaha_id UUID, -- Optional
    name TEXT NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('cash', 'qris', 'va', 'savings_balance', 'transfer')),
    provider TEXT NOT NULL CHECK (provider IN ('mock', 'xendit', 'midtrans', 'manual', 'internal')),
    account_code TEXT, -- COA Mapping
    
    -- Bank Details (Manual Transfer)
    bank_name TEXT,
    account_number TEXT,
    account_holder TEXT,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(koperasi_id, method, provider) -- Basic constraint
);

-- 2. Add Columns if they were missing (Idempotent)
DO $$ 
BEGIN
    ALTER TABLE payment_sources ADD COLUMN IF NOT EXISTS bank_name TEXT;
    ALTER TABLE payment_sources ADD COLUMN IF NOT EXISTS account_number TEXT;
    ALTER TABLE payment_sources ADD COLUMN IF NOT EXISTS account_holder TEXT;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- 3. Seed Manual Payment Source
INSERT INTO payment_sources (koperasi_id, name, method, provider, bank_name, account_number, account_holder, is_active)
SELECT 
    id,
    'Bank BCA (Manual)',
    'transfer',
    'manual',
    'BCA',
    '1234567890',
    'Koperasi Sejahtera',
    true
FROM koperasi
WHERE NOT EXISTS (
    SELECT 1 FROM payment_sources WHERE provider = 'manual' AND method = 'transfer'
)
LIMIT 1;

-- 4. Update Products with COA Codes
-- Savings: Liability (2-1001)
UPDATE savings_products SET coa_id = '2-1001' WHERE coa_id IS NULL;
-- Loans: Receivable (1-1003) & Interest Income (4-1001)
UPDATE loan_products SET coa_receivable = '1-1003', coa_interest_income = '4-1001' WHERE coa_receivable IS NULL;

-- 5. Enable RLS on Payment Sources
ALTER TABLE payment_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read payment sources" ON payment_sources;
CREATE POLICY "Public read payment sources" ON payment_sources FOR SELECT TO authenticated USING (true);

