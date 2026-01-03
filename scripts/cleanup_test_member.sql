-- SCRIPT PENGHAPUSAN DATA MEMBER "TEST" (CLEANUP) - V3 (Ultra Safe)
-- Tujuan: Membersihkan data sampah hasil testing
-- Schema: Menggunakan `source_table`/`source_id` untuk ledger lama, dan `reference_id` untuk journals.

DO $$
DECLARE
    v_member_ids UUID[];
    v_loan_ids UUID[];
    v_savings_account_ids UUID[];
    v_savings_transaction_ids UUID[];
BEGIN
    -- 1. IDENTIFIKASI DATA TARGET
    SELECT ARRAY_AGG(id) INTO v_member_ids
    FROM member
    WHERE nama_lengkap LIKE 'Test %';

    IF v_member_ids IS NULL THEN
        RAISE NOTICE ' Tidak ada member dengan nama "Test %%" ditemukan. Tidak ada yang dihapus.';
        RETURN;
    END IF;

    RAISE NOTICE ' Target Member IDs: %', v_member_ids;

    -- Ambil ID Loans
    SELECT ARRAY_AGG(id) INTO v_loan_ids
    FROM loans
    WHERE member_id = ANY(v_member_ids);

    -- Ambil ID Savings Accounts
    SELECT ARRAY_AGG(id) INTO v_savings_account_ids
    FROM savings_accounts
    WHERE member_id = ANY(v_member_ids);

    -- Ambil ID Savings Transactions
    IF v_savings_account_ids IS NOT NULL THEN
        SELECT ARRAY_AGG(id) INTO v_savings_transaction_ids
        FROM savings_transactions
        WHERE account_id = ANY(v_savings_account_ids);
    END IF;

    RAISE NOTICE ' Statistik Data: % Loans, % Savings Accounts, % Savings Tx', 
        COALESCE(array_length(v_loan_ids, 1), 0), 
        COALESCE(array_length(v_savings_account_ids, 1), 0),
        COALESCE(array_length(v_savings_transaction_ids, 1), 0);

    -- 2. EKSEKUSI PENGHAPUSAN (Urutan: Ledger/Journal -> Child -> Parent)

    -- A. HAPUS LEDGER ENTRY (Old Schema: source_table/source_id)
    BEGIN
        DELETE FROM ledger_entry 
        WHERE (source_table = 'loans' AND source_id = ANY(v_loan_ids))
           OR (source_table = 'savings_accounts' AND source_id = ANY(v_savings_account_ids))
           OR (source_table = 'savings_transactions' AND source_id = ANY(v_savings_transaction_ids));
        RAISE NOTICE ' [Accounting] Deleted Ledger Entries (Legacy)';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE ' [Accounting] Ledger Entry cleanup skipped (Table/Column mismatch)';
    END;

    -- B. HAPUS JOURNALS (New Schema: reference_id)
    BEGIN
        DELETE FROM journals 
        WHERE (reference_type = 'LOAN_DISBURSEMENT' AND reference_id = ANY(v_loan_ids::text[]))
           OR (reference_type LIKE 'SAVINGS%' AND reference_id = ANY(v_savings_transaction_ids::text[]));
        RAISE NOTICE ' [Accounting] Deleted Journals';
    EXCEPTION WHEN OTHERS THEN
         RAISE NOTICE ' [Accounting] Journals cleanup skipped (Table not found)';
    END;

    -- C. MODULE PINJAMAN
    IF v_loan_ids IS NOT NULL THEN
        BEGIN
            DELETE FROM loan_repayment_schedule WHERE loan_id = ANY(v_loan_ids);
            DELETE FROM loans WHERE id = ANY(v_loan_ids);
            RAISE NOTICE ' [Loan] Deleted Loans & Schedules';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE ' [Loan] Cleanup failed: %', SQLERRM;
        END;
    END IF;

    -- D. MODULE SIMPANAN
    IF v_savings_account_ids IS NOT NULL THEN
        BEGIN
            DELETE FROM savings_transactions WHERE account_id = ANY(v_savings_account_ids);
            DELETE FROM savings_accounts WHERE id = ANY(v_savings_account_ids);
            RAISE NOTICE ' [Savings] Deleted Accounts & Transactions';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE ' [Savings] Cleanup failed: %', SQLERRM;
        END;
    END IF;

    -- E. MODULE LAINNYA (SAFE BLOCKS)
    BEGIN
        DELETE FROM marketplace_transactions WHERE member_id = ANY(v_member_ids);
        RAISE NOTICE ' [Marketplace] Deleted Transactions';
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE '? [Marketplace] Table not found, skipping...';
    END;

    BEGIN
        DELETE FROM pos_transactions WHERE member_id = ANY(v_member_ids);
        RAISE NOTICE ' [POS] Deleted Transactions';
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE '? [POS] Table not found, skipping...';
    END;

    -- F. MODULE MEMBER
    BEGIN
        DELETE FROM user_role WHERE member_id = ANY(v_member_ids);
        DELETE FROM member WHERE id = ANY(v_member_ids);
        RAISE NOTICE ' [Core] Deleted Members & Roles';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE ' [Core] Cleanup failed: %', SQLERRM;
    END;

    RAISE NOTICE ' CLEANUP COMPLETE ';

END $$;
