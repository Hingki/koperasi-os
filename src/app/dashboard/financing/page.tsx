import { getAdminFinancingApplicationsAction } from '@/lib/actions/financing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AlertCircle, Car, Tv, Package } from 'lucide-react';

export default async function AdminFinancingPage() {
    const { success, data: applications } = await getAdminFinancingApplicationsAction();

    if (!success) {
        return (
            <div className="p-8 text-center text-red-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                <h2 className="text-xl font-bold">Gagal memuat data</h2>
            </div>
        );
    }

    const getIcon = (category: string) => {
        switch (category) {
            case 'vehicle': return <Car className="w-4 h-4" />;
            case 'electronics': return <Tv className="w-4 h-4" />;
            default: return <Package className="w-4 h-4" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'submitted': return 'bg-yellow-100 text-yellow-800';
            case 'approved': return 'bg-teal-100 text-teal-800';
            case 'active': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case 'paid': return 'bg-slate-100 text-slate-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Data Pembiayaan</h1>
                    <p className="text-slate-500">Kelola pengajuan dan data pembiayaan anggota.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/financing/products" prefetch={false}>Produk</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/financing/vendors" prefetch={false}>Vendor</Link>
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Daftar Pengajuan</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b font-medium text-slate-500">
                                <tr>
                                    <th className="p-4">Tanggal</th>
                                    <th className="p-4">Anggota</th>
                                    <th className="p-4">Barang</th>
                                    <th className="p-4">Nilai Pembiayaan</th>
                                    <th className="p-4">Tenor</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {applications && applications.length > 0 ? (
                                    applications.map((app: any) => {
                                        const financingObj = Array.isArray(app.financing_object) ? app.financing_object[0] : app.financing_object;
                                        return (
                                        <tr key={app.id} className="hover:bg-slate-50">
                                            <td className="p-4 whitespace-nowrap">{formatDate(app.created_at)}</td>
                                            <td className="p-4">
                                                <div className="font-medium">{app.member?.nama_lengkap}</div>
                                                <div className="text-xs text-slate-500">{app.member?.nomor_anggota}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    {getIcon(financingObj?.category)}
                                                    <span className="font-medium">{financingObj?.name}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 capitalize">{financingObj?.category}</div>
                                            </td>
                                            <td className="p-4 font-medium">
                                                {formatCurrency(app.amount)}
                                            </td>
                                            <td className="p-4">{app.tenor_months} Bulan</td>
                                            <td className="p-4">
                                                <Badge variant="outline" className={getStatusColor(app.status)}>
                                                    {app.status}
                                                </Badge>
                                            </td>
                                            <td className="p-4">
                                                <Button size="sm" variant="outline" asChild>
                                                    <Link href={`/dashboard/pinjaman/${app.id}`} prefetch={false}>Detail</Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    )})
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-slate-500">
                                            Belum ada data pembiayaan.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
