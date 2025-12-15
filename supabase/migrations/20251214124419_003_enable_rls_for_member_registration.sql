-- 1. Pastikan RLS aktif untuk tabel member
ALTER TABLE member ENABLE ROW LEVEL SECURITY;

-- MIGRATION-LINTER: allow-anon

-- 2. Buat kebijakan (policy) yang mengizinkan user untuk membuat profil member mereka sendiri
CREATE POLICY "Users can create their own member profile" ON member
  FOR INSERT
  TO anon
  WITH CHECK (auth.uid() = user_id);