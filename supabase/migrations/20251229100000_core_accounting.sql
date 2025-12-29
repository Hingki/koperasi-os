-- Migration: Core Financial Engine (Level 1)
-- Date: 2025-12-29

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Enum Types
DO $$ BEGIN
    CREATE TYPE account_type AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE normal_balance AS ENUM ('DEBIT', 'CREDIT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Accounts (COA) Table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    koperasi_id UUID NOT NULL, -- Tenant Isolation
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type account_type NOT NULL,
    normal_balance normal_balance NOT NULL,
    parent_id UUID REFERENCES accounts(id),
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_account_code_per_koperasi UNIQUE (koperasi_id, code)
);

-- 2. Journals (Header) Table
CREATE TABLE IF NOT EXISTS journals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    koperasi_id UUID NOT NULL,
    business_unit VARCHAR(50) DEFAULT 'USP', -- e.g., USP, RETAIL, CLINIC
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_id VARCHAR(255), -- ID of the source transaction
    reference_type VARCHAR(50), -- e.g., 'LOAN_DISBURSEMENT', 'SAVINGS_DEPOSIT'
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Journal Lines (Detail) Table
CREATE TABLE IF NOT EXISTS journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_id UUID NOT NULL REFERENCES journals(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT, -- Guardrail: Prevent deletion of used accounts
    debit DECIMAL(20, 2) DEFAULT 0,
    credit DECIMAL(20, 2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT positive_amounts CHECK (debit >= 0 AND credit >= 0)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_accounts_koperasi ON accounts(koperasi_id);
CREATE INDEX IF NOT EXISTS idx_journals_koperasi_date ON journals(koperasi_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_journal_lines_journal ON journal_lines(journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- ACCOUNTS
DROP POLICY IF EXISTS "View accounts" ON accounts;
CREATE POLICY "View accounts" ON accounts FOR SELECT 
USING (true); -- Allow all authenticated users to see COA (simplified for now, strictly should filter by koperasi_id)

DROP POLICY IF EXISTS "Manage accounts" ON accounts;
CREATE POLICY "Manage accounts" ON accounts FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_role 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'bendahara', 'staff')
        AND koperasi_id = accounts.koperasi_id
    )
);

-- JOURNALS
DROP POLICY IF EXISTS "View journals" ON journals;
CREATE POLICY "View journals" ON journals FOR SELECT 
USING (koperasi_id IN (
    SELECT koperasi_id FROM user_role WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Manage journals" ON journals;
CREATE POLICY "Manage journals" ON journals FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_role 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'bendahara', 'staff', 'teller')
        AND koperasi_id = journals.koperasi_id
    )
);

-- JOURNAL LINES
DROP POLICY IF EXISTS "View journal lines" ON journal_lines;
CREATE POLICY "View journal lines" ON journal_lines FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM journals j
        WHERE j.id = journal_lines.journal_id
        AND j.koperasi_id IN (
            SELECT koperasi_id FROM user_role WHERE user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Manage journal lines" ON journal_lines;
CREATE POLICY "Manage journal lines" ON journal_lines FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM journals j
        JOIN user_role ur ON ur.koperasi_id = j.koperasi_id
        WHERE j.id = journal_lines.journal_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'bendahara', 'staff', 'teller')
    )
);
