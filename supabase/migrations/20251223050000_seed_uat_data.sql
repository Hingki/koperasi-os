-- Seed Data for UAT
-- 1. Create Payment Source (Manual Transfer) if not exists
INSERT INTO payment_sources (koperasi_id, name, method, provider, bank_name, account_number, account_holder, is_active)
SELECT 
    id as koperasi_id,
    'Bank BCA (Manual)' as name,
    'transfer' as method,
    'manual' as provider,
    'BCA' as bank_name,
    '1234567890' as account_number,
    'Koperasi Sejahtera' as account_holder,
    true as is_active
FROM koperasi
WHERE NOT EXISTS (
    SELECT 1 FROM payment_sources WHERE provider = 'manual' AND method = 'transfer'
)
LIMIT 1;

-- 2. Ensure Savings Product exists and has COA
UPDATE savings_products
SET coa_id = '2-1001'
WHERE coa_id IS NULL;

-- 3. Ensure Loan Product exists and has COA
UPDATE loan_products
SET 
    coa_receivable = '1-1003',
    coa_interest_income = '4-1001'
WHERE coa_receivable IS NULL;

-- 4. Create a Demo Member (if needed) - skipped, assuming members exist or will be created via UI
