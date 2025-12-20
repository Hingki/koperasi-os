import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
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
function TableHead({ children }: { children: React.ReactNode }) {
    return <th className="h-12 px-4 text-left align-middle font-medium text-slate-500">{children}</th>
}
function TableCell({ children }: { children: React.ReactNode }) {
    return <td className="p-4 align-middle">{children}</td>
}
function Badge({ children, variant }: { children: React.ReactNode, variant?: 'default'|'success'|'warning' }) {
    const bg = variant === 'success' ? 'bg-green-100 text-green-800' : variant === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-800';
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${bg}`}>{children}</span>
}

export default async function MembersPage() {
  const supabase = createClient();
  const { data: members, error } = await supabase
    .from('member')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return <div>Error loading members</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Anggota</h1>
            <p className="text-slate-500">Manage your cooperative members.</p>
        </div>
        <Link href="/dashboard/members/new">
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Add Member
            </button>
        </Link>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <input
                type="text"
                placeholder="Search members..."
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 pl-9 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            />
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>No. Anggota</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>NIK</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined Date</TableHead>
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
                                {member.status}
                            </Badge>
                        </TableCell>
                        <TableCell>{new Date(member.tanggal_daftar).toLocaleDateString()}</TableCell>
                    </TableRow>
                ))}
                {members?.length === 0 && (
                    <TableRow>
                        <TableCell>No members found.</TableCell>
                    </TableRow>
                )}
            </tbody>
        </Table>
      </div>
    </div>
  );
}
