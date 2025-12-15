-- Fungsi untuk menghasilkan nomor anggota
CREATE OR REPLACE FUNCTION generate_nomor_anggota()
RETURNS TRIGGER AS $$     DECLARE
    today_date TEXT := to_char(NOW(), 'YYYYMMDD');
    sequence_name TEXT := 'member_nomor_anggota_seq_' || today_date;
    nomor_urut TEXT;
    nomor_anggota_baru TEXT;
BEGIN
    -- Periksa apakah sequence untuk hari ini sudah ada
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = sequence_name) THEN
        EXECUTE format('CREATE SEQUENCE %s START 1', sequence_name);
    END IF;

    -- Ambil nomor urut berikutnya dari sequence
    EXECUTE format('SELECT nextval(%L)', sequence_name) INTO nomor_urut;

    -- Format nomor urut menjadi 5 digit dengan leading zero
    nomor_urut := LPAD(nomor_urut, 5, '0');

    -- Gabungkan menjadi nomor anggota lengkap
    NEW.nomor_anggota := 'ANGGTA-' || today_date || '-' || nomor_urut;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk memanggil fungsi sebelum INSERT
DROP TRIGGER IF EXISTS set_nomor_anggota ON member;
CREATE TRIGGER set_nomor_anggota
    BEFORE INSERT ON member
    FOR EACH ROW
    EXECUTE FUNCTION generate_nomor_anggota();