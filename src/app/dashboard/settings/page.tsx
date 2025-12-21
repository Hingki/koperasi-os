import { createClient } from '@/lib/supabase/server';
import { User, Mail, Shield, Building } from 'lucide-react';
import { KoperasiProfileForm } from '@/components/settings/koperasi-profile-form';
import { koperasiService } from '@/lib/services/koperasi-service';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch Koperasi Data
  const koperasiId = user?.user_metadata?.koperasi_id;
  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);
  
  const koperasiData = isValidUUID 
    ? await koperasiService.getKoperasi(koperasiId, supabase)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-slate-500">Kelola profil koperasi dan preferensi sistem.</p>
      </div>

      <div className="grid gap-6">
        {/* Koperasi Profile Form (New Feature) */}
        <KoperasiProfileForm initialData={koperasiData} />

        {/* Profile Section (Read Only for now) */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-slate-500" />
                Informasi Akun
            </h2>
            <div className="space-y-4 max-w-xl">
                <div>
                    <p className="block text-sm font-medium text-slate-700">Email Address</p>
                    <div className="mt-1 flex items-center">
                        <Mail className="w-4 h-4 text-slate-400 mr-2" />
                        <span className="text-slate-900">{user?.email}</span>
                        {user?.email_confirmed_at && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Verified
                            </span>
                        )}
                    </div>
                </div>
                <div>
                    <p className="block text-sm font-medium text-slate-700">User ID</p>
                    <div className="mt-1 font-mono text-sm text-slate-500 bg-slate-50 p-2 rounded">
                        {user?.id}
                    </div>
                </div>
            </div>
        </div>

        {/* Security Section */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-slate-500" />
                Keamanan
            </h2>
            <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                    <div>
                        <p className="font-medium">Password</p>
                        <p className="text-sm text-slate-500">Last changed: Never</p>
                    </div>
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">Ubah Password</button>
                </div>
                 <div className="flex items-center justify-between py-3">
                    <div>
                        <p className="font-medium">Two-Factor Authentication</p>
                        <p className="text-sm text-slate-500">Tambahkan lapisan keamanan ekstra.</p>
                    </div>
                    <button className="text-sm text-slate-400 font-medium cursor-not-allowed">Segera Hadir</button>
                </div>
            </div>
        </div>

        {/* System Info */}
         <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Building className="w-5 h-5 mr-2 text-slate-500" />
                Informasi Sistem
            </h2>
            <div className="text-sm text-slate-500 space-y-2">
                <p>Koperasi OS Version: <span className="text-slate-900 font-medium">v0.1.0-beta</span></p>
                <p>Environment: <span className="text-slate-900 font-medium">{process.env.NODE_ENV}</span></p>
            </div>
        </div>
      </div>
    </div>
  );
}
