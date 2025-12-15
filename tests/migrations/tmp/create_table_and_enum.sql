-- Fixture: create table and enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status_test') THEN
    CREATE TYPE member_status_test AS ENUM ('x','y');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS test_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT
);
