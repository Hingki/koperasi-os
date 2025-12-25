'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRentalItemAction } from '@/lib/actions/rental';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function RentalItemForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append('status', 'available');
    
    try {
      await createRentalItemAction(formData);

      toast.success('Unit sewa berhasil ditambahkan');
      // router.push('/dashboard/rental/items');
    } catch (error) {
      toast.error('Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8 max-w-2xl bg-white p-6 rounded-lg border shadow-sm">
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Nama Unit <span className="text-red-500">*</span></Label>
          <Input id="name" name="name" placeholder="Contoh: Mobil Avanza, Kamera DSLR, dll" required />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="category">Kategori</Label>
          <Select name="category">
            <SelectTrigger>
              <SelectValue placeholder="Pilih kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Kendaraan">Kendaraan</SelectItem>
              <SelectItem value="Elektronik">Elektronik</SelectItem>
              <SelectItem value="Peralatan">Peralatan</SelectItem>
              <SelectItem value="Ruangan">Ruangan</SelectItem>
              <SelectItem value="Lainnya">Lainnya</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="price_per_hour">Harga Sewa per Jam</Label>
            <Input 
              id="price_per_hour" 
              name="price_per_hour" 
              type="number" 
              min="0" 
              placeholder="0"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="price_per_day">Harga Sewa per Hari</Label>
            <Input 
              id="price_per_day" 
              name="price_per_day" 
              type="number" 
              min="0" 
              placeholder="0"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="condition">Kondisi Fisik</Label>
          <Input id="condition" name="condition" placeholder="Contoh: Baik, Lecet sedikit, dll" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">Deskripsi / Catatan</Label>
          <Textarea 
            id="description" 
            name="description" 
            placeholder="Spesifikasi detail unit..." 
            className="h-24"
          />
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.back()}
          disabled={loading}
        >
          Batal
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Simpan Unit
        </Button>
      </div>
    </form>
  );
}
