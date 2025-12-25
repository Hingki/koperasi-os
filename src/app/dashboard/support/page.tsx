import { getAdminTicketsAction } from '@/lib/actions/support';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { MessageSquare, Eye } from 'lucide-react';

export default async function AdminSupportPage() {
    const { success, data: tickets } = await getAdminTicketsAction();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Support & Tiket</h1>
                <p className="text-slate-500">Kelola pertanyaan dan masukan dari anggota.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Daftar Tiket Masuk</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b font-medium text-slate-500">
                                <tr>
                                    <th className="p-4">Tanggal</th>
                                    <th className="p-4">Anggota</th>
                                    <th className="p-4">Subjek</th>
                                    <th className="p-4">Kategori</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {success && tickets && tickets.length > 0 ? (
                                    tickets.map((ticket: any) => (
                                        <tr key={ticket.id} className="hover:bg-slate-50">
                                            <td className="p-4 text-slate-500">
                                                {formatDate(ticket.created_at)}
                                            </td>
                                            <td className="p-4 font-medium">
                                                {ticket.member?.nama_lengkap || 'Unknown'}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium text-slate-900 line-clamp-1">{ticket.subject}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="capitalize">{ticket.category}</span>
                                            </td>
                                            <td className="p-4">
                                                <Badge variant="outline" className={`capitalize ${
                                                    ticket.status === 'open' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    ticket.status === 'resolved' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    'bg-slate-50 text-slate-700 border-slate-200'
                                                }`}>
                                                    {ticket.status}
                                                </Badge>
                                            </td>
                                            <td className="p-4 text-right">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/dashboard/support/${ticket.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        Lihat
                                                    </Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-500">
                                            Belum ada tiket masuk.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
