'use client';

import { createAuctionAction } from '@/lib/actions/auction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function NewAuctionPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      await createAuctionAction(formData);
      router.push('/dashboard/auction');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Buat Lelang Baru</h1>
        <p className="text-muted-foreground">Isi detail produk yang akan dilelang.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Lelang</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Judul Lelang</Label>
              <Input id="title" name="title" required placeholder="Contoh: Lelang Panen Raya Padi" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_name">Nama Produk</Label>
              <Input id="product_name" name="product_name" required placeholder="Contoh: Gabah Kering Giling Grade A" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea id="description" name="description" placeholder="Deskripsi lengkap kondisi produk, lokasi, dll." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_price">Harga Awal (Open Price)</Label>
                <Input id="start_price" name="start_price" type="number" required min="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_increment">Kenaikan Minimum (Bid Increment)</Label>
                <Input id="min_increment" name="min_increment" type="number" required min="1000" defaultValue="1000" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="buy_now_price">Harga Beli Sekarang (Opsional)</Label>
              <Input id="buy_now_price" name="buy_now_price" type="number" min="0" placeholder="Kosongkan jika sistem lelang murni" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Waktu Mulai</Label>
                <Input id="start_time" name="start_time" type="datetime-local" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">Waktu Berakhir</Label>
                <Input id="end_time" name="end_time" type="datetime-local" required />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>Batal</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Terbitkan Lelang
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
