import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { redirect } from 'next/navigation';

export default async function MemberProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: member } = await supabase
    .from('member')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!member) {
    return <div>Data anggota tidak ditemukan.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Profil Anggota</h2>
        <p className="text-slate-500">Informasi data diri anda.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Diri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-500">Nama Lengkap</label>
              <p className="font-medium text-slate-900">{member.nama_lengkap}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-500">Nomor Anggota</label>
              <p className="font-medium text-slate-900">{member.nomor_anggota}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-500">NIK</label>
              <p className="font-medium text-slate-900">{member.nik}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-500">Status</label>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                member.status === 'active' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {member.status === 'active' ? 'Aktif' : member.status}
              </span>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="mb-4 font-semibold text-slate-900">Kontak & Alamat</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-500">Email</label>
                <p className="font-medium text-slate-900">{member.email || '-'}</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-500">No. Telepon</label>
                <p className="font-medium text-slate-900">{member.phone}</p>
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium text-slate-500">Alamat Lengkap</label>
                <p className="font-medium text-slate-900">{member.alamat_lengkap}</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="mb-4 font-semibold text-slate-900">Lainnya</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-500">Tanggal Bergabung</label>
                <p className="font-medium text-slate-900">
                  {new Date(member.tanggal_daftar).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-500">Jenis Anggota</label>
                <p className="font-medium text-slate-900 capitalize">{member.member_type}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
