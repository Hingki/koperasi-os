import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, FileText } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default async function PatientsPage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Unauthorized</div>;

  const koperasiId = user.user_metadata.koperasi_id;
  const query = searchParams.q || '';

  let dbQuery = supabase
    .from('retail_customers')
    .select('*')
    .eq('koperasi_id', koperasiId)
    .eq('customer_type', 'patient')
    .order('created_at', { ascending: false });

  if (query) {
    dbQuery = dbQuery.or(`name.ilike.%${query}%,phone.ilike.%${query}%`);
  }

  const { data: patients, error } = await dbQuery.limit(50);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Pasien</h1>
          <p className="text-muted-foreground">Kelola data pasien klinik dan rekam medis.</p>
        </div>
        <Link href="/dashboard/clinic/patients/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Daftar Pasien Baru
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <form>
             <Input
                name="q"
                placeholder="Cari nama atau no telepon..."
                className="pl-9"
                defaultValue={query}
              />
          </form>
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Pasien</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Jenis Kelamin</TableHead>
              <TableHead>Usia/Tgl Lahir</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Belum ada data pasien.
                </TableCell>
              </TableRow>
            ) : (
              patients?.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                        <span>{patient.name}</span>
                        <span className="text-xs text-muted-foreground">NIK: {patient.metadata?.nik || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                        <span>{patient.phone}</span>
                        {patient.email && <span className="text-xs text-muted-foreground">{patient.email}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {patient.metadata?.gender === 'L' ? 'Laki-laki' : patient.metadata?.gender === 'P' ? 'Perempuan' : '-'}
                  </TableCell>
                  <TableCell>
                    {patient.metadata?.birth_date || '-'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={patient.address || ''}>
                    {patient.address || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/clinic/patients/${patient.id}/edit`}>
                            <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
