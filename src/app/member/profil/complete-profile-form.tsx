'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { completeMemberRegistration } from '@/lib/actions/member';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CompleteProfileFormProps {
  userEmail: string;
}

export function CompleteProfileForm({ userEmail }: CompleteProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await completeMemberRegistration(formData);

    if (result.success) {
      toast({
        title: "Berhasil",
        description: "Profil anggota berhasil dibuat.",
        variant: "default",
      });
      // Page will be revalidated by server action
    } else {
      toast({
        title: "Gagal",
        description: result.error || 'Gagal membuat profil',
        variant: "destructive",
      });
    }

    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Profil Belum Lengkap</AlertTitle>
        <AlertDescription>
          Data keanggotaan Anda tidak ditemukan. Mohon lengkapi formulir di bawah ini untuk mengaktifkan akun Anda.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Lengkapi Data Anggota</CardTitle>
          <CardDescription>
            Informasi ini diperlukan untuk administrasi koperasi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={userEmail} disabled className="bg-slate-100" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nama_lengkap">Nama Lengkap</Label>
              <Input id="nama_lengkap" name="nama_lengkap" required placeholder="Sesuai KTP" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nik">NIK</Label>
              <Input id="nik" name="nik" required minLength={16} maxLength={16} placeholder="16 digit NIK" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">No. Telepon / WA</Label>
              <Input id="phone" name="phone" required type="tel" placeholder="08..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alamat_lengkap">Alamat Lengkap</Label>
              <Textarea id="alamat_lengkap" name="alamat_lengkap" required placeholder="Nama jalan, RT/RW, Kelurahan, Kecamatan" />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Menyimpan Data...' : 'Simpan & Aktifkan Akun'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
