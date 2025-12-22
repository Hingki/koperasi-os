import { createClient } from '@/lib/supabase/server';
import { CustomerManager } from '@/components/retail/customer-manager';
import { redirect } from 'next/navigation';

export default async function RetailCustomersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const koperasiId = user.user_metadata?.koperasi_id;
  if (!koperasiId) redirect('/dashboard');

  const { data: customers } = await supabase
    .from('retail_customers')
    .select('*')
    .eq('koperasi_id', koperasiId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pelanggan Toko</h1>
        <p className="text-sm text-slate-500">Kelola data pelanggan non-anggota</p>
      </div>
      
      <CustomerManager initialCustomers={customers || []} koperasiId={koperasiId} />
    </div>
  );
}
