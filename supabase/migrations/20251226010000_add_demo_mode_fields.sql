-- Add is_test_transaction column to ledger_entry
ALTER TABLE ledger_entry 
ADD COLUMN IF NOT EXISTS is_test_transaction BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_ledger_is_test ON ledger_entry(is_test_transaction);

-- Add is_test_transaction column to pos_transactions
ALTER TABLE pos_transactions 
ADD COLUMN IF NOT EXISTS is_test_transaction BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_pos_is_test ON pos_transactions(is_test_transaction);

-- Add is_test_transaction column to payment_transactions
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS is_test_transaction BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_payment_is_test ON payment_transactions(is_test_transaction);
