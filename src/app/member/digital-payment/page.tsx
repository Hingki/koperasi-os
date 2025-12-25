
import { createClient } from '@/lib/supabase/server';
import { VirtualAccountManager } from './va-manager';
import { getMemberVAs } from '@/lib/actions/digital-payment';
import { redirect } from 'next/navigation';
import { Account } from '../../../lib/types/savings';

import { LoanService } from '@/lib/services/loan-service';

export default async function DigitalPaymentPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    // Get Member ID
    const { data: member } = await supabase
        .from('member')
        .select('id')
        .eq('user_id', user.id)
        .single();
    
    if (!member) redirect('/login');

    // Fetch Savings Accounts
    const { data: accountsData } = await supabase
        .from('savings_accounts')
        .select(`*, product:savings_products(*)`)
        .eq('member_id', member.id)
        .eq('status', 'active');
    
    const accounts = (accountsData || []) as unknown as Account[];

    // Fetch Active Loans
    const loanService = new LoanService(supabase);
    // Note: getMemberLoans returns applications. We need active loans.
    // Let's use direct query for now to get 'loans' table data
    const { data: loansData } = await supabase
        .from('loans')
        .select(`*, product:loan_products(*)`)
        .eq('member_id', member.id)
        .eq('status', 'active');
    
    const loans = (loansData || []);

    // Fetch Existing VAs
    const vas = await getMemberVAs();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Digital Payment</h1>
                <p className="text-slate-500">Kelola Virtual Account untuk kemudahan transaksi.</p>
            </div>
            
            <VirtualAccountManager accounts={accounts} loans={loans} existingVAs={vas} />

            <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <h3 className="font-semibold text-amber-900 mb-2">Simulasi Pembayaran (Development Only)</h3>
                <p className="text-sm text-amber-800 mb-4">
                    Gunakan halaman simulasi untuk mencoba transfer ke VA di atas.
                </p>
                <a 
                    href="/mock-bank/payment" 
                    target="_blank"
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700"
                >
                    Buka Simulator Bank
                </a>
            </div>
        </div>
    );
}
