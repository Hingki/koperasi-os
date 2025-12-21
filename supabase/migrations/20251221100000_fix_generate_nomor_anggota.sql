-- Fix security issue with member registration trigger
-- The function generate_nomor_anggota() creates a sequence, which requires CREATE permission on schema public.
-- Regular users (authenticated) do not have this permission.
-- Changing the function to SECURITY DEFINER allows it to run with the privileges of the owner (postgres),
-- effectively bypassing the restriction for this specific operation.

CREATE OR REPLACE FUNCTION generate_nomor_anggota()
RETURNS TRIGGER 
SECURITY DEFINER -- Runs with owner privileges
AS $$
DECLARE
    today_date TEXT := to_char(NOW(), 'YYYYMMDD');
    sequence_name TEXT := 'member_nomor_anggota_seq_' || today_date;
    nomor_urut TEXT;
BEGIN
    -- Periksa apakah sequence untuk hari ini sudah ada
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = sequence_name) THEN
        EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %s START 1', sequence_name);
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
