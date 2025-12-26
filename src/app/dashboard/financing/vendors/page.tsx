import { getVendorsAction, deleteVendorAction } from '@/lib/actions/vendor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Pencil, ArrowLeft, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { AlertCircle } from 'lucide-react';

export default async function VendorsPage() {
    const { success, data: vendors } = await getVendorsAction();

    if (!success) {
        return (
            <div className="p-8 text-center text-red-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                <h2 className="text-xl font-bold">Gagal memuat data vendor</h2>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <Link href="/dashboard/financing" prefetch={false} className="p-2 hover:bg-slate-100 rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Data Vendor</h1>
                        <p className="text-slate-500">Kelola supplier barang pembiayaan.</p>
                    </div>
                </div>
                <Button asChild>
                    <Link href="/dashboard/financing/vendors/new" prefetch={false}>
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Vendor
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vendors && vendors.length > 0 ? (
                    vendors.map((vendor: any) => (
                        <Card key={vendor.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-slate-500" />
                                    {vendor.name}
                                </CardTitle>
                                <div className={`w-3 h-3 rounded-full ${vendor.is_active ? 'bg-green-500' : 'bg-slate-300'}`} title={vendor.is_active ? 'Aktif' : 'Non-Aktif'} />
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm text-slate-600 mt-2">
                                    {vendor.contact_person && (
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-slate-900">{vendor.contact_person}</span>
                                        </div>
                                    )}
                                    {vendor.phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4" />
                                            {vendor.phone}
                                        </div>
                                    )}
                                    {vendor.email && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4" />
                                            {vendor.email}
                                        </div>
                                    )}
                                    {vendor.address && (
                                        <div className="flex items-start gap-2">
                                            <MapPin className="w-4 h-4 mt-0.5" />
                                            <span className="line-clamp-2">{vendor.address}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/dashboard/financing/vendors/${vendor.id}/edit`} prefetch={false}>
                                            <Pencil className="w-4 h-4 mr-2" />
                                            Edit
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full p-12 text-center text-slate-500 border-2 border-dashed rounded-lg">
                        <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <h3 className="text-lg font-medium">Belum ada vendor</h3>
                        <p>Tambahkan vendor untuk memulai.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
