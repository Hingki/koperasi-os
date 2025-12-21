import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function MySavingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: member } = await supabase.from('member').select('id').eq('user_id', user.id).single();
  if (!member) return <div>Member not found</div>;

  const { data: accounts } = await supabase
    .from('savings_accounts')
    .select(`
        *,
        product:savings_products(name, type)
    `)
    .eq('member_id', member.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
       <h1 className="text-2xl font-bold tracking-tight">My Savings</h1>
       
       <div className="space-y-4">
            {accounts?.map((acc) => (
                <div key={acc.id} className="bg-white p-5 rounded-xl border shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-8 -mt-8 z-0 opacity-50"></div>
                    
                    <div className="relative z-10">
                        <p className="text-sm text-slate-500 font-medium mb-1">{acc.product.name}</p>
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(acc.balance)}
                        </h3>
                        <div className="flex justify-between items-center text-xs text-slate-500 border-t pt-3">
                            <span>Account No.</span>
                            <span className="font-mono">{acc.account_number}</span>
                        </div>
                    </div>
                </div>
            ))}
            {accounts?.length === 0 && (
                <div className="text-center p-8 text-slate-500">
                    You have no savings accounts.
                </div>
            )}
       </div>
    </div>
  );
}
