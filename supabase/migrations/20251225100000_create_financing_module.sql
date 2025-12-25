-- Migration: Create Financing Module (Fitur Pembiayaan)
-- Description: Adds structures for Goods Financing (Pembiayaan Barang/Kendaraan)
-- Date: 2025-12-25

-- 1. Create ENUMs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'financing_category') THEN
        CREATE TYPE financing_category AS ENUM ('vehicle', 'electronics', 'furniture', 'property', 'gold', 'other');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'object_condition') THEN
        CREATE TYPE object_condition AS ENUM ('new', 'used', 'refurbished');
    END IF;
END $$;

-- 2. Enhance Loan Products for Financing
ALTER TABLE loan_products 
ADD COLUMN IF NOT EXISTS is_financing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS financing_category financing_category;

-- 3. Create Financing Objects Table (Detail Barang Jaminan/Objek Pembiayaan)
CREATE TABLE IF NOT EXISTS financing_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    
    -- Links
    application_id UUID REFERENCES loan_applications(id) ON DELETE CASCADE,
    loan_id UUID REFERENCES loans(id), -- Populated after disbursement
    supplier_id UUID REFERENCES inventory_suppliers(id), -- Mitra/Vendor
    
    -- Object Details
    category financing_category NOT NULL,
    name TEXT NOT NULL, -- e.g., "Honda Beat 2024"
    condition object_condition DEFAULT 'new',
    
    -- Valuation
    price_otr NUMERIC(15,2) NOT NULL DEFAULT 0, -- Harga Cash/OTR
    down_payment NUMERIC(15,2) NOT NULL DEFAULT 0, -- Uang Muka
    financing_amount NUMERIC(15,2) NOT NULL DEFAULT 0, -- Pokok Pembiayaan (Price - DP)
    
    -- Specific Attributes (Stored as JSON for flexibility)
    -- Examples: 
    -- Vehicle: { "brand": "Honda", "model": "Beat", "year": 2024, "color": "Black", "frame_number": "...", "engine_number": "...", "plate_number": "..." }
    -- Electronics: { "brand": "Samsung", "model": "S24 Ultra", "serial_number": "..." }
    attributes JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(application_id)
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_financing_objects_loan ON financing_objects(loan_id);
CREATE INDEX IF NOT EXISTS idx_financing_objects_app ON financing_objects(application_id);
CREATE INDEX IF NOT EXISTS idx_financing_objects_supplier ON financing_objects(supplier_id);

-- 5. Enable RLS
ALTER TABLE financing_objects ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- View: Members can view their own financing objects
DROP POLICY IF EXISTS "Members can view own financing objects" ON financing_objects;
CREATE POLICY "Members can view own financing objects"
    ON financing_objects FOR SELECT
    TO authenticated
    USING (
        application_id IN (SELECT id FROM loan_applications WHERE member_id IN (SELECT id FROM member WHERE user_id = auth.uid()))
        OR
        loan_id IN (SELECT id FROM loans WHERE member_id IN (SELECT id FROM member WHERE user_id = auth.uid()))
    );

-- Manage: Admins can manage all
DROP POLICY IF EXISTS "Admins can manage financing objects" ON financing_objects;
CREATE POLICY "Admins can manage financing objects"
    ON financing_objects FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_role
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'pengurus', 'ketua', 'bendahara')
            AND koperasi_id = financing_objects.koperasi_id
        )
    );

-- Create: Members can create (via application process)
DROP POLICY IF EXISTS "Members can create financing objects" ON financing_objects;
CREATE POLICY "Members can create financing objects"
    ON financing_objects FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Basic check: linked application must belong to member (handled via app creation logic usually, but strictly:)
        EXISTS (
            SELECT 1 FROM loan_applications la
            JOIN member m ON m.id = la.member_id
            WHERE la.id = financing_objects.application_id
            AND m.user_id = auth.uid()
        )
        OR
        -- Or allow admins
        EXISTS (
            SELECT 1 FROM user_role
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'pengurus', 'ketua', 'bendahara')
            AND koperasi_id = financing_objects.koperasi_id
        )
    );

-- 7. Trigger for Updated At
DROP TRIGGER IF EXISTS update_financing_objects_modtime ON financing_objects;
CREATE TRIGGER update_financing_objects_modtime
    BEFORE UPDATE ON financing_objects
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
