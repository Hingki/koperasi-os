-- Temporary test migration: insert ledger_entry and verify partition creation
BEGIN;

-- Create a test koperasi
INSERT INTO koperasi (id, nama, nomor_badan_hukum, tanggal_berdiri, alamat, kelurahan, kecamatan, kota, provinsi)
VALUES (gen_random_uuid(), 'Test Koperasi LE', 'TBH-LE-001', CURRENT_DATE, 'Jl Test', 'Kelurahan', 'Kecamatan', 'Kota', 'Provinsi')
ON CONFLICT (nomor_badan_hukum) DO NOTHING;

-- Get koperasi id
WITH k AS (
  SELECT id FROM koperasi WHERE nomor_badan_hukum = 'TBH-LE-001' LIMIT 1
)
INSERT INTO chart_of_accounts (id, koperasi_id, account_code, account_name, level, account_type, normal_balance)
SELECT gen_random_uuid(), k.id, 'TEST-1000', 'Test Account Debit', 3, 'asset', 'debit' FROM k
ON CONFLICT (account_code) DO NOTHING;

INSERT INTO chart_of_accounts (id, koperasi_id, account_code, account_name, level, account_type, normal_balance)
SELECT gen_random_uuid(), k.id, 'TEST-2000', 'Test Account Credit', 3, 'liability', 'credit' FROM k
ON CONFLICT (account_code) DO NOTHING;

INSERT INTO accounting_period (id, koperasi_id, period_name, period_type, year, start_date, end_date)
SELECT gen_random_uuid(), k.id, 'Test Period', 'monthly', EXTRACT(YEAR FROM CURRENT_DATE)::int, date_trunc('month', CURRENT_DATE)::date, (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date FROM k
ON CONFLICT DO NOTHING;

-- Fetch ids for insertion
WITH c AS (
  SELECT id FROM chart_of_accounts WHERE account_code = 'TEST-1000' LIMIT 1
), c2 AS (
  SELECT id FROM chart_of_accounts WHERE account_code = 'TEST-2000' LIMIT 1
), p AS (
  SELECT id FROM accounting_period WHERE period_name = 'Test Period' LIMIT 1
), kop AS (
  SELECT id FROM koperasi WHERE nomor_badan_hukum = 'TBH-LE-001' LIMIT 1
)
INSERT INTO ledger_entry (id, koperasi_id, period_id, tx_id, tx_type, tx_reference, account_debit, account_credit, amount, description, metadata, hash_current, created_by, book_date)
SELECT gen_random_uuid(), kop.id, p.id, gen_random_uuid(), 'test', 'REF-LE-001', c.id, c2.id, 100.00, 'Test ledger entry', '{}'::jsonb, md5(random()::text), NULL, CURRENT_DATE
FROM c CROSS JOIN c2 CROSS JOIN p CROSS JOIN kop;

-- Verify partition exists
DO $$
DECLARE
  part_name TEXT := format('ledger_entry_%s', to_char(date_trunc('month', CURRENT_DATE), 'YYYYMM'));
  exists_part INT;
BEGIN
  SELECT COUNT(*) INTO exists_part FROM pg_class WHERE relname = part_name;
  IF exists_part = 0 THEN
    RAISE EXCEPTION 'Partition % not found', part_name;
  ELSE
    RAISE NOTICE 'Partition % exists', part_name;
  END IF;
END$$;

-- Cleanup test data
DELETE FROM ledger_entry WHERE tx_reference = 'REF-LE-001';
DELETE FROM chart_of_accounts WHERE account_code IN ('TEST-1000','TEST-2000');
DELETE FROM accounting_period WHERE period_name = 'Test Period';
DELETE FROM koperasi WHERE nomor_badan_hukum = 'TBH-LE-001';

COMMIT;

-- Archive note: This migration should be removed or moved to archived after verification.
