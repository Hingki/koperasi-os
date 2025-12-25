-- Migration: Create Virtual Accounts Module
-- Description: Creates tables for managing Virtual Accounts (VA)
-- Date: 2025-12-25

-- 1. Create Virtual Accounts Table
CREATE TABLE IF NOT EXISTS virtual_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    member_id UUID NOT NULL REFERENCES member(id),
    
    bank_code VARCHAR(10) NOT NULL, -- e.g. BCA, BRI, MANDIRI, BNI
    va_number VARCHAR(30) NOT NULL, -- e.g. 88000 + Phone Number or Random
    
    type VARCHAR(20) NOT NULL CHECK (type IN ('savings', 'loan', 'transaction')),
    
    -- Links to specific accounts/items
    savings_account_id UUID REFERENCES savings_accounts(id),
    loan_id UUID REFERENCES loans(id),
    
    name VARCHAR(100), -- Display Name e.g. "VA Simpanan Wajib"
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(koperasi_id, bank_code, va_number)
);

-- 2. RLS Policies
ALTER TABLE virtual_accounts ENABLE ROW LEVEL SECURITY;

-- Member can view their own VAs
DROP POLICY IF EXISTS "Member view own VA" ON virtual_accounts;
CREATE POLICY "Member view own VA" ON virtual_accounts 
    FOR SELECT 
    TO authenticated 
    USING (member_id IN (SELECT id FROM member WHERE user_id = auth.uid()));

-- Admins can manage VAs
DROP POLICY IF EXISTS "Admin manage VA" ON virtual_accounts;
CREATE POLICY "Admin manage VA" ON virtual_accounts 
    FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM user_role 
            WHERE user_id = auth.uid() 
            AND koperasi_id = virtual_accounts.koperasi_id
            AND role IN ('admin', 'pengurus', 'bendahara')
        )
    );

-- 3. Grant Permissions
GRANT ALL ON virtual_accounts TO authenticated;
GRANT ALL ON virtual_accounts TO service_role;
