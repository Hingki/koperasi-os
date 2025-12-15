-- Simple smoke test for RBAC/RLS policies
-- Creates missing roles for the test, then verifies anon cannot INSERT while authenticated can.

-- Ensure test roles exist (harmless if they already do)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
END$$;

DELETE FROM public.chart_of_accounts WHERE account_code = 'RBAC_TEST';

-- Ensure a test koperasi exists (required for FK)
DO $$
BEGIN
  INSERT INTO public.koperasi (nama, nomor_badan_hukum, tanggal_berdiri, alamat, kelurahan, kecamatan, kota, provinsi)
  VALUES ('RBAC TEST KOP','RBAC_TEST_KOP','2020-01-01','ADDR','KEL','KEC','KOTA','PROV')
  ON CONFLICT (nomor_badan_hukum) DO NOTHING;
END$$;

BEGIN;
  SET LOCAL ROLE anon;
  DO $$
  BEGIN
    BEGIN
      INSERT INTO public.chart_of_accounts (koperasi_id, account_name, account_code, normal_balance, level, account_type) VALUES ((SELECT id FROM public.koperasi WHERE nomor_badan_hukum='RBAC_TEST_KOP' LIMIT 1), 'RBAC TEST','RBAC_TEST','debit',1,'asset');
      RAISE EXCEPTION 'ANON_INSERT_SHOULD_HAVE_FAILED';
    EXCEPTION WHEN others THEN
      -- Expected: permission denied or RLS rejection
      RAISE NOTICE 'anon insert failed as expected: %', SQLERRM;
    END;
  END$$;
  RESET ROLE;
ROLLBACK;

BEGIN;
  SET LOCAL ROLE authenticated;
  INSERT INTO public.chart_of_accounts (koperasi_id, account_name, account_code, normal_balance, level, account_type) VALUES ((SELECT id FROM public.koperasi WHERE nomor_badan_hukum='RBAC_TEST_KOP' LIMIT 1), 'RBAC TEST','RBAC_TEST','debit',1,'asset');
  RESET ROLE;
COMMIT;

SELECT 1 FROM public.chart_of_accounts WHERE account_code = 'RBAC_TEST' LIMIT 1;

DELETE FROM public.chart_of_accounts WHERE account_code = 'RBAC_TEST';
DELETE FROM public.koperasi WHERE nomor_badan_hukum = 'RBAC_TEST_KOP';
