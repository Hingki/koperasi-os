import { createFinancingProductAction } from '@/lib/actions/financing';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function NewFinancingProductPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/financing/products" className="p-2 hover:bg-slate-100 rounded-full" aria-label="Kembali">
            <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Tambah Produk Pembiayaan</h1>
      </div>

      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <form action={createFinancingProductAction} className="space-y-6">
            
            {/* Hidden field to enforce financing type */}
            <input type="hidden" name="is_financing" value="on" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="code">Kode Produk</Label>
                    <Input type="text" id="code" name="code" placeholder="Contoh: KREDIT-MOTOR" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="name">Nama Produk</Label>
                    <Input type="text" id="name" name="name" placeholder="Contoh: Pembiayaan Kendaraan Bermotor" required />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="financing_category">Kategori Objek Pembiayaan</Label>
                <Select name="financing_category" defaultValue="vehicle">
                    <SelectTrigger>
                        <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="vehicle">Kendaraan (Motor/Mobil)</SelectItem>
                        <SelectItem value="electronics">Elektronik</SelectItem>
                        <SelectItem value="furniture">Furniture</SelectItem>
                        <SelectItem value="property">Properti</SelectItem>
                        <SelectItem value="gold">Logam Mulia</SelectItem>
                        <SelectItem value="other">Lainnya</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea id="description" name="description" rows={2} placeholder="Deskripsi detail produk..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="interest_rate">Suku Bunga (% p.a)</Label>
                    <Input type="number" id="interest_rate" name="interest_rate" step="0.01" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="interest_type">Tipe Bunga</Label>
                    <Select name="interest_type" defaultValue="flat">
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih Tipe" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="flat">Flat (Tetap)</SelectItem>
                            <SelectItem value="effective">Efektif (Menurun)</SelectItem>
                            <SelectItem value="annuity">Anuitas</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="max_tenor_months">Maks. Tenor (Bulan)</Label>
                    <Input type="number" id="max_tenor_months" name="max_tenor_months" required />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="min_amount">Min. Plafon (Rp)</Label>
                    <Input type="number" id="min_amount" name="min_amount" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="max_amount">Max. Plafon (Rp)</Label>
                    <Input type="number" id="max_amount" name="max_amount" required />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
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
                <Link href="/dashboard/financing/products">
                    <Button variant="outline" type="button">Batal</Button>
                </Link>
                <Button type="submit">Simpan Produk</Button>
            </div>
        </form>
      </div>
    </div>
  );
}
