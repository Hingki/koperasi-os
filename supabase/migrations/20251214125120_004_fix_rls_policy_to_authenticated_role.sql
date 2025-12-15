-- Hapus kebijakan lama yang salah
DROP POLICY IF EXISTS "Users can create their own member profile" ON member;

-- Buat kebijakan baru yang benar untuk role 'authenticated'
-- Ini akan memungkinkan user yang baru saja mendaftar untuk membuat profil mereka sendiri.
CREATE POLICY "Allow authenticated users to insert their own profile" ON member
  FOR INSERT
  TO authenticated
  WITH CHECK ( auth.uid() = user_id );

-- Kita juga tambahkan kebijakan untuk UPDATE agar user bisa edit profilnya sendiri nanti
CREATE POLICY "Allow authenticated users to update their own profile" ON member
  FOR UPDATE
  TO authenticated
  USING ( auth.uid() = user_id );