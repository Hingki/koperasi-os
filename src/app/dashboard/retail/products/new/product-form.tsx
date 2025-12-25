'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createProductAction } from '@/lib/actions/retail'; // We need to export this or move action
import Link from 'next/link';

interface ProductFormProps {
  categories: any[];
  suppliers: any[];
  koperasiId: string;
}

export function ProductForm({ categories, suppliers, koperasiId }: ProductFormProps) {
  const [productType, setProductType] = useState('regular');
  const [loading, setLoading] = useState(false);

  return (
    <form action={async (formData) => {
        setLoading(true);
        await createProductAction(formData);
        setLoading(false);
    }} className="space-y-8 bg-white p-6 rounded-xl border shadow-sm">
      <input type="hidden" name="koperasi_id" value={koperasiId} />
      
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Informasi Dasar</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2">
            <label htmlFor="name" className="text-sm font-medium">Nama Produk <span className="text-red-500">*</span></label>
            <Input id="name" name="name" required placeholder="Contoh: Beras Ramos 5kg" />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="barcode" className="text-sm font-medium">Barcode (Scan)</label>
            <Input id="barcode" name="barcode" placeholder="Scan barcode..." />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="sku" className="text-sm font-medium">SKU / Kode Barang</label>
            <Input id="sku" name="sku" placeholder="Auto-generated if empty" />
          </div>

          <div className="space-y-2">
            <label htmlFor="category_id" className="text-sm font-medium">Kategori</label>
            <select id="category_id" name="category_id" className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
              <option value="">-- Pilih Kategori --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="supplier_id" className="text-sm font-medium">Supplier</label>
            <select id="supplier_id" name="supplier_id" className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
              <option value="">-- Pilih Supplier --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="product_type" className="text-sm font-medium">Jenis Produk</label>
            <select 
                id="product_type" 
                name="product_type" 
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="regular">Reguler (Stok Sendiri)</option>
              <option value="consignment">Konsinyasi (Titip Jual)</option>
            </select>
          </div>
          
          {productType === 'consignment' && (
              <div className="space-y-2">
                <label htmlFor="consignment_fee_percent" className="text-sm font-medium">Fee Koperasi (%)</label>
                <Input id="consignment_fee_percent" type="number" name="consignment_fee_percent" placeholder="Contoh: 10" min="0" max="100" />
                <p className="text-xs text-slate-500">Persentase bagi hasil untuk koperasi</p>
              </div>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Harga & Modal</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label htmlFor="price_cost" className="text-sm font-medium">Harga Modal (HPP)</label>
            <Input id="price_cost" type="number" name="price_cost" defaultValue="0" required />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="price_sell_public" className="text-sm font-medium">Harga Jual (Umum)</label>
            <Input id="price_sell_public" type="number" name="price_sell_public" defaultValue="0" required />
          </div>

          <div className="space-y-2">
            <label htmlFor="price_sell_member" className="text-sm font-medium">Harga Jual (Anggota)</label>
            <Input id="price_sell_member" type="number" name="price_sell_member" defaultValue="0" required />
          </div>
        </div>
      </div>

      {/* Stock */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Stok Awal</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label htmlFor="stock_quantity" className="text-sm font-medium">Jumlah Stok</label>
            <Input id="stock_quantity" type="number" name="stock_quantity" defaultValue="0" required />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="unit" className="text-sm font-medium">Satuan</label>
            <select id="unit" name="unit" className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
              <option value="pcs">Pcs</option>
              <option value="kg">Kg</option>
              <option value="liter">Liter</option>
              <option value="box">Box</option>
              <option value="pack">Pack</option>
              <option value="botol">Botol</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="min_stock_alert" className="text-sm font-medium">Min. Stok Alert</label>
            <Input id="min_stock_alert" type="number" name="min_stock_alert" defaultValue="5" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <Link href="/dashboard/retail/products">
          <Button variant="outline" type="button">Batal</Button>
        </Link>
        <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Produk'}</Button>
      </div>
    </form>
  );
}
