-- ARCHIVED: 2025-12-15
-- Original file: 20251214125350_005_debug_rls_with_open_policy.sql
-- This migration was moved to archived because it contained a permissive debug RLS policy.

-- Hapus semua kebijakan lama untuk membersihkan medan perang
DROP POLICY IF EXISTS "Allow authenticated users to insert their own profile" ON member;
DROP POLICY IF EXISTS "Allow authenticated users to update their own profile" ON member;

-- BUAT KEBIJAKAN SEMENTARA YANG SANGAT TERBUKA
-- Izinkan SIAPA PUN yang sudah login (authenticated) untuk menambah data APA PUN ke tabel member
-- INI HANYA UNTUK DEBUGGING!
CREATE POLICY "Enable insert for all authenticated users" ON member
  FOR INSERT
  TO authenticated
  WITH CHECK ( true ); -- true berarti "selalu izinkan"
