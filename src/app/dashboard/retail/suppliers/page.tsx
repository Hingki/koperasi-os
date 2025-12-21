import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus } from 'lucide-react';

export default async function SuppliersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const koperasiId = user.user_metadata.koperasi_id;
  const retailService = new RetailService(supabase);
  
  // Validate UUID
  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);
  const suppliers = isValidUUID ? await retailService.getSuppliers(koperasiId) : [];

  async function createSupplier(formData: FormData) {
    'use server';
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    
    const retailService = new RetailService(supabase);
    const koperasiId = user.user_metadata.koperasi_id;

    if (!koperasiId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId)) {
        throw new Error('Invalid Koperasi ID');
    }

    await retailService.createSupplier({
        koperasi_id: koperasiId,
        name: formData.get('name') as string,
        contact_person: formData.get('contact_person') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        address: formData.get('address') as string,
        is_active: true
    });

    redirect('/dashboard/retail/suppliers');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Link href="/dashboard/retail">
                <Button variant="ghost" size="icon" aria-label="Kembali">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Supplier</h1>
                <p className="text-sm text-slate-500">
                    Data pemasok barang
                </p>
            </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Form Create */}
        <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-lg border shadow-sm sticky top-6">
                <h3 className="font-bold text-lg mb-4">Tambah Supplier Baru</h3>
                <form action={createSupplier} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">Nama Supplier <span className="text-red-500">*</span></label>
                        <Input id="name" name="name" required placeholder="Contoh: PT. Sumber Makmur" />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="contact_person" className="text-sm font-medium">Kontak Person</label>
                        <Input id="contact_person" name="contact_person" placeholder="Nama sales/PIC" />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="phone" className="text-sm font-medium">No. Telepon</label>
                        <Input id="phone" name="phone" placeholder="0812..." />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">Email</label>
                        <Input id="email" name="email" type="email" placeholder="email@supplier.com" />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="address" className="text-sm font-medium">Alamat</label>
                        <Input id="address" name="address" placeholder="Alamat lengkap..." />
                    </div>
                    <Button type="submit" className="w-full">Simpan</Button>
                </form>
            </div>
        </div>

        {/* List */}
        <div className="md:col-span-2">
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b font-medium text-slate-500">
                        <tr>
                            <th className="px-6 py-4">Nama Supplier</th>
                            <th className="px-6 py-4">Kontak</th>
                            <th className="px-6 py-4">Alamat</th>
                            <th className="px-6 py-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {suppliers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                    Belum ada data supplier.
                                </td>
                            </tr>
                        ) : (
                            suppliers.map((s: any) => (
                                <tr key={s.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{s.name}</div>
                                        {s.email && <div className="text-xs text-slate-500">{s.email}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-900">{s.contact_person || '-'}</div>
                                        <div className="text-xs text-slate-500">{s.phone || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                                        {s.address || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex h-2 w-2 rounded-full ${s.is_active ? 'bg-green-500' : 'bg-slate-300'}`} />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}
