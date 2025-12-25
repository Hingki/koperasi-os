'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRentalCustomerAction } from '@/lib/actions/rental';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function RentalCustomerForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      const result = await createRentalCustomerAction(formData);

      if (result.success) {
        toast.success('Pelanggan berhasil ditambahkan');
        router.push('/dashboard/rental/customers');
      }
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
          <Label htmlFor="name">Nama Lengkap <span className="text-red-500">*</span></Label>
          <Input id="name" name="name" placeholder="Nama sesuai identitas" required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="identity_number">No. KTP / SIM</Label>
            <Input id="identity_number" name="identity_number" placeholder="Nomor identitas" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">No. Telepon / WhatsApp</Label>
            <Input id="phone" name="phone" placeholder="08..." />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">Email (Opsional)</Label>
          <Input id="email" name="email" type="email" placeholder="contoh@email.com" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="address">Alamat Lengkap</Label>
          <Textarea 
            id="address" 
            name="address" 
            placeholder="Alamat domisili saat ini" 
            className="h-20"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="notes">Catatan Tambahan</Label>
          <Textarea 
            id="notes" 
            name="notes" 
            placeholder="Catatan khusus pelanggan ini..." 
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
          Simpan Pelanggan
        </Button>
      </div>
    </form>
  );
}
