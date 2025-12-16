-- Create minimal roles required by RLS policies (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
END$$;

-- This migration ensures migrations that reference `anon` / `authenticated` roles
-- (for Supabase RLS policies) do not fail on clean preview databases.
