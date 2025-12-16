-- Test 004: inserting into ledger_entry with non-null created_by should succeed (partition trigger will create partition)
DO $$
DECLARE
  v_k UUID;
  v_acc1 UUID;
  v_acc2 UUID;
  v_period UUID;
BEGIN
  -- Ensure koperasi and accounts exist
  INSERT INTO koperasi (id, nama, nomor_badan_hukum, tanggal_berdiri, alamat, kelurahan, kecamatan, kota, provinsi)
  VALUES (gen_random_uuid(), 'Test Koperasi LE', 'TBH-LE-TEST', CURRENT_DATE, 'Jl Test', 'Kelurahan', 'Kecamatan', 'Kota', 'Provinsi')
  ON CONFLICT (nomor_badan_hukum) DO NOTHING;

  SELECT id INTO v_k FROM koperasi WHERE nomor_badan_hukum = 'TBH-LE-TEST' LIMIT 1;

  INSERT INTO chart_of_accounts (id, koperasi_id, account_code, account_name, level, account_type, normal_balance)
  VALUES (gen_random_uuid(), v_k, 'TST-1000', 'Test Account 1', 3, 'asset', 'debit')
  ON CONFLICT (account_code) DO NOTHING;

  INSERT INTO chart_of_accounts (id, koperasi_id, account_code, account_name, level, account_type, normal_balance)
  VALUES (gen_random_uuid(), v_k, 'TST-2000', 'Test Account 2', 3, 'liability', 'credit')
  ON CONFLICT (account_code) DO NOTHING;

  SELECT id INTO v_acc1 FROM chart_of_accounts WHERE account_code = 'TST-1000' LIMIT 1;
  SELECT id INTO v_acc2 FROM chart_of_accounts WHERE account_code = 'TST-2000' LIMIT 1;

  -- Create accounting period
  IF NOT EXISTS (SELECT 1 FROM accounting_period WHERE period_name = 'Test Period LE') THEN
    INSERT INTO accounting_period (id, koperasi_id, period_name, period_type, year, start_date, end_date)
    VALUES (gen_random_uuid(), v_k, 'Test Period LE', 'monthly', EXTRACT(YEAR FROM CURRENT_DATE)::int, date_trunc('month', CURRENT_DATE)::date, (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date);
  END IF;
  SELECT id INTO v_period FROM accounting_period WHERE period_name = 'Test Period LE' LIMIT 1;

  -- Insert ledger_entry with non-null created_by (should succeed)
  INSERT INTO ledger_entry (id, koperasi_id, period_id, tx_id, tx_type, tx_reference, account_debit, account_credit, amount, description, metadata, hash_current, created_by, book_date)
  VALUES (gen_random_uuid(), v_k, v_period, gen_random_uuid(), 'test', 'REF-LE-TST', v_acc1, v_acc2, 50.00, 'Test ledger entry', '{}'::jsonb, md5(random()::text), gen_random_uuid(), CURRENT_DATE);

  -- Validate insertion
  PERFORM 1 FROM ledger_entry WHERE tx_reference = 'REF-LE-TST' LIMIT 1;

  -- Cleanup
  DELETE FROM ledger_entry WHERE tx_reference = 'REF-LE-TST';
  DELETE FROM accounting_period WHERE period_name = 'Test Period LE';
  DELETE FROM chart_of_accounts WHERE account_code IN ('TST-1000','TST-2000');
  DELETE FROM koperasi WHERE nomor_badan_hukum = 'TBH-LE-TEST';
END$$;
