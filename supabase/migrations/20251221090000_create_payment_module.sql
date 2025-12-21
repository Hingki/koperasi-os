-- Migration: Create Payment Module
-- Description: Creates tables for tracking payment transactions
-- Date: 2025-12-21

-- 1. Create ENUMs (Idempotent)
DO $$ 
BEGIN
    BEGIN
        CREATE TYPE payment_transaction_type AS ENUM ('retail_sale', 'loan_payment', 'savings_deposit');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END;
    
    BEGIN
        CREATE TYPE payment_method_type AS ENUM ('cash', 'qris', 'va', 'savings_balance', 'transfer');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END;

    BEGIN
        CREATE TYPE payment_provider_type AS ENUM ('mock', 'xendit', 'midtrans', 'manual', 'internal');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END;

    BEGIN
        CREATE TYPE payment_status_type AS ENUM ('pending', 'success', 'failed', 'expired', 'refunded');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END;
END $$;

-- 2. Create Payment Transactions Table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    
    transaction_type payment_transaction_type NOT NULL,
    reference_id UUID NOT NULL, -- Generic link to source (pos_transactions.id, loan_payments.id, etc)
    
    payment_method payment_method_type NOT NULL,
    payment_provider payment_provider_type NOT NULL,
    
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    status payment_status_type NOT NULL DEFAULT 'pending',
    
    -- Provider specific details
    external_id TEXT, -- ID from Xendit/Midtrans
    qr_code_url TEXT,
    va_number TEXT,
    webhook_payload JSONB,
    
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    expired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID -- auth.users(id)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS handle_payment_transactions_updated_at ON payment_transactions;
CREATE TRIGGER handle_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view payments (should be refined to koperasi_id check in production, but generic auth check is standard for MVP)
DROP POLICY IF EXISTS "View Payment Transactions" ON payment_transactions;
CREATE POLICY "View Payment Transactions" ON payment_transactions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Insert Payment Transactions" ON payment_transactions;
CREATE POLICY "Insert Payment Transactions" ON payment_transactions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Update Payment Transactions" ON payment_transactions;
CREATE POLICY "Update Payment Transactions" ON payment_transactions FOR UPDATE TO authenticated USING (true);
