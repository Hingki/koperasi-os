-- Migration: Seed Standard Savings Products
-- Description: Ensures standard savings products (Pokok, Wajib, Sukarela) exist for all Koperasi
-- Date: 2026-01-01

DO $$
DECLARE
    r_koperasi RECORD;
BEGIN
    -- Loop through all existing Koperasi
    FOR r_koperasi IN SELECT id FROM koperasi LOOP
        
        -- 1. Simpanan Pokok
        IF NOT EXISTS (SELECT 1 FROM savings_products WHERE koperasi_id = r_koperasi.id AND type = 'pokok') THEN
            INSERT INTO savings_products (koperasi_id, code, name, type, description, interest_rate, min_balance, min_deposit, is_withdrawal_allowed)
            VALUES (
                r_koperasi.id, 
                'SP-POKOK', 
                'Simpanan Pokok', 
                'pokok', 
                'Simpanan awal keanggotaan (sekali bayar)', 
                0, -- Usually 0% interest
                0, 
                100000, -- Default standard amount
                false -- Cannot withdraw
            );
        END IF;

        -- 2. Simpanan Wajib
        IF NOT EXISTS (SELECT 1 FROM savings_products WHERE koperasi_id = r_koperasi.id AND type = 'wajib') THEN
            INSERT INTO savings_products (koperasi_id, code, name, type, description, interest_rate, min_balance, min_deposit, is_withdrawal_allowed)
            VALUES (
                r_koperasi.id, 
                'SP-WAJIB', 
                'Simpanan Wajib', 
                'wajib', 
                'Simpanan rutin bulanan anggota', 
                0, -- Usually 0% interest, but participates in SHU
                0, 
                50000, -- Default monthly amount
                false -- Cannot withdraw
            );
        END IF;

        -- 3. Simpanan Sukarela
        IF NOT EXISTS (SELECT 1 FROM savings_products WHERE koperasi_id = r_koperasi.id AND type = 'sukarela') THEN
            INSERT INTO savings_products (koperasi_id, code, name, type, description, interest_rate, min_balance, min_deposit, is_withdrawal_allowed)
            VALUES (
                r_koperasi.id, 
                'SP-SUKARELA', 
                'Simpanan Sukarela', 
                'sukarela', 
                'Simpanan harian yang dapat ditarik sewaktu-waktu', 
                3.0, -- Default 3% p.a.
                10000, 
                10000, 
                true -- Can withdraw
            );
        END IF;

    END LOOP;
END $$;
