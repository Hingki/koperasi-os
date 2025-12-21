-- Seed default koperasi if none exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM koperasi) THEN
        INSERT INTO koperasi (
            id, 
            nama, 
            nomor_badan_hukum, 
            tanggal_berdiri, 
            alamat, 
            kelurahan, 
            kecamatan, 
            kota, 
            provinsi, 
            phone, 
            email
        ) VALUES (
            '5dbd0f3f-e591-4714-8522-2809eb9f3d33', -- Using the ID that was hardcoded in route.ts as default
            'Koperasi Sejahtera Bersama',
            'BH-123456789',
            '2024-01-01',
            'Jl. Merdeka No. 45',
            'Menteng',
            'Menteng',
            'Jakarta Pusat',
            'DKI Jakarta',
            '021-5555555',
            'admin@koperasi-sejahtera.id'
        );
    END IF;
END $$;
