-- Migration: Create Loan Module Tables
-- Description: Creates tables for Loan Products and Loan Applications
-- Date: 2025-12-20

-- 1. Create ENUMs (Idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loan_interest_type') THEN
        CREATE TYPE loan_interest_type AS ENUM ('flat', 'effective', 'declining');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loan_workflow_type') THEN
        CREATE TYPE loan_workflow_type AS ENUM ('simple', 'multi_level');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loan_application_status') THEN
        CREATE TYPE loan_application_status AS ENUM (
            'draft', 'submitted', 'survey', 'committee_review', 
            'approved', 'rejected', 'disbursed', 'completed', 'defaulted'
        );
    END IF;
END $$;

-- 2. Create Loan Products Table
CREATE TABLE IF NOT EXISTS loan_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Interest & Terms
    interest_type loan_interest_type NOT NULL DEFAULT 'flat',
    interest_rate NUMERIC(5,2) NOT NULL, -- Annual percentage
    max_tenor_months INTEGER NOT NULL,
    min_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    max_amount NUMERIC(15,2) NOT NULL,
    
    -- Workflow Rules
    collateral_required BOOLEAN DEFAULT false,
    approval_workflow loan_workflow_type DEFAULT 'simple',
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(koperasi_id, code)
);

-- 3. Create Loan Applications Table
CREATE TABLE IF NOT EXISTS loan_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    member_id UUID NOT NULL REFERENCES member(id),
    product_id UUID NOT NULL REFERENCES loan_products(id),
    
    -- Application Details
    amount NUMERIC(15,2) NOT NULL,
    tenor_months INTEGER NOT NULL,
    purpose TEXT,
    
    -- Status & Workflow
    status loan_application_status NOT NULL DEFAULT 'draft',
    workflow_metadata JSONB DEFAULT '{}'::jsonb, 
    survey_data JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    disbursed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_loan_products_koperasi ON loan_products(koperasi_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_member ON loan_applications(member_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(koperasi_id, status);

-- 5. Enable RLS
ALTER TABLE loan_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for Loan Products

-- Policy: Everyone (Authenticated) can view active products
-- Need to drop first to ensure idempotency if running multiple times
DROP POLICY IF EXISTS "Authenticated users can view active products" ON loan_products;
CREATE POLICY "Authenticated users can view active products"
    ON loan_products FOR SELECT
    TO authenticated
    USING (is_active = true AND koperasi_id IS NOT NULL); -- Simplified visibility

-- Policy: Admins/Pengurus can manage products
DROP POLICY IF EXISTS "Admins can manage loan products" ON loan_products;
CREATE POLICY "Admins can manage loan products"
    ON loan_products FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_role
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'pengurus', 'ketua', 'bendahara')
            AND koperasi_id = loan_products.koperasi_id
        )
    );

-- 7. RLS Policies for Loan Applications

-- Policy: Members can view their own applications
DROP POLICY IF EXISTS "Members can view own applications" ON loan_applications;
CREATE POLICY "Members can view own applications"
    ON loan_applications FOR SELECT
    TO authenticated
    USING (
        auth.uid() = created_by OR 
        member_id IN (SELECT id FROM member WHERE user_id = auth.uid())
    );

-- Policy: Members can create applications (draft)
DROP POLICY IF EXISTS "Members can create applications" ON loan_applications;
CREATE POLICY "Members can create applications"
    ON loan_applications FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = created_by
    );

-- Policy: Members can update their own DRAFT applications
DROP POLICY IF EXISTS "Members can update own draft applications" ON loan_applications;
CREATE POLICY "Members can update own draft applications"
    ON loan_applications FOR UPDATE
    TO authenticated
    USING (
        (auth.uid() = created_by) AND (status = 'draft')
    )
    WITH CHECK (
        (auth.uid() = created_by) AND (status = 'draft')
    );

-- Policy: Admins/Pengurus can view ALL applications
DROP POLICY IF EXISTS "Admins can view all applications" ON loan_applications;
CREATE POLICY "Admins can view all applications"
    ON loan_applications FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_role
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'pengurus', 'ketua', 'bendahara')
            AND koperasi_id = loan_applications.koperasi_id
        )
    );

-- Policy: Admins/Pengurus can update applications (Move status, etc)
DROP POLICY IF EXISTS "Admins can update applications" ON loan_applications;
CREATE POLICY "Admins can update applications"
    ON loan_applications FOR UPDATE
    TO authenticated
    USING (
        public.has_permission(koperasi_id, ARRAY['admin', 'pengurus', 'ketua', 'bendahara']::user_role_type[])
    )
    WITH CHECK (
        public.has_permission(koperasi_id, ARRAY['admin', 'pengurus', 'ketua', 'bendahara']::user_role_type[])
    );

-- 8. Add Triggers for updated_at
DROP TRIGGER IF EXISTS update_loan_products_modtime ON loan_products;
CREATE TRIGGER update_loan_products_modtime
    BEFORE UPDATE ON loan_products
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS update_loan_applications_modtime ON loan_applications;
CREATE TRIGGER update_loan_applications_modtime
    BEFORE UPDATE ON loan_applications
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
