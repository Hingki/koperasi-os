-- Fixture: create index and sequence
CREATE SEQUENCE member_nomor_anggota_seq;
CREATE UNIQUE INDEX idx_member_nik ON member(nik);
