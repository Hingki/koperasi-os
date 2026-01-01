-- Migration: Marketplace Schema & Fixes
-- Date: 2025-01-01
-- Description: Creates marketplace_transactions table, ensures Escrow account, and fixes PPOB schema.

-- 1. Create Marketplace Transactions Table
CREATE TABLE IF NOT EXISTS public.marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('retail', 'ppob', 'loan_payment')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('initiated', 'journal_locked', 'fulfilled', 'settled', 'reversed')),
  total_amount NUMERIC(12,2) NOT NULL,
  member_id UUID, -- Can be null for guest transactions
  koperasi_id UUID NOT NULL REFERENCES public.koperasi(id),
  journal_id UUID REFERENCES public.journal_entries(id),
  entity_type VARCHAR(20), -- 'retail' or 'ppob'
  entity_id VARCHAR(100), -- ID of the operational record
  fulfilled_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  reversed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for Marketplace Transactions
CREATE INDEX IF NOT EXISTS idx_mt_status ON public.marketplace_transactions(status);
CREATE INDEX IF NOT EXISTS idx_mt_created_at ON public.marketplace_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_mt_koperasi_id ON public.marketplace_transactions(koperasi_id);
CREATE INDEX IF NOT EXISTS idx_mt_journal_id ON public.marketplace_transactions(journal_id);

-- Grant Permissions
GRANT ALL ON public.marketplace_transactions TO postgres, anon, authenticated, service_role;

-- 2. Ensure Escrow Liability Account (2-1300) exists for all Koperasi
DO $$
DECLARE
    k RECORD;
    acc_exists BOOLEAN;
BEGIN
    FOR k IN SELECT id FROM public.koperasi LOOP
        SELECT EXISTS (
            SELECT 1 FROM public.chart_of_accounts 
            WHERE koperasi_id = k.id AND code = '2-1300'
        ) INTO acc_exists;

        IF NOT acc_exists THEN
            INSERT INTO public.chart_of_accounts 
            (koperasi_id, code, name, type, category, is_system, is_active)
            VALUES (k.id, '2-1300', 'Hutang Transaksi / Dana Titipan', 'liability', 'payable', true, true);
        END IF;
    END LOOP;
END $$;

-- 3. Fix PPOB Products Schema
-- Add koperasi_id if missing
ALTER TABLE public.ppob_products ADD COLUMN IF NOT EXISTS koperasi_id UUID REFERENCES public.koperasi(id);
-- Add price_buy if missing
ALTER TABLE public.ppob_products ADD COLUMN IF NOT EXISTS price_buy NUMERIC(12, 2) DEFAULT 0;

-- Update null koperasi_id to first koperasi (Migration fix)
DO $$
DECLARE
    first_kop_id UUID;
BEGIN
    SELECT id INTO first_kop_id FROM public.koperasi LIMIT 1;
    IF first_kop_id IS NOT NULL THEN
        UPDATE public.ppob_products SET koperasi_id = first_kop_id WHERE koperasi_id IS NULL;
    END IF;
END $$;

-- 4. Reload Schema Cache (Important for PostgREST)
NOTIFY pgrst, 'reload schema';
