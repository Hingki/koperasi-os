import { SupabaseClient } from '@supabase/supabase-js';
import { LedgerService } from './ledger-service';
import { AccountCode } from '@/lib/types/ledger';
import { NotificationService } from './notification-service';

export interface LoanType {
  id: string;
  koperasi_id: string;
  name: string;
  description?: string;
  interest_rate: number;
  max_amount: number;
  admin_fee: number;
  tenor_months: number;
  is_active: boolean;
}

export interface LoanApplication {
  id: string;
  koperasi_id: string;
  member_id: string;
  loan_type_id: string;
  amount: number;
  purpose?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'disbursed' | 'paid_off' | 'defaulted';
  applied_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  disbursed_at?: string;
  notes?: string;
  loan_type?: LoanType;
  member?: {
    id: string;
    name: string;
    member_no: string;
  };
  repayments?: LoanRepayment[];
}

export interface LoanRepayment {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  amount_principal: number;
  amount_interest: number;
  amount_total: number;
  amount_paid: number;
  penalty_amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  paid_at?: string;
  notes?: string;
}

export class LoanService {
  private ledgerService: LedgerService;

  constructor(private supabase: SupabaseClient) {
    this.ledgerService = new LedgerService(supabase);
  }

  async getLoanTypes(koperasiId: string): Promise<LoanType[]> {
    // Map loan_products to LoanType interface
    const { data, error } = await this.supabase
      .from('loan_products')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    
    return data.map((item: any) => ({
      id: item.id,
      koperasi_id: item.koperasi_id,
      name: item.name,
      description: item.description,
      interest_rate: item.interest_rate,
      max_amount: item.max_amount,
      admin_fee: 0, // Not in loan_products, defaulting to 0
      tenor_months: item.max_tenor_months, // Mapping max_tenor to tenor
      is_active: item.is_active
    }));
  }

