-- Add COA Code columns to Savings Products and Loan Products

-- 1. Add coa_id to savings_products
ALTER TABLE savings_products ADD COLUMN IF NOT EXISTS coa_id TEXT; -- Storing Code, e.g. '2-1001'

-- 2. Add coa_receivable to loan_products
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS coa_receivable TEXT; -- e.g. '1-1003'

-- 3. Add coa_interest_income to loan_products
ALTER TABLE loan_products ADD COLUMN IF NOT EXISTS coa_interest_income TEXT; -- e.g. '4-1001'
