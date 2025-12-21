import { SupabaseClient } from '@supabase/supabase-js';
import { AccountCode } from '@/lib/types/ledger';

export interface COASeedItem {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  normal_balance: 'debit' | 'credit';
  level: number;
  is_header: boolean;
  parent_code?: string;
}

export const STANDARD_COA: COASeedItem[] = [
  // 1. ASSETS
  { code: '1-0000', name: 'ASET', type: 'asset', normal_balance: 'debit', level: 1, is_header: true },
  { code: '1-1000', name: 'ASET LANCAR', type: 'asset', normal_balance: 'debit', level: 2, is_header: true, parent_code: '1-0000' },
  { code: AccountCode.CASH_ON_HAND, name: 'Kas Kecil (Cash on Hand)', type: 'asset', normal_balance: 'debit', level: 4, is_header: false, parent_code: '1-1000' },
  { code: AccountCode.BANK_BCA, name: 'Bank BCA', type: 'asset', normal_balance: 'debit', level: 4, is_header: false, parent_code: '1-1000' },
  { code: AccountCode.BANK_BRI, name: 'Bank BRI', type: 'asset', normal_balance: 'debit', level: 4, is_header: false, parent_code: '1-1000' },
  { code: '1-1004', name: 'Bank Mandiri', type: 'asset', normal_balance: 'debit', level: 4, is_header: false, parent_code: '1-1000' },
  
  { code: '1-1300', name: 'PIUTANG', type: 'asset', normal_balance: 'debit', level: 3, is_header: true, parent_code: '1-1000' },
  { code: AccountCode.LOAN_RECEIVABLE_FLAT, name: 'Piutang Pinjaman Flat', type: 'asset', normal_balance: 'debit', level: 4, is_header: false, parent_code: '1-1300' },
  { code: AccountCode.LOAN_RECEIVABLE_EFFECTIVE, name: 'Piutang Pinjaman Efektif', type: 'asset', normal_balance: 'debit', level: 4, is_header: false, parent_code: '1-1300' },
  { code: '1-1303', name: 'Piutang Anggota Lainnya', type: 'asset', normal_balance: 'debit', level: 4, is_header: false, parent_code: '1-1300' },
  { code: '1-1399', name: 'Cadangan Kerugian Piutang', type: 'asset', normal_balance: 'credit', level: 4, is_header: false, parent_code: '1-1300' },

  { code: '1-1400', name: 'PERSEDIAAN', type: 'asset', normal_balance: 'debit', level: 3, is_header: true, parent_code: '1-1000' },
  { code: AccountCode.INVENTORY_MERCHANDISE, name: 'Persediaan Barang Dagang', type: 'asset', normal_balance: 'debit', level: 4, is_header: false, parent_code: '1-1400' },
  { code: '1-1402', name: 'Persediaan Perlengkapan Kantor', type: 'asset', normal_balance: 'debit', level: 4, is_header: false, parent_code: '1-1400' },

  { code: '1-2000', name: 'ASET TIDAK LANCAR', type: 'asset', normal_balance: 'debit', level: 2, is_header: true, parent_code: '1-0000' },
  { code: '1-2100', name: 'ASET TETAP', type: 'asset', normal_balance: 'debit', level: 3, is_header: true, parent_code: '1-2000' },
  { code: '1-2101', name: 'Tanah', type: 'asset', normal_balance: 'debit', level: 4, is_header: false, parent_code: '1-2100' },
  { code: '1-2102', name: 'Bangunan', type: 'asset', normal_balance: 'debit', level: 4, is_header: false, parent_code: '1-2100' },
  { code: '1-2103', name: 'Kendaraan', type: 'asset', normal_balance: 'debit', level: 4, is_header: false, parent_code: '1-2100' },
  { code: '1-2104', name: 'Peralatan Kantor', type: 'asset', normal_balance: 'debit', level: 4, is_header: false, parent_code: '1-2100' },
  { code: '1-2199', name: 'Akumulasi Penyusutan Aset Tetap', type: 'asset', normal_balance: 'credit', level: 4, is_header: false, parent_code: '1-2100' },

  // 2. LIABILITIES
  { code: '2-0000', name: 'KEWAJIBAN', type: 'liability', normal_balance: 'credit', level: 1, is_header: true },
  { code: '2-1000', name: 'KEWAJIBAN JANGKA PENDEK', type: 'liability', normal_balance: 'credit', level: 2, is_header: true, parent_code: '2-0000' },
  { code: AccountCode.SAVINGS_VOLUNTARY, name: 'Simpanan Sukarela', type: 'liability', normal_balance: 'credit', level: 4, is_header: false, parent_code: '2-1000' },
  { code: AccountCode.SAVINGS_MANDATORY, name: 'Simpanan Wajib', type: 'liability', normal_balance: 'credit', level: 4, is_header: false, parent_code: '2-1000' },
  { code: AccountCode.SAVINGS_PRINCIPAL, name: 'Simpanan Pokok', type: 'liability', normal_balance: 'credit', level: 4, is_header: false, parent_code: '2-1000' },
  { code: AccountCode.ACCOUNTS_PAYABLE, name: 'Hutang Usaha', type: 'liability', normal_balance: 'credit', level: 4, is_header: false, parent_code: '2-1000' },
  { code: '2-1200', name: 'Beban Yang Masih Harus Dibayar', type: 'liability', normal_balance: 'credit', level: 4, is_header: false, parent_code: '2-1000' },
  { code: '2-1300', name: 'Hutang Pajak', type: 'liability', normal_balance: 'credit', level: 4, is_header: false, parent_code: '2-1000' },

  { code: '2-2000', name: 'KEWAJIBAN JANGKA PANJANG', type: 'liability', normal_balance: 'credit', level: 2, is_header: true, parent_code: '2-0000' },
  { code: '2-2100', name: 'Hutang Bank Jangka Panjang', type: 'liability', normal_balance: 'credit', level: 4, is_header: false, parent_code: '2-2000' },
  { code: '2-2200', name: 'Modal Penyertaan', type: 'liability', normal_balance: 'credit', level: 4, is_header: false, parent_code: '2-2000' },

  // 3. EQUITY
  { code: '3-0000', name: 'EKUITAS', type: 'equity', normal_balance: 'credit', level: 1, is_header: true },
  { code: '3-1000', name: 'MODAL SENDIRI', type: 'equity', normal_balance: 'credit', level: 2, is_header: true, parent_code: '3-0000' },
  { code: '3-1100', name: 'Cadangan Umum', type: 'equity', normal_balance: 'credit', level: 4, is_header: false, parent_code: '3-1000' },
  { code: '3-1200', name: 'Cadangan Tujuan Risiko', type: 'equity', normal_balance: 'credit', level: 4, is_header: false, parent_code: '3-1000' },
  { code: AccountCode.RETAINED_EARNINGS, name: 'SHU Tahun Lalu (Laba Ditahan)', type: 'equity', normal_balance: 'credit', level: 4, is_header: false, parent_code: '3-1000' },
  { code: '3-1400', name: 'SHU Tahun Berjalan', type: 'equity', normal_balance: 'credit', level: 4, is_header: false, parent_code: '3-1000' },

  // 4. REVENUE
  { code: '4-0000', name: 'PENDAPATAN', type: 'revenue', normal_balance: 'credit', level: 1, is_header: true },
  { code: '4-1000', name: 'PENDAPATAN JASA KEUANGAN', type: 'revenue', normal_balance: 'credit', level: 2, is_header: true, parent_code: '4-0000' },
  { code: AccountCode.INTEREST_INCOME_LOAN, name: 'Pendapatan Bunga Pinjaman', type: 'revenue', normal_balance: 'credit', level: 4, is_header: false, parent_code: '4-1000' },
  { code: AccountCode.ADMIN_FEE_INCOME, name: 'Pendapatan Administrasi', type: 'revenue', normal_balance: 'credit', level: 4, is_header: false, parent_code: '4-1000' },
  { code: AccountCode.PENALTY_INCOME, name: 'Pendapatan Denda', type: 'revenue', normal_balance: 'credit', level: 4, is_header: false, parent_code: '4-1000' },
  
  { code: '4-2000', name: 'PENDAPATAN SEKTOR RIIL', type: 'revenue', normal_balance: 'credit', level: 2, is_header: true, parent_code: '4-0000' },
  { code: AccountCode.SALES_REVENUE, name: 'Pendapatan Penjualan Toko', type: 'revenue', normal_balance: 'credit', level: 4, is_header: false, parent_code: '4-2000' },

  // 5. EXPENSES
  { code: '5-0000', name: 'BEBAN', type: 'expense', normal_balance: 'debit', level: 1, is_header: true },
  { code: '5-1000', name: 'BEBAN OPERASIONAL KEUANGAN', type: 'expense', normal_balance: 'debit', level: 2, is_header: true, parent_code: '5-0000' },
  { code: AccountCode.INTEREST_EXPENSE_SAVINGS, name: 'Beban Bunga Simpanan', type: 'expense', normal_balance: 'debit', level: 4, is_header: false, parent_code: '5-1000' },
  { code: '5-1002', name: 'Beban Jasa Modal Penyertaan', type: 'expense', normal_balance: 'debit', level: 4, is_header: false, parent_code: '5-1000' },

  { code: '5-1100', name: 'BEBAN POKOK PENJUALAN', type: 'expense', normal_balance: 'debit', level: 2, is_header: true, parent_code: '5-0000' },
  { code: AccountCode.COGS, name: 'Harga Pokok Penjualan (HPP)', type: 'expense', normal_balance: 'debit', level: 4, is_header: false, parent_code: '5-1100' },

  { code: '5-2000', name: 'BEBAN OPERASIONAL ORGANISASI', type: 'expense', normal_balance: 'debit', level: 2, is_header: true, parent_code: '5-0000' },
  { code: AccountCode.OPERATIONAL_EXPENSE, name: 'Beban Operasional Umum', type: 'expense', normal_balance: 'debit', level: 4, is_header: false, parent_code: '5-2000' },
  { code: '5-2002', name: 'Beban Gaji & Tunjangan', type: 'expense', normal_balance: 'debit', level: 4, is_header: false, parent_code: '5-2000' },
  { code: '5-2003', name: 'Beban Listrik, Air, Telepon', type: 'expense', normal_balance: 'debit', level: 4, is_header: false, parent_code: '5-2000' },
  { code: '5-2004', name: 'Beban Sewa', type: 'expense', normal_balance: 'debit', level: 4, is_header: false, parent_code: '5-2000' },
  { code: '5-2005', name: 'Beban ATK & Cetakan', type: 'expense', normal_balance: 'debit', level: 4, is_header: false, parent_code: '5-2000' },
  { code: '5-2006', name: 'Beban Penyusutan Aset Tetap', type: 'expense', normal_balance: 'debit', level: 4, is_header: false, parent_code: '5-2000' },
  { code: '5-2007', name: 'Beban Rapat Anggota & Pengurus', type: 'expense', normal_balance: 'debit', level: 4, is_header: false, parent_code: '5-2000' },
  
  { code: '5-9000', name: 'BEBAN LAIN-LAIN', type: 'expense', normal_balance: 'debit', level: 2, is_header: true, parent_code: '5-0000' },
  { code: '5-9001', name: 'Beban Administrasi Bank', type: 'expense', normal_balance: 'debit', level: 4, is_header: false, parent_code: '5-9000' },
];

