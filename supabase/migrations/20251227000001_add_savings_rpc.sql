-- Migration: Add Savings RPC functions
-- Description: Adds RPC functions for atomic balance updates
-- Date: 2025-12-27

-- 1. Decrement Balance (e.g. for PPOB Purchase)
CREATE OR REPLACE FUNCTION decrement_savings_balance(p_account_id UUID, p_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance NUMERIC;
BEGIN
    -- Lock row for update
    SELECT balance INTO v_current_balance
    FROM savings_accounts
    WHERE id = p_account_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Savings account not found';
    END IF;

    IF v_current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    UPDATE savings_accounts
    SET 
        balance = balance - p_amount,
        last_transaction_at = NOW(),
        updated_at = NOW()
    WHERE id = p_account_id;
END;
$$;

-- 2. Increment Balance (e.g. for Top-up or Refund)
CREATE OR REPLACE FUNCTION increment_savings_balance(p_account_id UUID, p_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE savings_accounts
    SET 
        balance = balance + p_amount,
        last_transaction_at = NOW(),
        updated_at = NOW()
    WHERE id = p_account_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Savings account not found';
    END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION decrement_savings_balance(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_savings_balance(UUID, NUMERIC) TO authenticated;
