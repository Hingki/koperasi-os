'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createPatientAction, updatePatientAction } from '@/lib/actions/clinic';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PatientFormProps {
  initialData?: any;
  mode: 'create' | 'edit';
}

export function PatientForm({ initialData, mode }: PatientFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      if (mode === 'create') {
        await createPatientAction(formData);
        toast.success('Pasien berhasil didaftarkan');
        router.push('/dashboard/clinic/patients');
      } else {
        if (!initialData?.id) throw new Error('ID Pasien tidak ditemukan');
        
        // Convert FormData to object for update
        const data: any = {};
        formData.forEach((value, key) => {
            if (value) data[key] = value;
        });
        
        await updatePatientAction(initialData.id, data);
        toast.success('Data pasien berhasil diperbarui');
        router.push('/dashboard/clinic/patients');
      }
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6 max-w-2xl bg-white p-6 rounded-lg border shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nama Lengkap *</Label>
          <Input 
            id="name" 
            name="name" 
            required 
            defaultValue={initialData?.name} 
            placeholder="Nama sesuai KTP"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nik">NIK (Nomor Induk Kependudukan)</Label>
          <Input 
            id="nik" 
            name="nik" 
            defaultValue={initialData?.metadata?.nik} 
            placeholder="16 digit NIK"
            maxLength={16}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Nomor Telepon/WA *</Label>
          <Input 
            id="phone" 
            name="phone" 
            required 
            defaultValue={initialData?.phone} 
            placeholder="08xxxxxxxxxx"
            type="tel"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email (Opsional)</Label>
          <Input 
            id="email" 
            name="email" 
            type="email"
            defaultValue={initialData?.email} 
            placeholder="nama@email.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="birth_date">Tanggal Lahir</Label>
          <Input 
            id="birth_date" 
            name="birth_date" 
            type="date"
            defaultValue={initialData?.metadata?.birth_date} 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Jenis Kelamin</Label>
          <Select name="gender" defaultValue={initialData?.metadata?.gender}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih jenis kelamin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="L">Laki-laki</SelectItem>
              <SelectItem value="P">Perempuan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Alamat Lengkap</Label>
        <Textarea 
          id="address" 
          name="address" 
          defaultValue={initialData?.address} 
          placeholder="Jalan, RT/RW, Kelurahan, Kecamatan"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Catatan Tambahan (Riwayat Alergi/Penyakit)</Label>
        <Textarea 
          id="notes" 
          name="notes" 
          defaultValue={initialData?.metadata?.notes} 
          placeholder="Catatan medis penting..."
        />
      </div>

      <div className="flex justify-end gap-4 pt-4">
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
          {mode === 'create' ? 'Daftarkan Pasien' : 'Simpan Perubahan'}
        </Button>
      </div>
    </form>
  );
}
