import { getAnnouncementsAction } from '@/lib/actions/announcement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Plus, Megaphone, Image as ImageIcon } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default async function AnnouncementsPage() {
    const { success, data: announcements } = await getAnnouncementsAction();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pengumuman & Promo</h1>
                    <p className="text-slate-500">Kelola informasi broadcast dan banner promo untuk anggota.</p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/announcements/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Buat Baru
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Daftar Pengumuman Aktif</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b font-medium text-slate-500">
                                <tr>
                                    <th className="p-4">Judul</th>
                                    <th className="p-4">Tipe</th>
                                    <th className="p-4">Periode</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {success && announcements && announcements.length > 0 ? (
                                    announcements.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="p-4">
                                                <div className="font-medium">{item.title}</div>
                                                <div className="text-xs text-slate-500 truncate max-w-[300px]">{item.content}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    {item.type === 'promo' ? (
                                                        <ImageIcon className="h-4 w-4 text-rose-500" />
                                                    ) : (
                                                        <Megaphone className="h-4 w-4 text-red-500" />
                                                    )}
                                                    <span className="capitalize">{item.type}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-500">
                                                {formatDate(item.start_date)} 
                                                {item.end_date ? ` - ${formatDate(item.end_date)}` : ' (Seterusnya)'}
                                            </td>
                                            <td className="p-4">
                                                <Badge variant={item.is_active ? 'default' : 'secondary'}>
                                                    {item.is_active ? 'Aktif' : 'Nonaktif'}
                                                </Badge>
                                            </td>
                                            <td className="p-4 text-right">
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/dashboard/announcements/${item.id}/edit`}>Edit</Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-500">
                                            Belum ada pengumuman atau promo.
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
