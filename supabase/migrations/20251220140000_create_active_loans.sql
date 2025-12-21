-- Migration: Create Active Loans and Schedule Tables
-- Description: Creates tables for tracking active loans and repayment schedules
-- Date: 2025-12-20

-- 1. Create ENUMs (Idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loan_status') THEN
        CREATE TYPE loan_status AS ENUM ('active', 'paid', 'defaulted', 'written_off');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'installment_status') THEN
        CREATE TYPE installment_status AS ENUM ('pending', 'paid', 'overdue', 'partial');
    END IF;
END $$;

-- 2. Create Active Loans Table
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    application_id UUID UNIQUE NOT NULL REFERENCES loan_applications(id),
    member_id UUID NOT NULL REFERENCES member(id),
    product_id UUID NOT NULL REFERENCES loan_products(id),
    
    loan_code TEXT NOT NULL, -- Auto-generated code (e.g. L-2025-0001)
    
    -- Financial Snapshot (Locked from product at disbursement)
    principal_amount NUMERIC(15,2) NOT NULL,
    interest_rate NUMERIC(5,2) NOT NULL,
    interest_type loan_interest_type NOT NULL,
    
    -- Calculated Totals
    total_interest NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_amount_repayable NUMERIC(15,2) NOT NULL DEFAULT 0,
    
    -- Running Balance
    remaining_principal NUMERIC(15,2) NOT NULL,
    
    -- State
    status loan_status NOT NULL DEFAULT 'active',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(koperasi_id, loan_code)
);

-- 3. Create Repayment Schedule Table
CREATE TABLE IF NOT EXISTS loan_repayment_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    loan_id UUID NOT NULL REFERENCES loans(id),
    member_id UUID NOT NULL REFERENCES member(id), -- Denormalized for RLS efficiency
    
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    
    -- Amounts
    principal_portion NUMERIC(15,2) NOT NULL DEFAULT 0,
    interest_portion NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_installment NUMERIC(15,2) NOT NULL DEFAULT 0,
    
    -- Payment Tracking
    status installment_status NOT NULL DEFAULT 'pending',
    paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    paid_at TIMESTAMPTZ,
    penalty_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(loan_id, installment_number)
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_loans_member ON loans(member_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(koperasi_id, status);
CREATE INDEX IF NOT EXISTS idx_loan_schedule_loan ON loan_repayment_schedule(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_schedule_due_date ON loan_repayment_schedule(koperasi_id, due_date);
CREATE INDEX IF NOT EXISTS idx_loan_schedule_status ON loan_repayment_schedule(status);

-- 5. Enable RLS
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_repayment_schedule ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for Loans

-- Policy: Members can view their own loans
DROP POLICY IF EXISTS "Members can view own loans" ON loans;
CREATE POLICY "Members can view own loans"
    ON loans FOR SELECT
    TO authenticated
    USING (
        member_id IN (SELECT id FROM member WHERE user_id = auth.uid())
    );

-- Policy: Admins/Pengurus can manage loans
DROP POLICY IF EXISTS "Admins can manage loans" ON loans;
CREATE POLICY "Admins can manage loans"
    ON loans FOR ALL
    TO authenticated
    USING (
        public.has_permission(koperasi_id, ARRAY['admin', 'pengurus', 'ketua', 'bendahara']::user_role_type[])
    )
    WITH CHECK (
        public.has_permission(koperasi_id, ARRAY['admin', 'pengurus', 'ketua', 'bendahara']::user_role_type[])
    );

-- 7. RLS Policies for Schedules

-- Policy: Members can view their own schedules
DROP POLICY IF EXISTS "Members can view own schedules" ON loan_repayment_schedule;
CREATE POLICY "Members can view own schedules"
    ON loan_repayment_schedule FOR SELECT
    TO authenticated
    USING (
        member_id IN (SELECT id FROM member WHERE user_id = auth.uid())
    );

-- Policy: Admins/Pengurus can manage schedules
DROP POLICY IF EXISTS "Admins can manage schedules" ON loan_repayment_schedule;
CREATE POLICY "Admins can manage schedules"
    ON loan_repayment_schedule FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_role
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'pengurus', 'ketua', 'bendahara')
            AND koperasi_id = loan_repayment_schedule.koperasi_id
        )
    );

-- 8. Add Triggers for updated_at
DROP TRIGGER IF EXISTS update_loans_modtime ON loans;
CREATE TRIGGER update_loans_modtime
    BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS update_loan_schedule_modtime ON loan_repayment_schedule;
CREATE TRIGGER update_loan_schedule_modtime
    BEFORE UPDATE ON loan_repayment_schedule
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
