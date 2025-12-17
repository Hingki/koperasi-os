-- Create minimal auth helper functions required by RLS policies (idempotent)
-- This is a lightweight stub used for CI preview DBs where Supabase's
-- auth helper functions are not available.

CREATE SCHEMA IF NOT EXISTS auth;

-- Create a simple uid() function that returns UUID. The implementation is
-- intentionally simple — it exists so CREATE POLICY statements referencing
-- auth.uid() do not fail during CI preview runs.
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE SQL
AS $$
  SELECT NULL::UUID;
$$;
