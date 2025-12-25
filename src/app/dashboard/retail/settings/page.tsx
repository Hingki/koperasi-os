import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import SettingsForm from './settings-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'Pengaturan Retail | Koperasi OS',
  description: 'Konfigurasi modul retail dan perdagangan',
};

export default async function RetailSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div>Unauthorized</div>;
  }

  const retailService = new RetailService(supabase);
  const settings = await retailService.getRetailSettings(user.user_metadata.koperasi_id);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Pengaturan Retail</h2>
      </div>
      
      <div className="grid gap-4">
        <SettingsForm initialSettings={settings} />
      </div>
    </div>
  );
}
