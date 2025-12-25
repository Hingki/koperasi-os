import { getFinancingProductsAction, getSuppliersAction } from '@/lib/actions/financing';
import { FinancingApplicationForm } from '@/components/member/financing-application-form';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default async function FinancingApplyPage() {
    const [productsResult, suppliersResult] = await Promise.all([
        getFinancingProductsAction(),
        getSuppliersAction()
    ]);

    if (!productsResult.success || !suppliersResult.success) {
        return (
            <div className="p-8 text-center text-red-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                <h2 className="text-xl font-bold">Gagal memuat data</h2>
                <p>Mohon coba lagi nanti.</p>
            </div>
        );
    }

    const products = productsResult.data || [];
    const suppliers = suppliersResult.data || [];

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Ajukan Pembiayaan</h1>
                <p className="text-slate-500">Isi formulir untuk mengajukan pembiayaan barang/kendaraan.</p>
            </div>

            <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Persyaratan</AlertTitle>
                <AlertDescription>
                    Pastikan Anda telah melengkapi data diri dan memiliki simpanan wajib yang cukup. 
                    Proses persetujuan membutuhkan waktu 1-3 hari kerja.
                </AlertDescription>
            </Alert>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
                <FinancingApplicationForm products={products} suppliers={suppliers} />
            </div>
        </div>
    );
}
