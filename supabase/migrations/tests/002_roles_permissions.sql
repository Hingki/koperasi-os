-- Tests for admin/finance role policies

-- Prepare test data
DELETE FROM public.ledger_entry WHERE tx_reference = 'ROLE_TEST';
DELETE FROM public.chart_of_accounts WHERE account_code LIKE 'ROLE_TEST%';
DELETE FROM public.accounting_period WHERE period_name = 'ROLE_TEST_PERIOD';

-- Ensure test koperasi exists
DO $$
BEGIN
  INSERT INTO public.koperasi (nama, nomor_badan_hukum, tanggal_berdiri, alamat, kelurahan, kecamatan, kota, provinsi)
  VALUES ('ROLE TEST KOP','ROLE_TEST_KOP','2020-01-01','ADDR','KEL','KEC','KOTA','PROV')
  ON CONFLICT (nomor_badan_hukum) DO NOTHING;
END$$;

-- Create accounts and period
WITH k AS (SELECT id AS kop_id FROM public.koperasi WHERE nomor_badan_hukum = 'ROLE_TEST_KOP' LIMIT 1)
INSERT INTO public.chart_of_accounts (koperasi_id, account_code, account_name, level, account_type, normal_balance)
SELECT kop_id, 'ROLE_TEST_A', 'Role Test A', 1, 'asset', 'debit' FROM k
WHERE NOT EXISTS (SELECT 1 FROM public.chart_of_accounts WHERE account_code = 'ROLE_TEST_A');

WITH k AS (SELECT id AS kop_id FROM public.koperasi WHERE nomor_badan_hukum = 'ROLE_TEST_KOP' LIMIT 1)
INSERT INTO public.chart_of_accounts (koperasi_id, account_code, account_name, level, account_type, normal_balance)
SELECT kop_id, 'ROLE_TEST_B', 'Role Test B', 1, 'asset', 'debit' FROM k
WHERE NOT EXISTS (SELECT 1 FROM public.chart_of_accounts WHERE account_code = 'ROLE_TEST_B');

-- Create an accounting period
INSERT INTO public.accounting_period (koperasi_id, period_name, period_type, year, month, start_date, end_date)
SELECT id, 'ROLE_TEST_PERIOD', 'monthly', 2025, 12, '2025-12-01', '2026-01-01' FROM public.koperasi WHERE nomor_badan_hukum = 'ROLE_TEST_KOP' AND NOT EXISTS (SELECT 1 FROM public.accounting_period WHERE period_name = 'ROLE_TEST_PERIOD') LIMIT 1;

-- Get needed ids
SELECT set_config('jwt.claims.role','finance', true);
SET LOCAL ROLE authenticated;

-- As `finance`, inserting a ledger entry should succeed
WITH a AS (SELECT id FROM public.chart_of_accounts WHERE account_code = 'ROLE_TEST_A' LIMIT 1),
     b AS (SELECT id FROM public.chart_of_accounts WHERE account_code = 'ROLE_TEST_B' LIMIT 1),
     p AS (SELECT id FROM public.accounting_period WHERE period_name = 'ROLE_TEST_PERIOD' LIMIT 1),
     k AS (SELECT id FROM public.koperasi WHERE nomor_badan_hukum = 'ROLE_TEST_KOP' LIMIT 1)
INSERT INTO public.ledger_entry (koperasi_id, period_id, tx_id, tx_type, account_debit, account_credit, amount, description, hash_current, created_by, created_at)
SELECT k.id, p.id, gen_random_uuid(), 'test', a.id, b.id, 100.00, 'ROLE_TEST', 'h', gen_random_uuid(), now() FROM a, b, p, k;

-- Verify it exists
SELECT 1 FROM public.ledger_entry WHERE tx_reference = 'ROLE_TEST' OR description = 'ROLE_TEST' LIMIT 1;

RESET ROLE;
SELECT set_config('jwt.claims.role','admin', true);
SET LOCAL ROLE authenticated;

-- As `admin`, deleting an audit row should be allowed (we created test audit rows earlier)
INSERT INTO public.audit_log (table_name, operation, row_data) VALUES ('role_test','INSERT','{}');
DELETE FROM public.audit_log WHERE table_name = 'role_test';

-- Cleanup
RESET ROLE;
DELETE FROM public.ledger_entry WHERE description = 'ROLE_TEST';
DELETE FROM public.chart_of_accounts WHERE account_code LIKE 'ROLE_TEST%';
DELETE FROM public.accounting_period WHERE period_name = 'ROLE_TEST_PERIOD';
DELETE FROM public.koperasi WHERE nomor_badan_hukum = 'ROLE_TEST_KOP';
