-- ARCHIVED: 2025-12-15
-- Original file: 20251214125755_005_grant_schema_permissions.sql
-- Duplicate grant migration moved to archived; keep only the newer 20251215072213_grant_schema_permissions.sql

-- Berikan izin USAGE pada schema public kepada role anon dan authenticated
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Berikan izin penuh pada semua tabel di schema public kepada role authenticated
-- Ini adalah langkah debugging yang sangat permisif, kita akan kurangi nanti
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
