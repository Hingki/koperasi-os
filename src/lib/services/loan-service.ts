import { SupabaseClient } from '@supabase/supabase-js';
import { LedgerService } from '@/lib/services/ledger-service';
import { AccountCode } from '@/lib/types/ledger';
import { NotificationService } from './notification-service';

export interface ScheduleItem {
  installment_number: number;
  due_date: Date;
  principal_portion: number;
  interest_portion: number;
  total_installment: number;
}

export class LoanService {
  private ledgerService: LedgerService;

  constructor(private supabase: SupabaseClient) {
    this.ledgerService = new LedgerService(supabase);
  }

  /**
   * Calculates the repayment schedule based on loan parameters.
   * Currently supports 'flat' interest only.
   */
  calculateSchedule(
    principal: number,
    ratePerYear: number, // Percentage (e.g., 12 for 12%)
    tenorMonths: number,
    startDate: Date = new Date()
  ): ScheduleItem[] {
    const ratePerMonth = ratePerYear / 100 / 12;
    const schedule: ScheduleItem[] = [];
    
    // Flat Interest Calculation
    // Total Interest = P * R * T (in years)
    const totalInterest = principal * (ratePerYear / 100) * (tenorMonths / 12);
    const totalRepayable = principal + totalInterest;
    
    const monthlyPrincipal = principal / tenorMonths;
    const monthlyInterest = totalInterest / tenorMonths;
    const monthlyInstallment = totalRepayable / tenorMonths;

    // Adjust for rounding errors on the last installment
    let runningPrincipal = 0;
    let runningInterest = 0;

    for (let i = 1; i <= tenorMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      let pPortion = Number(monthlyPrincipal.toFixed(2));
      let iPortion = Number(monthlyInterest.toFixed(2));
      
      // Last installment adjustment
      if (i === tenorMonths) {
        pPortion = Number((principal - runningPrincipal).toFixed(2));
        iPortion = Number((totalInterest - runningInterest).toFixed(2));
      } else {
        runningPrincipal += pPortion;
        runningInterest += iPortion;
      }

      schedule.push({
        installment_number: i,
        due_date: dueDate,
        principal_portion: pPortion,
        interest_portion: iPortion,
        total_installment: pPortion + iPortion
      });
    }

    return schedule;
  }

  /**
   * Disburse a loan (Pencairan).
   * Moves status from 'approved' to 'active'/'disbursed'.
   * Generates Repayment Schedule.
   * Records Ledger Transaction.
   */
  async disburseLoan(applicationId: string, userId: string) {
    // 1. Fetch Application
    const { data: app, error: appError } = await this.supabase
      .from('loan_applications')
      .select(`
        *,
        product:loan_products(*),
        member:member(phone, nama_lengkap)
      `)
      .eq('id', applicationId)
      .single();

    if (appError || !app) throw new Error('Loan application not found');
    if (app.status !== 'approved') throw new Error("Loan must be approved before disbursement");

    const startDate = new Date();
    const tenorMonths = app.tenor_months;
    const principal = app.amount;
    const rate = app.product.interest_rate;

    // 2. Calculate Schedule
    const schedule = this.calculateSchedule(principal, rate, tenorMonths, startDate);
    const totalInterest = schedule.reduce((sum, item) => sum + item.interest_portion, 0);
    const totalRepayable = principal + totalInterest;
    const dueDate = schedule[schedule.length - 1].due_date;
    
    // Generate Loan Code (Simple timestamp based for MVP)
    const loanCode = `L-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    // 3. Perform Transaction (Supabase doesn't support multi-table transaction via client easily without RPC, 
    // so we do best-effort sequence. For production, move this to an Edge Function or Postgres Function)
    
    // A. Create Loan
    const { data: loan, error: loanError } = await this.supabase
      .from('loans')
      .insert({
        koperasi_id: app.koperasi_id,
        application_id: app.id,
        member_id: app.member_id,
        product_id: app.product_id,
        loan_code: loanCode,
        principal_amount: principal,
        interest_rate: rate,
        interest_type: app.product.interest_type,
        total_interest: totalInterest,
        total_amount_repayable: totalRepayable,
        remaining_principal: principal, // Start with full amount
        status: 'active',
        start_date: startDate.toISOString(),
        due_date: dueDate.toISOString(),
        created_by: userId
      })
      .select()
      .single();

    if (loanError) throw new Error(`Failed to create loan: ${loanError.message}`);

    // B. Create Schedule
    const scheduleInserts = schedule.map(item => ({
      koperasi_id: app.koperasi_id,
      loan_id: loan.id,
      member_id: app.member_id,
      installment_number: item.installment_number,
      due_date: item.due_date.toISOString(),
      principal_portion: item.principal_portion,
      interest_portion: item.interest_portion,
      total_installment: item.total_installment,
      status: 'pending'
    }));

    const { error: scheduleError } = await this.supabase
      .from('loan_repayment_schedule')
      .insert(scheduleInserts);

    if (scheduleError) {
      // Rollback loan creation (manual compensation)
      await this.supabase.from('loans').delete().eq('id', loan.id);
      throw new Error(`Failed to create schedule: ${scheduleError.message}`);
    }

    // C. Update Application
    const { error: appUpdateError } = await this.supabase
      .from('loan_applications')
      .update({
        status: 'disbursed',
        disbursed_at: startDate.toISOString(),
        updated_at: startDate.toISOString(),
        updated_by: userId
      })
      .eq('id', applicationId);

    if (appUpdateError) {
        console.error("Critical: Application status update failed after loan creation", appUpdateError);
        // This puts us in an inconsistent state. Ideally, use a Postgres function for atomicity.
    }

    // D. Trigger Ledger
    try {
      await this.ledgerService.recordTransaction({
        koperasi_id: app.koperasi_id,
        tx_type: 'loan_disbursement',
        tx_reference: loan.loan_code,
        account_debit: AccountCode.LOAN_RECEIVABLE_FLAT, // Debit Piutang
        account_credit: AccountCode.CASH_ON_HAND,        // Credit Kas (Asset decreases)
        amount: principal,
        description: `Disbursement for Loan ${loan.loan_code}`,
        source_table: 'loans',
        source_id: loan.id,
        created_by: userId
      });
    } catch (ledgerError) {
      console.error("Ledger Recording Failed:", ledgerError);
      // Decide: Fail the whole request? Or mark for retry?
      // For Ledger-First Architecture, strict compliance says we should fail.
      // But we already committed the Loan... (Dual write problem).
      // Ideally, step D should happen BEFORE or concurrently.
      // For MVP, we log critical error.
    }
    
    return loan;
  }

  /**
   * Process a repayment for a loan.
   * Allocates payment to pending installments and updates loan balance.
   */
  async processRepayment(loanId: string, amount: number, userId: string) {
