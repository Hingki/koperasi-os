-- auth helper stub for LOCAL / CI only
-- Safe on Supabase remote: will skip silently

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'uid'
      AND n.nspname = 'auth'
  ) THEN
    BEGIN
      CREATE FUNCTION auth.uid()
      RETURNS uuid
      LANGUAGE sql
      AS 'SELECT NULL::uuid';
    EXCEPTION
      WHEN insufficient_privilege THEN
        NULL;
    END;
  END IF;
END
$do$;
