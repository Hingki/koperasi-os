'use client';

import { createSavingsProduct } from '@/lib/actions/savings';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function NewSavingsProductPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/savings/products" className="p-2 hover:bg-slate-100 rounded-full" aria-label="Kembali">
            <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Tambah Produk Simpanan</h1>
      </div>

      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <form action={createSavingsProduct} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="code">Kode Produk</Label>
                    <Input type="text" id="code" name="code" placeholder="Contoh: SP-01" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="name">Nama Produk</Label>
                    <Input type="text" id="name" name="name" placeholder="Contoh: Simpanan Pokok" required />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="type">Jenis Simpanan</Label>
                <select id="type" name="type" required 
                    className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    title="Jenis Simpanan"
                >
                    <option value="pokok">Simpanan Pokok</option>
                    <option value="wajib">Simpanan Wajib</option>
                    <option value="sukarela">Simpanan Sukarela</option>
                    <option value="berjangka">Simpanan Berjangka</option>
                </select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea id="description" name="description" rows={2} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="interest_rate">Suku Bunga (% p.a.)</Label>
                    <Input type="number" id="interest_rate" name="interest_rate" step="0.01" defaultValue={0} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="min_deposit">Min Setoran (Rp)</Label>
                    <Input type="number" id="min_deposit" name="min_deposit" defaultValue={0} required />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="min_balance">Saldo Mengendap (Rp)</Label>
                    <Input type="number" id="min_balance" name="min_balance" defaultValue={0} required />
                </div>
            </div>

            <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-2">
                    <input type="checkbox" id="is_withdrawal_allowed" name="is_withdrawal_allowed" defaultChecked className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" title="Izinkan penarikan" />
                    <Label htmlFor="is_withdrawal_allowed">Izinkan Penarikan Sewaktu-waktu</Label>
                </div>

                <div className="flex items-center space-x-2">
                    <input type="checkbox" id="is_active" name="is_active" defaultChecked className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" title="Aktifkan produk" />
                    <Label htmlFor="is_active">Aktifkan Produk Ini</Label>
                </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
                <Link href="/dashboard/savings/products">
                    <Button variant="outline" type="button">Batal</Button>
                </Link>
                <Button type="submit">Simpan Produk</Button>
            </div>
        </form>
      </div>
    </div>
  );
}
