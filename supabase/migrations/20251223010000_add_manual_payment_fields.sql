-- Add bank details to payment_sources for Manual Transfer
ALTER TABLE payment_sources
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS account_holder TEXT;

-- Add proof_of_payment column to payment_transactions
ALTER TABLE payment_transactions
ADD COLUMN IF NOT EXISTS proof_of_payment TEXT; -- URL or path to file
