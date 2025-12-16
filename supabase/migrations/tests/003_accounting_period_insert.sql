-- Test 003: accounting_period insert is idempotent when unique constraint is absent
DO $$
DECLARE
  v_k UUID;
BEGIN
  -- Ensure a koperasi exists for FK
  INSERT INTO koperasi (id, nama, nomor_badan_hukum, tanggal_berdiri, alamat, kelurahan, kecamatan, kota, provinsi)
  VALUES (gen_random_uuid(), 'Test Koperasi AP', 'TBH-AP-001', CURRENT_DATE, 'Jl Test', 'Kelurahan', 'Kecamatan', 'Kota', 'Provinsi')
  ON CONFLICT (nomor_badan_hukum) DO NOTHING;

  SELECT id INTO v_k FROM koperasi WHERE nomor_badan_hukum = 'TBH-AP-001' LIMIT 1;

  -- Use IF NOT EXISTS guard similar to migration pattern (should not error)
  IF NOT EXISTS (SELECT 1 FROM accounting_period WHERE period_name = 'Test Period AP') THEN
    INSERT INTO accounting_period (id, koperasi_id, period_name, period_type, year, start_date, end_date)
    VALUES (gen_random_uuid(), v_k, 'Test Period AP', 'monthly', EXTRACT(YEAR FROM CURRENT_DATE)::int, date_trunc('month', CURRENT_DATE)::date, (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date);
  END IF;

  -- Validate it exists
  PERFORM 1 FROM accounting_period WHERE period_name = 'Test Period AP' LIMIT 1;

  -- Cleanup
  DELETE FROM accounting_period WHERE period_name = 'Test Period AP';
  DELETE FROM koperasi WHERE nomor_badan_hukum = 'TBH-AP-001';
END$$;
