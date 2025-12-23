-- Add COA Code columns to Savings Products
ALTER TABLE savings_products
ADD COLUMN IF NOT EXISTS coa_id TEXT; -- Storing Code, e.g. '2-1001'

-- Add COA Code columns to Loan Products
ALTER TABLE loan_products
ADD COLUMN IF NOT EXISTS coa_receivable TEXT, -- e.g. '1-1003'
ADD COLUMN IF NOT EXISTS coa_interest_income TEXT; -- e.g. '4-1001'