export async function seedCOA(supabase: SupabaseClient, koperasiId: string) {
  console.log(`🌱 Seeding Chart of Accounts for Koperasi: ${koperasiId}`);
  
  let successCount = 0;
  let failCount = 0;

  for (const account of STANDARD_COA) {
    try {
      // Check if exists
      const { data: existing } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('koperasi_id', koperasiId)
        .eq('account_code', account.code)
        .maybeSingle();

      if (existing) {
        // Update details
        const { error } = await supabase
          .from('chart_of_accounts')
          .update({
            account_name: account.name,
            account_type: account.type,
            normal_balance: account.normal_balance,
            level: account.level,
            is_header: account.is_header,
            parent_code: account.parent_code
          })
          .eq('id', existing.id);
        
        if (error) throw error;
        // console.log(`   Updated: ${account.code} - ${account.name}`);
      } else {
        // Insert
        const { error } = await supabase
          .from('chart_of_accounts')
          .insert({
            koperasi_id: koperasiId,
            account_code: account.code,
            account_name: account.name,
            account_type: account.type,
            normal_balance: account.normal_balance,
            level: account.level,
            is_header: account.is_header,
            parent_code: account.parent_code,
            is_active: true
          });

        if (error) throw error;
        console.log(`   Created: ${account.code} - ${account.name}`);
      }
      successCount++;
    } catch (err: any) {
      console.error(`   ❌ Failed to seed ${account.code}:`, err.message);
      failCount++;
    }
  }

  console.log(`✅ COA Seeding Completed. Success: ${successCount}, Failed: ${failCount}`);
}
