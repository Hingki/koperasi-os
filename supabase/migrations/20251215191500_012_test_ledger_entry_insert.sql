-- Temporary test migration: insert ledger_entry and verify partition creation
DO $$
DECLARE
  v_k UUID;
  v_acc1 UUID;
  v_acc2 UUID;
  v_period UUID;
  part_name TEXT := format('ledger_entry_%s', to_char(date_trunc('month', CURRENT_DATE), 'YYYYMM'));
  exists_part INT;
BEGIN
  -- Create koperasi if not exists
  INSERT INTO koperasi (id, nama, nomor_badan_hukum, tanggal_berdiri, alamat, kelurahan, kecamatan, kota, provinsi)
  VALUES (gen_random_uuid(), 'Test Koperasi LE', 'TBH-LE-001', CURRENT_DATE, 'Jl Test', 'Kelurahan', 'Kecamatan', 'Kota', 'Provinsi')
  ON CONFLICT (nomor_badan_hukum) DO NOTHING;

  SELECT id INTO v_k FROM koperasi WHERE nomor_badan_hukum = 'TBH-LE-001' LIMIT 1;

  -- Create accounts
  INSERT INTO chart_of_accounts (id, koperasi_id, account_code, account_name, level, account_type, normal_balance)
  VALUES (gen_random_uuid(), v_k, 'TEST-1000', 'Test Account Debit', 3, 'asset', 'debit')
  ON CONFLICT (account_code) DO NOTHING;

  INSERT INTO chart_of_accounts (id, koperasi_id, account_code, account_name, level, account_type, normal_balance)
  VALUES (gen_random_uuid(), v_k, 'TEST-2000', 'Test Account Credit', 3, 'liability', 'credit')
  ON CONFLICT (account_code) DO NOTHING;

  SELECT id INTO v_acc1 FROM chart_of_accounts WHERE account_code = 'TEST-1000' LIMIT 1;
  SELECT id INTO v_acc2 FROM chart_of_accounts WHERE account_code = 'TEST-2000' LIMIT 1;

  -- Create accounting period
  INSERT INTO accounting_period (id, koperasi_id, period_name, period_type, year, start_date, end_date)
  VALUES (gen_random_uuid(), v_k, 'Test Period', 'monthly', EXTRACT(YEAR FROM CURRENT_DATE)::int, date_trunc('month', CURRENT_DATE)::date, (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date)
  ON CONFLICT (period_name) DO NOTHING;

  SELECT id INTO v_period FROM accounting_period WHERE period_name = 'Test Period' LIMIT 1;

  -- Insert ledger entry
  INSERT INTO ledger_entry (id, koperasi_id, period_id, tx_id, tx_type, tx_reference, account_debit, account_credit, amount, description, metadata, hash_current, created_by, book_date)
  VALUES (gen_random_uuid(), v_k, v_period, gen_random_uuid(), 'test', 'REF-LE-001', v_acc1, v_acc2, 100.00, 'Test ledger entry', '{}'::jsonb, md5(random()::text), NULL, CURRENT_DATE);

  -- Verify partition exists
  SELECT COUNT(*) INTO exists_part FROM pg_class WHERE relname = part_name;
  IF exists_part = 0 THEN
    RAISE EXCEPTION 'Partition % not found', part_name;
  ELSE
    RAISE NOTICE 'Partition % exists', part_name;
  END IF;

  -- Cleanup
  DELETE FROM ledger_entry WHERE tx_reference = 'REF-LE-001';
  DELETE FROM chart_of_accounts WHERE account_code IN ('TEST-1000','TEST-2000');
  DELETE FROM accounting_period WHERE period_name = 'Test Period';
  DELETE FROM koperasi WHERE nomor_badan_hukum = 'TBH-LE-001';
END$$;
