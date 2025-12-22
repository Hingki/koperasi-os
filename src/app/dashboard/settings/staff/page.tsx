'use server';

import { createClient } from '@/lib/supabase/server';
import { StaffManager, UserRoleWithMember } from '@/components/settings/staff-manager';
import type { UserRole } from '@/lib/auth/roles';

export default async function StaffSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const koperasiId = user.user_metadata?.koperasi_id as string | undefined;
  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);

  let roles: any[] = [];
  let members: { id: string; nama_lengkap: string; nomor_anggota: string }[] = [];

  if (isValidUUID) {
    const { data: roleData } = await supabase
      .from('user_role')
      .select(`
        *,
        member:member(nama_lengkap, nomor_anggota)
      `)
      .eq('koperasi_id', koperasiId)
      .eq('is_active', true)
      .in('role', ['pengurus','bendahara','ketua','wakil_ketua','sekretaris','staff'])
      .order('role');
    roles = roleData || [];

    const { data: memberData } = await supabase
      .from('member')
      .select('id, nama_lengkap, nomor_anggota')
      .eq('koperasi_id', koperasiId)
      .eq('status', 'active')
      .order('nama_lengkap');
    members = (memberData as { id: string; nama_lengkap: string; nomor_anggota: string }[]) || [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengurus & Karyawan</h1>
        <p className="text-slate-500">Kelola peran pengurus dan staf koperasi.</p>
      </div>
      <StaffManager
        initialRoles={roles as unknown as UserRoleWithMember[]}
        memberOptions={members}
        koperasiId={koperasiId!}
      />
    </div>
  );
}

