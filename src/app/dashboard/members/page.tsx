import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus, Search, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Assuming shadcn or placeholder
import { Input } from '@/components/ui/input';   // Assuming shadcn or placeholder

// Basic UI Components (if shadcn not present, these will be simple wrappers)
function Table({ children }: { children: React.ReactNode }) {
    return <div className="w-full overflow-auto"><table className="w-full caption-bottom text-sm">{children}</table></div>
}
function TableHeader({ children }: { children: React.ReactNode }) {
    return <thead className="[&_tr]:border-b">{children}</thead>
}
function TableRow({ children, className }: { children: React.ReactNode, className?: string }) {
    return <tr className={`border-b transition-colors hover:bg-slate-50/50 ${className}`}>{children}</tr>
}
function TableHead({ children, className }: { children: React.ReactNode, className?: string }) {
    return <th className={`h-12 px-4 text-left align-middle font-medium text-slate-500 ${className || ''}`}>{children}</th>
}
function TableCell({ children, className }: { children: React.ReactNode, className?: string }) {
    return <td className={`p-4 align-middle ${className || ''}`}>{children}</td>
}
function Badge({ children, variant }: { children: React.ReactNode, variant?: 'default'|'success'|'warning' }) {
    const bg = variant === 'success' ? 'bg-green-100 text-green-800' : variant === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-800';
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${bg}`}>{children}</span>
}

export default async function MembersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <div>Unauthorized</div>;

  const koperasiId = user.user_metadata.koperasi_id;
  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);
  
  // Defensive query: only fetch if UUID is valid
  const { data: members, error } = isValidUUID ? await supabase
    .from('member')
    .select('*')
    .eq('koperasi_id', koperasiId)
    .order('created_at', { ascending: false }) : { data: [], error: null };

  if (error) return <div>Error loading members: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Anggota</h1>
            <p className="text-slate-500">Kelola anggota koperasi anda.</p>
        </div>
        <Link href="/dashboard/members/new">
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Anggota
            </button>
        </Link>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <input
                aria-label="Cari anggota"
                type="text"
                placeholder="Cari anggota..."
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 pl-9 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            />
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>No. Anggota</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>NIK</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal Bergabung</TableHead>
                </TableRow>
            </TableHeader>
            <tbody>
                {members?.map((member) => (
                    <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.nomor_anggota}</TableCell>
                        <TableCell>{member.nama_lengkap}</TableCell>
                        <TableCell>{member.nik}</TableCell>
                        <TableCell>{member.phone}</TableCell>
                        <TableCell>
                            <Badge variant={member.status === 'active' ? 'success' : 'default'}>
                                {member.status === 'active' ? 'Aktif' : member.status === 'pending' ? 'Menunggu' : member.status}
                            </Badge>
                        </TableCell>
                        <TableCell>{new Date(member.tanggal_daftar).toLocaleDateString('id-ID')}</TableCell>
                    </TableRow>
                ))}
                {members?.length === 0 && (
                    <TableRow>
                        <TableCell>Tidak ada anggota ditemukan.</TableCell>
                    </TableRow>
                )}
            </tbody>
        </Table>
      </div>
    </div>
  );
}