  async getLoanApplications(koperasiId: string): Promise<LoanApplication[]> {
    const { data, error } = await this.supabase
      .from('loan_applications')
      .select(`
        *,
        product:loan_products(*),
        member:member(id, nama_lengkap, nomor_anggota)
      `)
      .eq('koperasi_id', koperasiId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((item: any) => ({
      id: item.id,
      koperasi_id: item.koperasi_id,
      member_id: item.member_id,
      loan_type_id: item.product_id, // Map product_id to loan_type_id
      amount: item.amount,
      purpose: item.purpose,
      status: item.status,
      applied_at: item.created_at, // Map created_at to applied_at
      reviewed_by: item.workflow_metadata?.reviewed_by, // Extract if available
      reviewed_at: item.workflow_metadata?.reviewed_at,
      disbursed_at: item.disbursed_at,
      notes: item.workflow_metadata?.notes,
      loan_type: {
        id: item.product.id,
        koperasi_id: item.product.koperasi_id,
        name: item.product.name,
        description: item.product.description,
        interest_rate: item.product.interest_rate,
        max_amount: item.product.max_amount,
        admin_fee: 0,
        tenor_months: item.product.max_tenor_months,
        is_active: item.product.is_active
      },
      member: {
        id: item.member.id,
        name: item.member.nama_lengkap, // Map nama_lengkap
        member_no: item.member.nomor_anggota // Map nomor_anggota
      }
    }));
  }

  async getMemberLoans(memberId: string): Promise<LoanApplication[]> {
    // This is trickier because repayments are in a separate table linked via loans table
    // For now, just return applications
    const { data, error } = await this.supabase
      .from('loan_applications')
      .select(`
        *,
        product:loan_products(*)
      `)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return data.map((item: any) => ({
      id: item.id,
      koperasi_id: item.koperasi_id,
      member_id: item.member_id,
      loan_type_id: item.product_id,
      amount: item.amount,
      purpose: item.purpose,
      status: item.status,
      applied_at: item.created_at,
      loan_type: {
        id: item.product.id,
        name: item.product.name,
        interest_rate: item.product.interest_rate,
        // ... partial mapping
      }
    })) as any;
  }

  async applyForLoan(data: {
    koperasi_id: string;
    member_id: string;
    loan_type_id: string;
    amount: number;
    tenor_months?: number;
    purpose: string;
    created_by: string;
  }) {
    // 1. Get Loan Product limits
    const { data: product } = await this.supabase
        .from('loan_products')
        .select('*')
        .eq('id', data.loan_type_id)
        .single();
    
    if (!product) throw new Error('Jenis pinjaman tidak ditemukan');
    if (data.amount > product.max_amount) throw new Error(`Jumlah melebihi batas maksimal ${product.max_amount}`);
    
    const tenor = data.tenor_months || product.max_tenor_months;
    if (tenor > product.max_tenor_months) throw new Error(`Tenor melebihi batas maksimal ${product.max_tenor_months} bulan`);

    // 2. Insert Application
    const { data: application, error } = await this.supabase
      .from('loan_applications')
      .insert({
        koperasi_id: data.koperasi_id,
        member_id: data.member_id,
        product_id: data.loan_type_id, // Map to product_id
        amount: data.amount,
        tenor_months: tenor,
        purpose: data.purpose,
        status: 'submitted', // Map 'draft' -> 'submitted' directly for now
        created_by: data.created_by
      })
      .select()
      .single();

    if (error) throw error;
    return application;
  }

  async reviewApplication(id: string, status: 'approved' | 'rejected', notes: string, reviewerId: string) {
    // Update workflow_metadata jsonb
    const { data, error } = await this.supabase
      .from('loan_applications')
      .update({
        status,
        workflow_metadata: {
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
            notes
        }
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (status === 'approved' && data?.member_id) {
      const notifier = new NotificationService(this.supabase);
      const title = 'Pengajuan Pinjaman Disetujui';
      const message = 'Pengajuan pinjaman Anda telah disetujui. Silakan menunggu proses pencairan.';
      try {
        await notifier.createNotification(data.member_id, title, message);
      } catch {}
    }
    return data;
  }

  async disburseLoan(id: string, disburserId: string) {
    // 1. Fetch Application & Product
    const { data: application } = await this.supabase
        .from('loan_applications')
        .select(`*, product:loan_products(*)`)
        .eq('id', id)
        .single();
    
    if (!application) throw new Error('Application not found');
    if (application.status !== 'approved') throw new Error('Pinjaman harus disetujui sebelum dicairkan');

    const amount = application.amount;
    const interestRate = application.product.interest_rate;
    const tenorMonths = application.tenor_months;
    const interestTotal = amount * (interestRate / 100) * (tenorMonths / 12); // Simple interest estimate

    // 2. Create Active Loan Record
    const startDate = new Date();
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + tenorMonths);

    const { data: loan, error: loanError } = await this.supabase
        .from('loans')
        .insert({
            koperasi_id: application.koperasi_id,
            application_id: application.id,
            member_id: application.member_id,
            product_id: application.product_id,
            loan_code: `L-${Date.now()}`, // Simple code generation
            principal_amount: amount,
            interest_rate: interestRate,
            interest_type: 'flat', // Default from product or hardcoded
            total_interest: interestTotal,
            total_amount_repayable: amount + interestTotal,
            remaining_principal: amount,
            status: 'active',
            start_date: startDate.toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
            created_by: disburserId
        })
        .select()
        .single();

    if (loanError) throw loanError;

    // 3. Generate Schedule
    await this.generateRepaymentSchedule(loan, tenorMonths);

    // 4. Update Application Status
    await this.supabase
        .from('loan_applications')
        .update({
            status: 'disbursed',
            disbursed_at: new Date().toISOString()
        })
        .eq('id', id);

    // 5. Accounting Journal
    await this.ledgerService.recordTransaction({
        koperasi_id: application.koperasi_id,
        tx_type: 'loan_disbursement',
        tx_reference: loan.id,
        account_debit: AccountCode.LOAN_RECEIVABLE_FLAT,
        account_credit: AccountCode.CASH_ON_HAND,
        amount: amount,
        description: `Pencairan Pinjaman #${loan.loan_code}`,
        source_table: 'loans',
        source_id: loan.id,
        created_by: disburserId
    });

    return true;
  }

  async generateRepaymentSchedule(loan: any, months: number) {
    const amount = loan.principal_amount;
    const ratePerMonth = loan.interest_rate / 12 / 100;
    
    // Flat Rate Calculation
    const principalPerMonth = amount / months;
    const interestPerMonth = amount * ratePerMonth;
    const totalPerMonth = principalPerMonth + interestPerMonth;

    const schedule = [];
    let currentDate = new Date(loan.start_date);

    for (let i = 1; i <= months; i++) {
        currentDate.setMonth(currentDate.getMonth() + 1);
        schedule.push({
            koperasi_id: loan.koperasi_id,
            loan_id: loan.id,
            member_id: loan.member_id,
            installment_number: i,
            due_date: currentDate.toISOString().split('T')[0],
            principal_portion: principalPerMonth,
            interest_portion: interestPerMonth,
            total_installment: totalPerMonth,
            status: 'pending'
        });
    }

    const { error } = await this.supabase
        .from('loan_repayment_schedule')
        .insert(schedule);
    
    if (error) throw error;
  }

  async recordRepayment(
    scheduleId: string, 
    amountPaid: number, 
    recorderId: string
  ) {
    // 1. Get Schedule Item
    const { data: schedule, error: scheduleError } = await this.supabase
        .from('loan_repayment_schedule')
        .select('*, loan:loans(*)')
        .eq('id', scheduleId)
        .single();
    
    if (scheduleError || !schedule) throw new Error('Schedule not found');
    if (schedule.status === 'paid') throw new Error('Installment already paid');

    // 2. Validate Payment
    const newPaidAmount = (schedule.paid_amount || 0) + amountPaid;
    let newStatus = 'partial';
    if (newPaidAmount >= schedule.total_installment) {
        newStatus = 'paid';
    }

    // 3. Update Schedule
    const { error: updateError } = await this.supabase
        .from('loan_repayment_schedule')
        .update({
            paid_amount: newPaidAmount,
            paid_at: new Date().toISOString(),
            status: newStatus
        })
        .eq('id', scheduleId);

    if (updateError) throw updateError;

    // 4. Update Loan Balance (Principal reduction)
    // We assume proportional payment for accounting:
    // Ratio = PrincipalPortion / TotalInstallment
    const ratio = schedule.principal_portion / schedule.total_installment;
    const principalPaid = amountPaid * ratio;
    const interestPaid = amountPaid - principalPaid;

    const { data: loan } = await this.supabase
        .from('loans')
        .select('remaining_principal, status')
        .eq('id', schedule.loan_id)
        .single();
        
    if (!loan) throw new Error('Loan not found');

    const newRemaining = loan.remaining_principal - principalPaid;
    const loanStatus = newRemaining <= 100 ? 'paid' : 'active'; // Tolerance for rounding
    
    await this.supabase
        .from('loans')
        .update({
            remaining_principal: newRemaining,
            status: loanStatus
        })
        .eq('id', schedule.loan_id);

    // 5. Accounting
    // 5a. Principal
    if (principalPaid > 0) {
        await this.ledgerService.recordTransaction({
            koperasi_id: schedule.koperasi_id,
            tx_type: 'loan_repayment',
            tx_reference: scheduleId,
            account_debit: AccountCode.CASH_ON_HAND,
            account_credit: AccountCode.LOAN_RECEIVABLE_FLAT,
            amount: principalPaid,
            description: `Angsuran Pokok Pinjaman #${schedule.loan.loan_code} (${schedule.installment_number})`,
            source_table: 'loan_repayment_schedule',
            source_id: scheduleId,
            created_by: recorderId
        });
    }

    // 5b. Interest
    if (interestPaid > 0) {
        await this.ledgerService.recordTransaction({
            koperasi_id: schedule.koperasi_id,
            tx_type: 'loan_repayment',
            tx_reference: scheduleId,
            account_debit: AccountCode.CASH_ON_HAND,
            account_credit: AccountCode.INTEREST_INCOME_LOAN,
            amount: interestPaid,
            description: `Pendapatan Bunga Pinjaman #${schedule.loan.loan_code} (${schedule.installment_number})`,
            source_table: 'loan_repayment_schedule',
            source_id: scheduleId,
            created_by: recorderId
        });
    }

    return true;
  }

  // Need to update getLoanDetail to join all these tables
  async getLoanDetail(id: string) {
     // Fetch application
     const { data: application } = await this.supabase
        .from('loan_applications')
        .select(`
            *,
            product:loan_products(*),
            member:member(id, nama_lengkap, nomor_anggota, phone, alamat_lengkap),
            loans(*)
        `)
        .eq('id', id)
        .single();

     if (!application) return null;

     let repayments: any[] = [];
     if (application.loans && application.loans.length > 0) {
        // Fetch schedule from active loan
        const { data: schedule } = await this.supabase
            .from('loan_repayment_schedule')
            .select('*')
            .eq('loan_id', application.loans[0].id)
            .order('installment_number');
        repayments = schedule || [];
     }

     return {
        id: application.id,
        koperasi_id: application.koperasi_id,
        member_id: application.member_id,
        loan_type_id: application.product_id,
        amount: application.amount,
        purpose: application.purpose,
        status: application.status,
        applied_at: application.created_at,
        disbursed_at: application.disbursed_at,
        loan_type: {
            id: application.product.id,
            name: application.product.name,
            tenor_months: application.product.max_tenor_months,
            interest_rate: application.product.interest_rate
        },
        member: {
            id: application.member.id,
            name: application.member.nama_lengkap,
            member_no: application.member.nomor_anggota,
            phone: application.member.phone,
            address: application.member.alamat_lengkap
        },
        repayments: repayments.map(r => ({
            id: r.id,
            loan_id: r.loan_id,
            installment_number: r.installment_number,
            due_date: r.due_date,
            amount_principal: r.principal_portion,
            amount_interest: r.interest_portion,
            amount_total: r.total_installment,
            amount_paid: r.paid_amount,
            status: r.status
        }))
     };
  }
}
