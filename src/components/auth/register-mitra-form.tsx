'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { registerSMEPartner } from '@/lib/actions/member-registration';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Store, User, MapPin, Briefcase, Phone, Mail, CreditCard } from 'lucide-react';

export function RegisterMitraForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const namaPemilik = formData.get('nama_pemilik') as string;

    try {
      const supabase = createClient();

      // 1. Sign Up Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nama_lengkap: namaPemilik,
            // koperasi_id will be handled by fallback in server action if not set here
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Gagal membuat akun pengguna.');
      }

      // 2. Call Server Action to Register Partner
      
      // If email confirmation is ON, we might not have a session.
      if (!authData.session) {
          setMessageType('success');
          setMessage('Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi akun sebelum login.');
          setLoading(false);
          return;
      }

      const result = await registerSMEPartner(formData);

      if (result?.error) {
        // Handle object error or string error
        const errorMsg = typeof result.error === 'string' 
            ? result.error 
            : Object.values(result.error).flat().join(', ');
        throw new Error(errorMsg || 'Gagal mendaftar mitra.');
      }

      setMessageType('success');
      setMessage('Pendaftaran Mitra Berhasil! Anda akan dialihkan...');
      setTimeout(() => router.push('/dashboard'), 2000);

    } catch (error: any) {
      setMessageType('error');
      setMessage(error.message || 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Store className="h-6 w-6 text-red-600" />
            Pendaftaran Mitra UMKM
        </CardTitle>
        <CardDescription className="text-center">
          Bergabunglah sebagai mitra pemasok atau unit usaha koperasi
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
            {message && (
                <Alert variant={messageType === 'error' ? 'destructive' : 'default'} className={messageType === 'success' ? 'bg-green-50 text-green-900 border-green-200' : ''}>
                    <AlertTitle>{messageType === 'error' ? 'Error' : 'Sukses'}</AlertTitle>
                    <AlertDescription>{message}</AlertDescription>
                </Alert>
            )}

            <div className="space-y-4">
                <div className="text-lg font-semibold text-slate-900 border-b pb-2">Informasi Usaha</div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="nama_usaha">Nama Usaha / Toko</Label>
                        <div className="relative">
                            <Store className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input id="nama_usaha" name="nama_usaha" placeholder="Contoh: Toko Berkah Jaya" className="pl-9" required />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="bidang_usaha">Bidang Usaha</Label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input id="bidang_usaha" name="bidang_usaha" placeholder="Contoh: Kuliner / Sembako" className="pl-9" required />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="alamat_usaha">Alamat Usaha</Label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input id="alamat_usaha" name="alamat_usaha" placeholder="Alamat lengkap lokasi usaha" className="pl-9" required minLength={10} />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="text-lg font-semibold text-slate-900 border-b pb-2">Data Pemilik</div>
                
                <div className="space-y-2">
                    <Label htmlFor="nama_pemilik">Nama Lengkap Pemilik (Sesuai KTP)</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input id="nama_pemilik" name="nama_pemilik" placeholder="Nama Lengkap" className="pl-9" required minLength={3} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="nik">NIK (16 Digit)</Label>
                        <div className="relative">
                            <CreditCard className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input id="nik" name="nik" placeholder="Nomor Induk Kependudukan" className="pl-9" required minLength={16} maxLength={16} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Nomor WhatsApp</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input id="phone" name="phone" type="tel" placeholder="08xxxxxxxxxx" className="pl-9" required minLength={10} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="text-lg font-semibold text-slate-900 border-b pb-2">Akun Login</div>
                
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input id="email" name="email" type="email" placeholder="nama@email.com" className="pl-9" required />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" type="password" placeholder="Minimal 6 karakter" required minLength={6} />
                </div>
            </div>

            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Memproses Pendaftaran...
                    </>
                ) : (
                    'Daftar Sekarang'
                )}
            </Button>
        </form>
      </CardContent>
    </Card>
  );
}
