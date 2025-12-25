import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createAnnouncementAction } from '@/lib/actions/announcement';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewAnnouncementPage() {
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/announcements">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Buat Pengumuman Baru</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Form Pengumuman</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={createAnnouncementAction} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="type">Tipe Konten</Label>
                            <Select name="type" defaultValue="announcement">
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
                            <Input id="title" name="title" placeholder="Contoh: Rapat Anggota Tahunan 2025" required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content">Konten / Deskripsi</Label>
                            <Textarea id="content" name="content" placeholder="Tulis isi pengumuman di sini..." className="h-32" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="image_url">URL Gambar (Opsional untuk Promo)</Label>
                            <Input id="image_url" name="image_url" placeholder="https://..." />
                            <p className="text-xs text-slate-500">Masukkan link gambar langsung untuk banner promo.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_date">Tanggal Mulai</Label>
                                <Input type="date" id="start_date" name="start_date" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_date">Tanggal Berakhir (Opsional)</Label>
                                <Input type="date" id="end_date" name="end_date" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">Status Aktif</Label>
                                <p className="text-sm text-slate-500">
                                    Pengumuman akan langsung tampil jika aktif.
                                </p>
                            </div>
                            <Switch name="is_active" defaultChecked />
                        </div>

                        <div className="flex justify-end gap-4">
                            <Button variant="outline" asChild>
                                <Link href="/dashboard/announcements">Batal</Link>
                            </Button>
                            <Button type="submit">Simpan Pengumuman</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
