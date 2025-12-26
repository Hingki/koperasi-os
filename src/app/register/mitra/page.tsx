import { RegisterMitraForm } from '@/components/auth/register-mitra-form';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Pendaftaran Mitra UMKM | Koperasi OS',
  description: 'Daftar sebagai mitra pemasok atau unit usaha Koperasi.',
};

export default function RegisterMitraPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center text-slate-500 hover:text-slate-900 transition-colors">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali ke Beranda
            </Link>
            <Link href="/" className="text-red-600 font-bold text-2xl">
            Koperasi OS
            </Link>
            <div className="w-24"></div> {/* Spacer for centering */}
        </div>
        
        <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Program Kemitraan UMKM
            </h1>
            <p className="mt-4 text-lg text-slate-600">
            Jadilah bagian dari ekosistem koperasi. Pasarkan produk Anda ke ribuan anggota kami dengan sistem pembayaran yang terjamin.
            </p>
        </div>
      </div>
      
      <RegisterMitraForm />
      
      <p className="mt-8 text-center text-sm text-slate-600">
        Sudah punya akun?{' '}
        <Link href="/login" className="font-medium text-red-600 hover:text-red-500 underline decoration-2 decoration-red-600/30 underline-offset-2">
          Masuk di sini
        </Link>
      </p>
    </div>
  );
}
