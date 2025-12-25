import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateAnnouncementAction, getAnnouncementByIdAction, deleteAnnouncementAction } from '@/lib/actions/announcement';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function EditAnnouncementPage({ params }: { params: { id: string } }) {
    const { success, data: announcement } = await getAnnouncementByIdAction(params.id);

    if (!success || !announcement) {
        redirect('/dashboard/announcements');
    }

    async function deleteAction() {
        'use server';
        await deleteAnnouncementAction(params.id);
        redirect('/dashboard/announcements');
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/announcements">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Pengumuman</h1>
                </div>
                <form action={deleteAction}>
                    <Button variant="destructive" size="sm" type="submit">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hapus
                    </Button>
                </form>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Edit Form</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={updateAnnouncementAction.bind(null, params.id)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="type">Tipe Konten</Label>
                            <Select name="type" defaultValue={announcement.type}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih tipe" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="announcement">Pengumuman (Teks)</SelectItem>
                                    <SelectItem value="promo">Promo (Banner Gambar)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title">Judul</Label>
                            <Input id="title" name="title" defaultValue={announcement.title} required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content">Konten / Deskripsi</Label>
                            <Textarea id="content" name="content" defaultValue={announcement.content} className="h-32" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="image_url">URL Gambar (Opsional untuk Promo)</Label>
                            <Input id="image_url" name="image_url" defaultValue={announcement.image_url} placeholder="https://..." />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_date">Tanggal Mulai</Label>
                                <Input type="date" id="start_date" name="start_date" defaultValue={announcement.start_date ? new Date(announcement.start_date).toISOString().split('T')[0] : ''} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_date">Tanggal Berakhir (Opsional)</Label>
                                <Input type="date" id="end_date" name="end_date" defaultValue={announcement.end_date ? new Date(announcement.end_date).toISOString().split('T')[0] : ''} />
                            </div>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">Status Aktif</Label>
                                <p className="text-sm text-slate-500">
                                    Pengumuman akan langsung tampil jika aktif.
                                </p>
                            </div>
                            <Switch name="is_active" defaultChecked={announcement.is_active} />
                        </div>

                        <div className="flex justify-end gap-4">
                            <Button variant="outline" asChild>
                                <Link href="/dashboard/announcements">Batal</Link>
                            </Button>
                            <Button type="submit">Simpan Perubahan</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
