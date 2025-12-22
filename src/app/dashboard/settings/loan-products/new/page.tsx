'use client';

import { createLoanProduct } from '@/lib/actions/product';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function NewLoanProductPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/settings/loan-products" className="p-2 hover:bg-slate-100 rounded-full" aria-label="Kembali">
            <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Tambah Produk Pinjaman</h1>
      </div>

      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <form action={createLoanProduct} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="code">Kode Produk</Label>
                    <Input type="text" id="code" name="code" placeholder="Contoh: FLAT-12" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="name">Nama Produk</Label>
                    <Input type="text" id="name" name="name" placeholder="Contoh: Pinjaman Flat Reguler" required />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea id="description" name="description" rows={2} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="interest_rate">Suku Bunga (% p.a.)</Label>
                    <Input type="number" id="interest_rate" name="interest_rate" step="0.01" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="interest_type">Jenis Bunga</Label>
                    <select id="interest_type" name="interest_type" required 
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value="flat">Flat</option>
                        <option value="effective">Efektif (Menurun)</option>
                        <option value="annuity">Anuitas</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="max_tenor_months">Max Tenor (Bulan)</Label>
                    <Input type="number" id="max_tenor_months" name="max_tenor_months" required />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="min_amount">Min Pinjaman (Rp)</Label>
                    <Input type="number" id="min_amount" name="min_amount" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="max_amount">Max Pinjaman (Rp)</Label>
                    <Input type="number" id="max_amount" name="max_amount" required />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="admin_fee">Biaya Admin (Rp)</Label>
                    <Input type="number" id="admin_fee" name="admin_fee" defaultValue={0} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="provision_fee">Biaya Provisi (%)</Label>
                    <Input type="number" id="provision_fee" name="provision_fee" step="0.1" defaultValue={0} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="penalty_late_daily">Denda Keterlambatan (%/hari)</Label>
                    <Input type="number" id="penalty_late_daily" name="penalty_late_daily" step="0.01" defaultValue={0} />
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <input type="checkbox" id="is_active" name="is_active" defaultChecked className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                <Label htmlFor="is_active">Aktifkan Produk Ini</Label>
            </div>

            <div className="flex justify-end space-x-2">
                <Link href="/dashboard/settings/loan-products">
                    <Button variant="outline" type="button">Batal</Button>
                </Link>
                <Button type="submit">Simpan Produk</Button>
            </div>
        </form>
      </div>
    </div>
  );
}
