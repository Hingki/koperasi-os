import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function MyLoansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: member } = await supabase.from('member').select('id').eq('user_id', user.id).single();
  if (!member) return <div>Member not found</div>;

  const { data: loans } = await supabase
    .from('loans')
    .select(`
        *,
        product:loan_products(name)
    `)
    .eq('member_id', member.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
       <h1 className="text-2xl font-bold tracking-tight">My Loans</h1>
       
       <div className="space-y-4">
            {loans?.map((loan) => (
                <div key={loan.id} className="bg-white p-5 rounded-xl border shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="font-bold text-slate-900">{loan.product.name}</h3>
                            <p className="text-xs text-slate-500">{loan.loan_code}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${
                            loan.status === 'active' ? 'bg-green-100 text-green-800' : 
                            loan.status === 'paid' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100'
                        }`}>
                            {loan.status}
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                        <div>
                            <p className="text-slate-500 text-xs">Principal</p>
                            <p className="font-medium">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(loan.principal_amount)}</p>
                        </div>
                         <div>
                            <p className="text-slate-500 text-xs">Remaining</p>
                            <p className="font-medium">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(loan.remaining_principal)}</p>
                        </div>
                    </div>
                </div>
            ))}
            {loans?.length === 0 && (
                <div className="text-center p-8 text-slate-500">
                    You have no loan history.
                </div>
            )}
       </div>
    </div>
  );
}
