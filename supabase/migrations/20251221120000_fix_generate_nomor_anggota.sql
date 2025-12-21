-- Fix permission issue for generate_nomor_anggota trigger
-- The function needs to create sequences dynamically, which requires permissions on the public schema.
-- By using SECURITY DEFINER, the function runs with the privileges of the creator (usually postgres/admin),
-- bypassing the restrictions of the caller.

CREATE OR REPLACE FUNCTION generate_nomor_anggota()
RETURNS TRIGGER 
SECURITY DEFINER
AS $$     DECLARE
    today_date TEXT := to_char(NOW(), 'YYYYMMDD');
    sequence_name TEXT := 'member_nomor_anggota_seq_' || today_date;
    nomor_urut TEXT;
BEGIN
    -- Periksa apakah sequence untuk hari ini sudah ada
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = sequence_name) THEN
        EXECUTE format('CREATE SEQUENCE %s START 1', sequence_name);
        -- Grant permission to authenticated users to use the sequence
        EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO authenticated', sequence_name);
        EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO service_role', sequence_name);
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
