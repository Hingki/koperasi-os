import { createClient } from '@/lib/supabase/server';
import { RatForm } from '@/components/rat/rat-form';

export default async function CreateRatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Unauthorized</div>;

  const { data: role } = await supabase
    .from('user_role')
    .select('koperasi_id')
    .eq('user_id', user.id)
    .single();

  if (!role) return <div>No Access</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Buat RAT Baru</h1>
        <p className="text-muted-foreground">Jadwalkan Rapat Anggota Tahunan baru.</p>
      </div>
      <RatForm koperasiId={role.koperasi_id} />
    </div>
  );
}
