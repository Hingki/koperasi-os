
import { createClient } from '@/lib/supabase/client';

export type VirtualAccount = {
    id: string;
    koperasi_id: string;
    member_id: string;
    bank_code: string;
    va_number: string;
    type: 'savings' | 'loan' | 'transaction';
    savings_account_id?: string;
    loan_id?: string;
    name: string;
    is_active: boolean;
};

export class VirtualAccountService {
    private supabase;

    constructor(supabaseClient?: any) {
        this.supabase = supabaseClient || createClient();
    }

    // Generate VA Number
    // Format: BankPrefix (3) + KoperasiCode (4) + MemberPhoneSuffix (9) or Random
    // Simplified: BankPrefix + MemberPhone
    private generateVANumber(bankCode: string, phoneNumber: string): string {
        const prefixes: Record<string, string> = {
            'BCA': '88000',
            'BRI': '88100',
            'BNI': '88200',
            'MANDIRI': '88300'
        };
        const prefix = prefixes[bankCode] || '88999';
        // Clean phone number (remove +62 or 0, take last 10-12 digits)
        const cleanPhone = phoneNumber.replace(/\D/g, '').replace(/^62/, '0');
        // If phone starts with 0, remove it for VA usually, or keep it.
        // Let's standard: Prefix + Phone (without leading 0)
        const phoneSuffix = cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone;
        
        return `${prefix}${phoneSuffix}`;
    }

    async getMemberVAs(memberId: string) {
        const { data, error } = await this.supabase
            .from('virtual_accounts')
            .select('*')
            .eq('member_id', memberId)
            .eq('is_active', true);
        
        if (error) throw error;
        return data as VirtualAccount[];
    }

    async createSavingsVA(memberId: string, koperasiId: string, savingsAccountId: string, bankCode: string, phoneNumber: string) {
        // Check existing
        const { data: existing } = await this.supabase
            .from('virtual_accounts')
            .select('*')
            .eq('savings_account_id', savingsAccountId)
            .eq('bank_code', bankCode)
            .single();

        if (existing) return existing;

        const vaNumber = this.generateVANumber(bankCode, phoneNumber);
        
        const { data, error } = await this.supabase
            .from('virtual_accounts')
            .insert({
                koperasi_id: koperasiId,
                member_id: memberId,
                bank_code: bankCode,
                va_number: vaNumber,
                type: 'savings',
                savings_account_id: savingsAccountId,
                name: `VA Simpanan (${bankCode})`
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
    
    // Simulate Payment Callback (Server Action logic usually, but here as service)
    async simulatePayment(vaNumber: string, amount: number) {
        // 1. Find VA
        const { data: va } = await this.supabase
            .from('virtual_accounts')
            .select('*')
            .eq('va_number', vaNumber)
            .single();
            
        if (!va) throw new Error('Virtual Account not found');

        // 2. Create Payment Transaction Record
        const { data: tx, error: txError } = await this.supabase
            .from('payment_transactions')
            .insert({
                koperasi_id: va.koperasi_id,
                transaction_type: va.type === 'savings' ? 'savings_deposit' : 'loan_payment',
                reference_id: va.savings_account_id || va.loan_id || va.id, // Fallback
                payment_method: 'va',
                payment_provider: 'mock',
                amount: amount,
                status: 'success', // Auto success for simulation
                va_number: vaNumber,
                description: `Payment to ${va.name}`,
                created_by: null // System
            })
            .select()
            .single();

        if (txError) throw txError;

        // 3. Process Business Logic (Deposit/Loan)
        if (va.type === 'savings' && va.savings_account_id) {
            // Call Savings Service (Need to be imported or handled via API)
            // Since this is client/shared code, we might need to call an Action.
            // But for now, we assume this runs in a context where we can trigger the logic.
            // Actually, best to return the TX and let the UI/Controller call the action.
        }

        return tx;
    }
}
