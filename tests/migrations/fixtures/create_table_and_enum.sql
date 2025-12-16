-- Fixture: create table and enum
CREATE TYPE member_status_test AS ENUM ('x','y');
CREATE TABLE test_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT
);
