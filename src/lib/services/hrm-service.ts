import { SupabaseClient } from '@supabase/supabase-js';
import { LedgerService } from './ledger-service';
import { AccountingService } from './accounting-service';
import { AccountCode } from '@/lib/types/ledger';

export class HrmService {
  private supabase: SupabaseClient;
  private ledgerService: LedgerService;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.ledgerService = new LedgerService(supabase);
  }

  // --- Employees ---

  async getEmployees(koperasiId: string) {
    const { data, error } = await this.supabase
      .from('employees')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .eq('status', 'active')
      .order('full_name');

    if (error) throw error;
    return data;
  }

  async getEmployeeByUserId(userId: string) {
    const { data, error } = await this.supabase
      .from('employees')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // It's okay if not found (user might not be an employee)
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async createEmployee(employee: {
    koperasi_id: string;
    full_name: string;
    email?: string;
    phone?: string;
    job_title: string;
    employee_no: string;
    user_id?: string; // Optional linkage to auth user
  }) {
    const { data, error } = await this.supabase
      .from('employees')
      .insert(employee)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // --- Attendance ---

  async getTodayAttendance(koperasiId: string) {
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = `${today}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    const { data, error } = await this.supabase
      .from('hrm_attendance')
      .select('*, employee:employees(full_name, job_title)')
      .eq('koperasi_id', koperasiId)
      .gte('check_in', startOfDay)
      .lte('check_in', endOfDay);

    if (error) throw error;
    return data;
  }

  async checkIn(koperasiId: string, employeeId: string, location?: { lat: number, long: number }) {
    // Check if already checked in today
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await this.supabase
        .from('hrm_attendance')
        .select('id')
        .eq('employee_id', employeeId)
        .gte('check_in', `${today}T00:00:00.000Z`)
        .single();

    if (existing) throw new Error('Already checked in today');

    const { data, error } = await this.supabase
      .from('hrm_attendance')
      .insert({
        koperasi_id: koperasiId,
        employee_id: employeeId,
        check_in: new Date().toISOString(),
        status: 'present',
        location_lat: location?.lat,
        location_long: location?.long
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async checkOut(attendanceId: string) {
    const { data, error } = await this.supabase
      .from('hrm_attendance')
      .update({
        check_out: new Date().toISOString()
      })
      .eq('id', attendanceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // --- Payroll ---

  async createPayroll(payroll: {
    koperasi_id: string;
    employee_id: string;
    period_month: number;
    period_year: number;
    basic_salary: number;
    allowances: number;
    deductions: number;
  }) {
    const net_salary = payroll.basic_salary + payroll.allowances - payroll.deductions;
    
    const { data, error } = await this.supabase
      .from('hrm_payroll')
      .insert({
        ...payroll,
        net_salary,
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async processPayrollPayment(payrollId: string, paidByUserId: string) {
    // 1. Get Payroll Details
    const { data: payroll, error } = await this.supabase
        .from('hrm_payroll')
        .select('*, employee:employees(full_name)')
        .eq('id', payrollId)
        .single();
    
    if (error) throw error;
    if (payroll.status === 'paid') throw new Error('Payroll already paid');

    // 2. Update Status
    await this.supabase
        .from('hrm_payroll')
        .update({ 
            status: 'paid',
            payment_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', payrollId);

    // 3. Record Ledger (Expense)
    // Debit: Operational Expense (Gaji), Credit: Cash/Bank
    
    const expenseAccId = await AccountingService.getAccountIdByCode(payroll.koperasi_id, AccountCode.OPERATIONAL_EXPENSE, this.supabase);
    const cashAccId = await AccountingService.getAccountIdByCode(payroll.koperasi_id, AccountCode.CASH_ON_HAND, this.supabase);

    if (expenseAccId && cashAccId) {
        await AccountingService.postJournal({
            koperasi_id: payroll.koperasi_id,
            business_unit: 'HRM', // or 'MANAGEMENT'
            transaction_date: new Date().toISOString().split('T')[0],
            description: `Gaji ${payroll.employee.full_name} Periode ${payroll.period_month}/${payroll.period_year}`,
            reference_id: payroll.id,
            reference_type: 'PAYROLL_PAYMENT',
            lines: [
                { account_id: expenseAccId, debit: payroll.net_salary, credit: 0 },
                { account_id: cashAccId, debit: 0, credit: payroll.net_salary }
            ]
        }, this.supabase);
    }

    return true;
  }
}
