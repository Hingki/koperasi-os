import { createClient } from '@/lib/supabase/server';
import { EmailSettingsForm } from '@/components/settings/email-settings-form';
import { EmailSettings } from '@/lib/types/master';

export default async function EmailSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const koperasiId = user.user_metadata?.koperasi_id;
  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);

  let initial: EmailSettings | null = null;
  if (isValidUUID) {
    const { data } = await supabase
      .from('email_settings')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .limit(1)
      .maybeSingle();
    initial = (data as EmailSettings) || null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan Email</h1>
        <p className="text-slate-500">Konfigurasi SMTP untuk notifikasi.</p>
      </div>
      <EmailSettingsForm initialData={initial} />
    </div>
  );
}
