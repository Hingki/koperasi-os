import { createClient } from '@/lib/supabase/server';
import { PaymentSourcesManager } from '@/components/settings/payment-sources-manager';
import { PaymentSource } from '@/lib/types/master';

export default async function PaymentSourcesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const koperasiId = user.user_metadata?.koperasi_id;
  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);

  let sources: PaymentSource[] = [];
  let unitOptions: { id: string; nama_unit: string }[] = [];

  if (isValidUUID) {
    const { data: s } = await supabase
      .from('payment_sources')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .order('name');
    sources = (s as PaymentSource[]) || [];

    const { data: units } = await supabase
      .from('unit_usaha')
      .select('id, nama_unit')
      .eq('koperasi_id', koperasiId)
      .eq('is_active', true)
      .order('nama_unit');
    unitOptions = (units as { id: string; nama_unit: string }[]) || [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sumber Bayar</h1>
        <p className="text-slate-500">Kelola daftar sumber pembayaran.</p>
      </div>
      <PaymentSourcesManager sources={sources} unitUsahaOptions={unitOptions} />
    </div>
  );
}
