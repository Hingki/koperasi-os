-- auth helper stub for LOCAL / CI only
-- DO NOT attempt to create auth schema or functions on Supabase remote

DO $$
BEGIN
  -- Only create stub if auth.uid() does NOT already exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'uid'
      AND n.nspname = 'auth'
  ) THEN
    -- create stub ONLY if schema auth is writable (local dev)
    BEGIN
      EXECUTE $f$
        CREATE FUNCTION auth.uid()
        RETURNS UUID
        LANGUAGE SQL
        AS $$
          SELECT NULL::UUID;
        $$;
      $f$;
    EXCEPTION
      WHEN insufficient_privilege THEN
        -- silently ignore on Supabase managed environments
        RAISE NOTICE 'Skipping auth.uid() stub (managed Supabase)';
    END;
  END IF;
END$$;
