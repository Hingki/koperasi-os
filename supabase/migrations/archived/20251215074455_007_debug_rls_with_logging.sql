-- ARCHIVED: 2025-12-15
-- Original file: 20251215074455_007_debug_rls_with_logging.sql
-- Moved to archived because it used RAISE NOTICE inside a policy (unsafe for production)

-- Hapus kebijakan lama
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON public.member;

-- Buat kebijakan baru yang akan mencatat informasi ke log Supabase
CREATE POLICY "Debug: Log insert attempts" ON public.member
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Baris ini akan menulis pesan ke log Supabase setiap kali kebijakan ini dievaluasi
    RAISE NOTICE 'DEBUG: Insert attempt. Role=%, User ID=%', current_role, auth.uid();
    -- Kita tetap mengizinkan insert dengan 'true'
    true
  );
