import { createClient } from '@/lib/supabase/server';
import { LoanService } from '@/lib/services/loan-service';
import { LoanApplicationForm } from './form';
import { Card } from '@/components/ui/card';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default async function LoanApplicationPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return <div>Unauthorized</div>;

    const loanService = new LoanService(supabase);
    const koperasiId = user.user_metadata.koperasi_id;

    if (!koperasiId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Konfigurasi Akun Bermasalah</h2>
                <p className="text-slate-500 max-w-md mx-auto mb-6">
                    ID Koperasi tidak ditemukan atau tidak valid.
                </p>
                <Link href="/dashboard" className="text-blue-600 hover:underline">
                    Kembali ke Dashboard
                </Link>
            </div>
        );
    }

    // Get active loan types
    const loanTypes = await loanService.getLoanTypes(koperasiId);

    return (
        <div className="max-w-2xl mx-auto py-8">
            <Link href="/dashboard/pinjaman" className="flex items-center text-sm text-slate-500 mb-6 hover:text-slate-900">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali ke Daftar Pinjaman
            </Link>

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Ajukan Pinjaman Baru</h1>
                <p className="text-slate-500 mt-1">Isi formulir di bawah ini untuk mengajukan pinjaman.</p>
            </div>

            <Card className="p-6">
                <LoanApplicationForm loanTypes={loanTypes} />
            </Card>
        </div>
    );
}
