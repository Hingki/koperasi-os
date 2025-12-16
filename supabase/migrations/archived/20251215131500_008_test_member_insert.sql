-- ARCHIVED and disabled: moved from active migrations
-- This file is temporary test migration and has been archived after successful verification.

-- ARCHIVED: 2025-12-15
-- Original file: 20251215131500_008_test_member_insert.sql
-- This was a temporary migration used to validate member insert and constraints.
-- It inserted a test koperasi and member and then removed them.
-- BEGIN;
-- WITH k AS (
--   INSERT INTO koperasi (id, nama, nomor_badan_hukum, tanggal_berdiri, alamat, kelurahan, kecamatan, kota, provinsi)
--   VALUES (gen_random_uuid(), 'Test Koperasi', 'TBH-TEST-001', CURRENT_DATE, 'Jl Test', 'Kelurahan', 'Kecamatan', 'Kota', 'Provinsi')
--   RETURNING id
-- )
-- INSERT INTO member (id, koperasi_id, nomor_anggota, nama_lengkap, nik, phone, alamat_lengkap, member_type, status, tanggal_daftar, created_at)
-- SELECT gen_random_uuid(), k.id, 'ANGGTA-TEST-00001', 'Test Member', 'NIKTEST0001', '081234567890', 'Alamat Test', 'regular', 'pending', CURRENT_DATE, NOW()
-- FROM k;

-- DELETE FROM member WHERE nik = 'NIKTEST0001';
-- DELETE FROM koperasi WHERE nomor_badan_hukum = 'TBH-TEST-001';
-- COMMIT;
