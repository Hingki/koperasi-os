-- Migration: Enhance Member Identity & Number Generation
-- Date: 2026-01-02
-- Description: Adds fields for Member Number Generation configuration and tracking.

-- 1. Add 'code' to 'koperasi' for prefixing (e.g., 'KKMP')
ALTER TABLE public.koperasi 
ADD COLUMN IF NOT EXISTS code VARCHAR(10) UNIQUE;

-- 2. Create 'document_sequences' table for tracking running numbers
-- This allows us to have different sequences per Koperasi, per Type, per Year
CREATE TABLE IF NOT EXISTS public.document_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES public.koperasi(id),
    type VARCHAR(50) NOT NULL, -- e.g., 'member_number', 'invoice', 'receipt'
    year INTEGER, -- Nullable if sequence is continuous across years
    current_value INTEGER NOT NULL DEFAULT 0,
    prefix VARCHAR(20), -- Optional cached prefix
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(koperasi_id, type, year)
);

-- Enable RLS for sequences (although mostly accessed via service_role or admin actions)
ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;

-- 3. Drop the old trigger if it exists
DROP TRIGGER IF EXISTS trg_generate_nomor_anggota ON public.member;
DROP FUNCTION IF EXISTS generate_nomor_anggota();

-- 4. Ensure Member columns exist (idempotent)
ALTER TABLE public.member 
ADD COLUMN IF NOT EXISTS wa_number VARCHAR(20), -- Explicit WA number if different from phone
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- 5. Create index for Member lookup optimization
CREATE INDEX IF NOT EXISTS idx_member_nomor_anggota ON public.member(nomor_anggota);
CREATE INDEX IF NOT EXISTS idx_member_nik ON public.member(nik);
CREATE INDEX IF NOT EXISTS idx_member_phone ON public.member(phone);
CREATE INDEX IF NOT EXISTS idx_member_status ON public.member(status);

-- 6. Grant permissions
GRANT ALL ON public.document_sequences TO authenticated;
GRANT ALL ON public.document_sequences TO service_role;
