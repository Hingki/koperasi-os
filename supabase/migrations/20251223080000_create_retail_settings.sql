-- Migration: Create Retail Settings Table
-- Language: plpgsql (PostgreSQL)
-- Description: Stores configuration for retail module (prefixes, receipt settings, etc.)
-- Date: 2025-12-23

CREATE TABLE IF NOT EXISTS retail_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    
    -- Purchase
    purchase_invoice_prefix TEXT DEFAULT 'INV-PB-',
    purchase_return_prefix TEXT DEFAULT 'RET-PB-',
    
    -- Sales
    sales_invoice_prefix TEXT DEFAULT 'INV-PJ-',
    sales_return_prefix TEXT DEFAULT 'RET-PJ-',
    
    -- Print/Struk
    receipt_header TEXT,
    receipt_footer TEXT,
    receipt_width INTEGER DEFAULT 80, -- mm
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(koperasi_id)
);

-- RLS
ALTER TABLE retail_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their koperasi retail settings" ON retail_settings;
CREATE POLICY "Users can view their koperasi retail settings"
    ON retail_settings FOR SELECT
    TO authenticated
    USING (koperasi_id IN (
        SELECT koperasi_id FROM user_role WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can update their koperasi retail settings" ON retail_settings;
CREATE POLICY "Users can update their koperasi retail settings"
    ON retail_settings FOR UPDATE
    TO authenticated
    USING (koperasi_id IN (
        SELECT koperasi_id FROM user_role WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can insert their koperasi retail settings" ON retail_settings;
CREATE POLICY "Users can insert their koperasi retail settings"
    ON retail_settings FOR INSERT
    TO authenticated
    WITH CHECK (koperasi_id IN (
        SELECT koperasi_id FROM user_role WHERE user_id = auth.uid()
    ));

-- Grant permissions
GRANT ALL ON retail_settings TO service_role;
GRANT SELECT, INSERT, UPDATE ON retail_settings TO authenticated;
