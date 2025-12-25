import { getMemberFinancingAction } from '@/lib/actions/financing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Car, Tv, Sofa, Box, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

export default async function FinancingPage() {
    const { success, data } = await getMemberFinancingAction();

    if (!success || !data) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold">Gagal memuat data</h2>
                <p className="text-slate-500">{typeof data === 'string' ? data : 'Terjadi kesalahan sistem'}</p>
            </div>
        );
    }

    const { applications, active_financing } = data;

    const getIcon = (category: string) => {
        switch (category) {
            case 'vehicle': return <Car className="w-6 h-6" />;
            case 'electronics': return <Tv className="w-6 h-6" />;
            case 'furniture': return <Sofa className="w-6 h-6" />;
            default: return <Box className="w-6 h-6" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pembiayaan Barang</h1>
                    <p className="text-slate-500">Kelola pembiayaan kendaraan, elektronik, dan barang lainnya.</p>
                </div>
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                    <Link href="/member/financing/apply">
                        <Plus className="w-4 h-4 mr-2" />
                        Ajukan Pembiayaan
                    </Link>
                </Button>
            </div>

            {/* Active Financing */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">Pembiayaan Aktif</h2>
                {active_financing.length === 0 ? (
                    <Card className="bg-slate-50 border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <Car className="w-12 h-12 mb-4 text-slate-300" />
                            <p>Belum ada pembiayaan aktif.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {active_financing.map((loan: any) => (
                            <Card key={loan.id} className="overflow-hidden">
                                <CardHeader className="bg-slate-50 pb-4">
                                    <div className="flex justify-between items-start">
                                        <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600">
                                            {getIcon(loan.financing_object?.category)}
                                        </div>
                                        <Badge variant="default" className="bg-emerald-600">Aktif</Badge>
                                    </div>
                                    <CardTitle className="mt-4 text-lg">{loan.financing_object?.name}</CardTitle>
                                    <p className="text-sm text-slate-500">#{loan.loan_code}</p>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-slate-500">Sisa Pokok</p>
                                            <p className="font-semibold text-slate-900">{formatCurrency(loan.remaining_principal)}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500">Angsuran</p>
                                            <p className="font-semibold text-slate-900">{formatCurrency(loan.repayment_amount || 0)}/bln</p>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t">
                                        <Button variant="outline" className="w-full" asChild>
                                            <Link href={`/member/pinjaman/${loan.id}`}>Lihat Detail</Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Applications */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">Riwayat Pengajuan</h2>
                {applications.length === 0 ? (
                    <p className="text-slate-500 italic">Belum ada riwayat pengajuan.</p>
                ) : (
                    <div className="rounded-md border bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-slate-500">Tanggal</th>
                                        <th className="px-4 py-3 font-medium text-slate-500">Barang</th>
                                        <th className="px-4 py-3 font-medium text-slate-500">Harga OTR</th>
                                        <th className="px-4 py-3 font-medium text-slate-500">Uang Muka (DP)</th>
                                        <th className="px-4 py-3 font-medium text-slate-500">Pembiayaan</th>
                                        <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {applications.map((app: any) => (
                                        <tr key={app.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-slate-900">
                                                {new Date(app.created_at).toLocaleDateString('id-ID')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-900">{app.financing_object?.name}</div>
                                                <div className="text-xs text-slate-500 capitalize">{app.financing_object?.category}</div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {formatCurrency(app.financing_object?.price_otr)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {formatCurrency(app.financing_object?.down_payment)}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-blue-600">
                                                {formatCurrency(app.amount)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={
                                                    app.status === 'approved' ? 'default' :
                                                    app.status === 'rejected' ? 'destructive' :
                                                    'secondary'
                                                }>
                                                    {app.status === 'submitted' ? 'Menunggu Review' : app.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
