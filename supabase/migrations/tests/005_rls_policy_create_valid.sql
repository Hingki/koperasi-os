-- Test 005: verify creating a valid RLS policy for koperasi is syntactically valid
-- Drop policy if exists, then create a minimal valid policy
DROP POLICY IF EXISTS "test_koperasi_select_authenticated" ON public.koperasi;
CREATE POLICY "test_koperasi_select_authenticated" ON public.koperasi
  FOR SELECT TO authenticated
  USING ( true );

-- Ensure policy exists via pg_catalog
DO $$
DECLARE
  cnt INT;
BEGIN
  SELECT count(*) INTO cnt FROM pg_policy WHERE polname = 'test_koperasi_select_authenticated';
  IF cnt = 0 THEN
    RAISE EXCEPTION 'Policy not found after creation';
  END IF;
END$$;

-- Cleanup
DROP POLICY IF EXISTS "test_koperasi_select_authenticated" ON public.koperasi;
