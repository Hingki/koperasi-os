import { createClient } from '@/lib/supabase/server';
import { RatService } from '@/lib/services/rat-service';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminRatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Unauthorized</div>;

  // Get Koperasi ID from user_role
  const { data: role } = await supabase
    .from('user_role')
    .select('koperasi_id')
    .eq('user_id', user.id)
    .single();

  if (!role) return <div>No Access</div>;

  // Direct query for admin listing (includes drafts)
  const { data: sessions } = await supabase
    .from('rat_sessions')
    .select('*')
    .eq('koperasi_id', role.koperasi_id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Manajemen RAT</h1>
            <p className="text-muted-foreground">Kelola Rapat Anggota Tahunan</p>
        </div>
        <Link href="/dashboard/rat/create" prefetch={false}>
            <Button>
                <Plus className="mr-2 h-4 w-4" /> Buat RAT Baru
            </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Tahun Buku</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sessions?.map((session) => (
                    <TableRow key={session.id}>
                        <TableCell className="font-medium">{session.title}</TableCell>
                        <TableCell>{session.fiscal_year}</TableCell>
                        <TableCell>{new Date(session.start_time).toLocaleDateString('id-ID')}</TableCell>
                        <TableCell>
                             <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                session.status === 'ongoing' ? 'bg-green-100 text-green-800' :
                                session.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                'bg-blue-100 text-blue-800'
                             }`}>
                                {session.status.toUpperCase()}
                             </span>
                        </TableCell>
                        <TableCell className="text-right">
                            <Link href={`/dashboard/rat/${session.id}`} prefetch={false}>
                                <Button variant="outline" size="sm">Kelola</Button>
                            </Link>
                        </TableCell>
                    </TableRow>
                ))}
                {!sessions?.length && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                            Belum ada sesi RAT.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
      </div>
    </div>
  );
}
