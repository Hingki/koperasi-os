import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createTicketAction } from '@/lib/actions/support';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewTicketPage() {
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/member/support">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Buat Tiket Bantuan</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Formulir Pengajuan</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={createTicketAction} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="category">Kategori</Label>
                            <Select name="category" defaultValue="question" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="question">Pertanyaan</SelectItem>
                                    <SelectItem value="suggestion">Saran</SelectItem>
                                    <SelectItem value="criticism">Kritik</SelectItem>
                                    <SelectItem value="other">Lainnya</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="subject">Subjek / Judul</Label>
                            <Input id="subject" name="subject" placeholder="Contoh: Cara mengubah data profil" required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="priority">Prioritas</Label>
                            <Select name="priority" defaultValue="medium">
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih prioritas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Rendah</SelectItem>
                                    <SelectItem value="medium">Sedang</SelectItem>
                                    <SelectItem value="high">Tinggi</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="message">Pesan / Detail</Label>
                            <Textarea id="message" name="message" placeholder="Jelaskan pertanyaan atau masalah Anda secara detail..." className="h-32" required />
                        </div>

                        <div className="flex justify-end gap-4">
                            <Button variant="outline" asChild>
                                <Link href="/member/support">Batal</Link>
                            </Button>
                            <Button type="submit">Kirim Tiket</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
