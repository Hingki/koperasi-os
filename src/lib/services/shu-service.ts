import { SupabaseClient } from '@supabase/supabase-js';
import { ReportService } from './report-service';
import { LedgerService } from './ledger-service';

export interface SHUDistributionConfig {
  cadangan_koperasi: number; // e.g. 0.40 (40%)
  jasa_anggota: number;      // e.g. 0.25 (25%)
  jasa_modal: number;        // e.g. 0.20 (20%)
  dana_pengurus: number;     // e.g. 0.05 (5%)
  dana_karyawan: number;     // e.g. 0.05 (5%)
  dana_pendidikan: number;   // e.g. 0.025 (2.5%)
  dana_sosial: number;       // e.g. 0.025 (2.5%)
}

export const DEFAULT_SHU_CONFIG: SHUDistributionConfig = {
  cadangan_koperasi: 0.40,
  jasa_anggota: 0.25,
  jasa_modal: 0.20,
  dana_pengurus: 0.05,
  dana_karyawan: 0.05,
  dana_pendidikan: 0.025,
  dana_sosial: 0.025
};

export class SHUService {
  private reportService: ReportService;

  constructor(private supabase: SupabaseClient) {
    this.reportService = new ReportService(supabase);
  }

  /**
   * Calculates the projected SHU distribution for a given period.
   */
  async calculateSHUDistribution(koperasiId: string, year: number, config: SHUDistributionConfig = DEFAULT_SHU_CONFIG) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    // 1. Get Net Income
    const incomeStatement = await this.reportService.getIncomeStatement(koperasiId, startDate, endDate);
    const netIncome = incomeStatement.summary.net_income;

    if (netIncome <= 0) {
      return {
        net_income: netIncome,
        distribution: null,
        message: 'No profit to distribute'
      };
    }

    // 2. Calculate Allocations
    const distribution = {
      cadangan_koperasi: netIncome * config.cadangan_koperasi,
      jasa_anggota: netIncome * config.jasa_anggota,
      jasa_modal: netIncome * config.jasa_modal,
      dana_pengurus: netIncome * config.dana_pengurus,
      dana_karyawan: netIncome * config.dana_karyawan,
      dana_pendidikan: netIncome * config.dana_pendidikan,
      dana_sosial: netIncome * config.dana_sosial
    };

    return {
      net_income: netIncome,
      config,
      distribution
    };
  }

  /**
   * Calculates Individual Member SHU
   * Requires:
   * - Total Member Savings (Simpanan Pokok + Wajib)
   * - Total Member Transactions (Gross Margin contribution or Volume)
   */
  async calculateMemberSHU(koperasiId: string, year: number, memberId: string, config: SHUDistributionConfig = DEFAULT_SHU_CONFIG) {
    // 1. Get Global Distribution
    const globalSHU = await this.calculateSHUDistribution(koperasiId, year, config);
    if (!globalSHU.distribution) return { total_shu: 0, details: null };

    const totalJasaModal = globalSHU.distribution.jasa_modal;
    const totalJasaAnggota = globalSHU.distribution.jasa_anggota;

    // 2. Calculate Member's Share of Capital (Modal)
    // Fetch total savings of ALL members
    // Fetch member's savings
    
    // Total Savings (Pokok + Wajib)
    // We can aggregate from `savings_accounts` where product type is principal/mandatory
    const { data: savingsStats, error: savingsError } = await this.supabase
        .from('savings_accounts')
        .select('balance, member_id, product:savings_products!inner(type)')
        .eq('koperasi_id', koperasiId)
        .in('product.type', ['pokok', 'wajib']);

    if (savingsError) throw savingsError;

    const totalCapital = savingsStats.reduce((sum, acc) => sum + acc.balance, 0);
    const memberCapital = savingsStats
        .filter(acc => acc.member_id === memberId)
        .reduce((sum, acc) => sum + acc.balance, 0);

    const capitalShare = totalCapital > 0 ? (memberCapital / totalCapital) : 0;
    const memberJasaModal = totalJasaModal * capitalShare;

    // 3. Calculate Member's Share of Transactions (Anggota)
    // Usually based on Margin provided by member or Total Shopping amount.
    // For simplicity: Total Shopping Amount in Retail + Interest Paid in Loans
    
    // A. Retail Sales (Jasa Usaha Retail)
    const { data: retailStats } = await this.supabase
        .from('pos_transactions')
        .select('final_amount, member_id')
        .eq('koperasi_id', koperasiId)
        .gte('transaction_date', `${year}-01-01`)
        .lte('transaction_date', `${year}-12-31`)
        .not('member_id', 'is', null);

    const totalRetailSales = retailStats?.reduce((sum, tx) => sum + tx.final_amount, 0) || 0;
    const memberRetailSales = retailStats
        ?.filter(tx => tx.member_id === memberId)
        .reduce((sum, tx) => sum + tx.final_amount, 0) || 0;

    // B. Loan Interest Paid (Jasa Usaha Pinjaman)
    // We sum interest_portion from paid schedules in the current year
    const { data: loanStats } = await this.supabase
        .from('loan_repayment_schedule')
        .select('interest_portion, member_id')
        .eq('koperasi_id', koperasiId)
        .eq('status', 'paid')
        .gte('paid_at', `${year}-01-01T00:00:00.000Z`)
        .lte('paid_at', `${year}-12-31T23:59:59.999Z`);

    const totalLoanInterest = loanStats?.reduce((sum, item) => sum + item.interest_portion, 0) || 0;
    const memberLoanInterest = loanStats
        ?.filter(item => item.member_id === memberId)
        .reduce((sum, item) => sum + item.interest_portion, 0) || 0;

    // Total Transaction Volume (Retail + Loan Interest)
    // Note: Some cooperatives weight them differently, but simple sum is standard start.
    const totalTransactions = totalRetailSales + totalLoanInterest;
    const memberTransactions = memberRetailSales + memberLoanInterest;

    const transactionShare = totalTransactions > 0 ? (memberTransactions / totalTransactions) : 0;
    const memberJasaAnggota = totalJasaAnggota * transactionShare;

    return {
        total_shu: memberJasaModal + memberJasaAnggota,
        details: {
            jasa_modal: memberJasaModal,
            jasa_anggota: memberJasaAnggota,
            member_capital: memberCapital,
            total_capital: totalCapital,
            member_transactions: memberTransactions,
            total_transactions: totalTransactions,
            breakdown: {
                retail_sales: memberRetailSales,
                loan_interest: memberLoanInterest
            }
        }
    };
  }
}
