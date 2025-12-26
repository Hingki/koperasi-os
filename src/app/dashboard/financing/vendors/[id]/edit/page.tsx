import { updateVendorAction } from '@/lib/actions/vendor';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditVendorPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: vendor } = await supabase.from('inventory_suppliers').select('*').eq('id', id).single();

  if (!vendor) notFound();

  const updateAction = updateVendorAction.bind(null, vendor.id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/financing/vendors" prefetch={false} className="p-2 hover:bg-slate-100 rounded-full" aria-label="Kembali">
            <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit Vendor</h1>
      </div>

      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <form action={updateAction} className="space-y-6">
            
            <div className="space-y-2">
                <Label htmlFor="name">Nama Vendor / Toko <span className="text-red-500">*</span></Label>
                <Input type="text" id="name" name="name" defaultValue={vendor.name} required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="contact_person">Kontak Person</Label>
                    <Input type="text" id="contact_person" name="contact_person" defaultValue={vendor.contact_person || ''} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">Nomor Telepon / HP</Label>
                    <Input type="tel" id="phone" name="phone" defaultValue={vendor.phone || ''} />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input type="email" id="email" name="email" defaultValue={vendor.email || ''} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="address">Alamat Lengkap</Label>
                <Textarea id="address" name="address" rows={3} defaultValue={vendor.address || ''} />
            </div>

            <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  defaultChecked={vendor.is_active}
                  aria-label="Status Aktif"
                  title="Status Aktif"
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <Label htmlFor="is_active">Status Aktif</Label>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
                <Link href="/dashboard/financing/vendors" prefetch={false}>
                    <Button variant="outline" type="button">Batal</Button>
                </Link>
                <Button type="submit">Simpan Perubahan</Button>
            </div>
        </form>
      </div>
    </div>
  );
}
