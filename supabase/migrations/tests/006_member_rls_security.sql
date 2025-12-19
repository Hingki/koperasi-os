-- Test: Member RLS Security - Verify user can only insert their own member record
-- This test SHOULD FAIL if RLS policy allows users to insert with different user_id
-- 
-- Expected behavior:
-- - User A should be able to insert member with user_id = A
-- - User A should NOT be able to insert member with user_id = B
-- - User A should NOT be able to insert member without user_id set

-- Setup: Ensure test koperasi exists
DO $$
DECLARE
  v_koperasi_id UUID;
BEGIN
  SELECT id INTO v_koperasi_id FROM public.koperasi WHERE nomor_badan_hukum = 'RLS_MEMBER_TEST_KOP' LIMIT 1;
  
  IF v_koperasi_id IS NULL THEN
    INSERT INTO public.koperasi (nama, nomor_badan_hukum, tanggal_berdiri, alamat, kelurahan, kecamatan, kota, provinsi)
    VALUES ('RLS Member Test Koperasi', 'RLS_MEMBER_TEST_KOP', '2020-01-01', 'Test Address', 'Test Kel', 'Test Kec', 'Test Kota', 'Test Prov')
    RETURNING id INTO v_koperasi_id;
  END IF;
END$$;

-- Clean up any existing test data
DELETE FROM public.member WHERE nik IN ('RLS_TEST_NIK_001', 'RLS_TEST_NIK_002', 'RLS_TEST_NIK_003');

-- Test 1: Verify RLS policy exists and is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'member' 
    AND policyname LIKE '%insert%'
  ) THEN
    RAISE EXCEPTION 'MEMBER_RLS_POLICY_MISSING: No INSERT policy found for member table';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'member' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'MEMBER_RLS_NOT_ENABLED: RLS is not enabled on member table';
  END IF;
END$$;

-- Test 2: Check current policy - this will show us what policy is active
DO $$
DECLARE
  v_policy_check TEXT;
BEGIN
  SELECT policyname || ': ' || qual::text || ' / ' || with_check::text
  INTO v_policy_check
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename = 'member' 
  AND policyname LIKE '%insert%'
  LIMIT 1;
  
  RAISE NOTICE 'Current INSERT policy: %', COALESCE(v_policy_check, 'NOT FOUND');
  
  -- Check if policy is too permissive (WITH CHECK (true))
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'member' 
    AND policyname LIKE '%insert%'
    AND (with_check::text LIKE '%true%' OR with_check::text = '()')
  ) THEN
    RAISE WARNING 'SECURITY_WARNING: Member INSERT policy appears to be permissive (WITH CHECK (true)). This may allow users to insert records with any user_id!';
  END IF;
END$$;

-- Test 3: Verify policy enforces user_id = auth.uid() constraint
DO $$
DECLARE
  v_policy_with_check TEXT;
BEGIN
  SELECT with_check::text
  INTO v_policy_with_check
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename = 'member' 
  AND policyname = 'member_insert_own_profile'
  LIMIT 1;
  
  IF v_policy_with_check IS NULL THEN
    RAISE EXCEPTION 'MEMBER_RLS_POLICY_MISSING: Policy "member_insert_own_profile" not found';
  END IF;
  
  -- Check if policy contains auth.uid() = user_id constraint
  IF v_policy_with_check NOT LIKE '%auth.uid()%' OR v_policy_with_check NOT LIKE '%user_id%' THEN
    RAISE EXCEPTION 'MEMBER_RLS_POLICY_INVALID: Policy does not enforce auth.uid() = user_id constraint. Current: %', v_policy_with_check;
  END IF;
  
  RAISE NOTICE 'Policy check passed: Policy enforces user_id = auth.uid()';
END$$;

-- Note: Full RLS test with SET ROLE requires actual Supabase Auth users
-- This test documents the expected behavior and current policy state
-- To fully test, we need:
-- 1. Create test users via Supabase Auth API
-- 2. Use their JWT tokens to test RLS
-- 3. Verify that user A cannot insert member with user_id = B

-- This test file serves as documentation and smoke test
-- Full E2E test should be done via API tests (Playwright) or Supabase test framework

