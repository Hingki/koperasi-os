'use server';

import { createClient } from '@/lib/supabase/server';
import { VirtualAccountService } from '@/lib/services/virtual-account';
import { SavingsService } from '@/lib/services/savings-service';
import { LoanService } from '@/lib/services/loan-service';
import { AccountCode } from '@/lib/types/ledger';
import { revalidatePath } from 'next/cache';

export async function createSavingsVA(savingsAccountId: string, bankCode: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: member } = await supabase
        .from('member')
        .select('id, koperasi_id, phone')
        .eq('user_id', user.id)
        .single();
    
    if (!member) return { error: 'Member not found' };

    const service = new VirtualAccountService(supabase);
    try {
        const va = await service.createSavingsVA(
            member.id, 
            member.koperasi_id, 
            savingsAccountId, 
            bankCode, 
            member.phone || '080000000000'
        );
        revalidatePath('/member/digital-payment');
        return { success: true, data: va };
    } catch (err: any) {
        console.error('Create VA Error:', err);
        return { error: err.message };
    }
}

export async function createLoanVA(loanId: string, bankCode: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: member } = await supabase.from('member').select('id, koperasi_id, phone').eq('user_id', user.id).single();
    if (!member) return { error: 'Member not found' };

    const service = new VirtualAccountService(supabase);
    try {
        // Logic for Loan VA creation
        // We reuse createSavingsVA logic but map to loan
        // Need to extend VirtualAccountService or call insert directly
        
        // Let's implement directly here or extend service? 
        // Better to check if existing first
        const { data: existing } = await supabase
            .from('virtual_accounts')
            .select('*')
            .eq('loan_id', loanId)
            .eq('bank_code', bankCode)
            .single();

        if (existing) return { success: true, data: existing };

        // Generate VA Number (Prefix + Phone)
        // Reuse service method if possible or duplicate simple logic
        // 88[Code][Phone]
        // Let's use service logic via public method if I expose it, or just replicate
        const prefixes: Record<string, string> = { 'BCA': '88000', 'BRI': '88100', 'BNI': '88200', 'MANDIRI': '88300' };
        const prefix = prefixes[bankCode] || '88999';
        const cleanPhone = (member.phone || '000').replace(/\D/g, '').replace(/^62/, '0');
        const phoneSuffix = cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone;
        // Add a suffix for Loan? e.g. '1' at end? Or just rely on uniqueness. 
        // If user has Savings VA on BCA and Loan VA on BCA, they collide if same phone suffix.
        // Solution: Different Prefix for Loan? Or append index?
        // Let's assume: Savings = Prefix + Phone. Loan = Prefix + Phone + '1'? 
        // Or simply: 77[Code][Phone] for Loans.
        
        const loanPrefix = prefix.replace('88', '77'); // 77000...
        const vaNumber = `${loanPrefix}${phoneSuffix}`;

        const { data: va, error } = await supabase
            .from('virtual_accounts')
            .insert({
                koperasi_id: member.koperasi_id,
                member_id: member.id,
                bank_code: bankCode,
                va_number: vaNumber,
                type: 'loan',
                loan_id: loanId,
                name: `VA Angsuran (${bankCode})`
            })
            .select()
            .single();

        if (error) throw error;
        revalidatePath('/member/digital-payment');
        return { success: true, data: va };

    } catch (err: any) {
        console.error('Create Loan VA Error:', err);
        return { error: err.message };
    }
}

export async function processVAPayment(vaNumber: string, amount: number) {
    const supabase = await createClient();
    const service = new VirtualAccountService(supabase);
    
    try {
        // 1. Record Payment TX
        const tx = await service.simulatePayment(vaNumber, amount);
        
        // 2. Execute Business Logic based on VA Type
        const { data: va } = await supabase.from('virtual_accounts').select('*').eq('va_number', vaNumber).single();
        
        if (va.type === 'savings' && va.savings_account_id) {
            const savingsService = new SavingsService(supabase);
            await savingsService.processTransaction(
                va.savings_account_id,
                amount,
                'deposit',
                va.member_id,
                `Topup via VA ${va.bank_code} (${vaNumber})`
            );
        } else if (va.type === 'loan' && va.loan_id) {
            const loanService = new LoanService(supabase);
            
            // Map Bank Code to Account Code
            const bankAccountMap: Record<string, string> = {
                'BCA': AccountCode.BANK_BCA,
                'BRI': AccountCode.BANK_BRI,
                'MANDIRI': AccountCode.BANK_BCA, // Fallback as we don't have MANDIRI in AccountCode yet
                'BNI': AccountCode.BANK_BCA      // Fallback
            };
            const targetAccount = bankAccountMap[va.bank_code] || AccountCode.BANK_BCA;

            // Process Loan Repayment
            // Note: we need a user ID for 'recorderId'. 
            // In a real webhook, this is a system user. 
            // Here, we can use the member_id (self-payment) or a specific system ID.
            // Using member_id is safe for audit here.
            await loanService.processPaymentByLoanId(
                va.loan_id,
                amount,
                va.member_id,
                targetAccount
            );
        }
        
        return { success: true, message: 'Payment processed successfully', transactionId: tx.id };
    } catch (err: any) {
        console.error('Process VA Payment Error:', err);
        return { error: err.message };
    }
}

export async function getMemberVAs() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: member } = await supabase
        .from('member')
        .select('id')
        .eq('user_id', user.id)
        .single();
    
    if (!member) return [];

    const service = new VirtualAccountService(supabase);
    return await service.getMemberVAs(member.id);
}
