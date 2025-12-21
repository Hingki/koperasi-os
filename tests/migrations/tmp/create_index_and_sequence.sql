-- Fixture: create index IF NOT EXISTS and sequence
CREATE SEQUENCE IF NOT EXISTS member_nomor_anggota_seq;
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_nik ON member(nik);
