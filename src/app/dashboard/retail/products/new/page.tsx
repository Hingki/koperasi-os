import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';

export default async function NewProductPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const koperasiId = user.user_metadata.koperasi_id;
  const retailService = new RetailService(supabase);

  // Validate UUID
  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);
  
  // Fetch categories and suppliers
  const [categories, suppliers] = await Promise.all([
    isValidUUID ? retailService.getCategories(koperasiId) : [],
    isValidUUID ? retailService.getSuppliers(koperasiId) : []
  ]);

  async function createProduct(formData: FormData) {
    'use server';
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    
    const retailService = new RetailService(supabase);
    const koperasiId = user.user_metadata.koperasi_id;

    if (!koperasiId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId)) {
        throw new Error('Invalid Koperasi ID');
    }

    // TODO: Add unit_usaha_id handling (assuming default or passed)
    // For now, we might need to fetch a default unit_usaha or just let it be null if DB allows (it doesn't, it's NOT NULL)
    // We need to fetch the first unit_usaha for this koperasi or create one.
    
    // Quick fix: fetch unit_usaha
    const { data: unitUsaha } = await supabase
        .from('unit_usaha')
        .select('id')
        .eq('koperasi_id', koperasiId)
        .limit(1)
        .single();
    
    let unitUsahaId = unitUsaha?.id;
    
    if (!unitUsahaId) {
        // Create default unit usaha if not exists
        const { data: newUnit } = await supabase
            .from('unit_usaha')
            .insert({
                koperasi_id: koperasiId,
                name: 'Toko Koperasi',
                type: 'retail'
            })
            .select()
            .single();
        unitUsahaId = newUnit?.id;
    }

    const rawData = {
      koperasi_id: koperasiId,
      unit_usaha_id: unitUsahaId,
      name: formData.get('name') as string,
      barcode: formData.get('barcode') as string,
      sku: formData.get('sku') as string,
      category_id: (formData.get('category_id') as string) || undefined,
      supplier_id: (formData.get('supplier_id') as string) || undefined,
      product_type: formData.get('product_type') as 'regular' | 'consignment',
      price_cost: Number(formData.get('price_cost')),
      price_sell_public: Number(formData.get('price_sell_public')),
      price_sell_member: Number(formData.get('price_sell_member')),
      stock_quantity: Number(formData.get('stock_quantity')),
      min_stock_alert: Number(formData.get('min_stock_alert')),
      unit: formData.get('unit') as string,
      is_active: true
    };

    await retailService.createProduct(rawData);
    redirect('/dashboard/retail/products');
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/retail/products">
          <Button variant="ghost" size="icon" aria-label="Kembali">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tambah Produk</h1>
          <p className="text-sm text-slate-500">Input data barang baru</p>
        </div>
      </div>

      <form action={createProduct} className="space-y-8 bg-white p-6 rounded-xl border shadow-sm">
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
              <select id="category_id" name="category_id" className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="">-- Pilih Kategori --</option>
                {categories?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="supplier_id" className="text-sm font-medium">Supplier</label>
              <select id="supplier_id" name="supplier_id" className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="">-- Pilih Supplier --</option>
                {suppliers?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="product_type" className="text-sm font-medium">Jenis Produk</label>
              <select id="product_type" name="product_type" className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="regular">Reguler (Stok Sendiri)</option>
                <option value="consignment">Konsinyasi (Titip Jual)</option>
              </select>
            </div>
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
              <select id="unit" name="unit" className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
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
          <Button type="submit">Simpan Produk</Button>
        </div>
      </form>
    </div>
  );
}
