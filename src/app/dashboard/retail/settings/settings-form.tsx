'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { updateRetailSettingsAction } from '@/lib/actions/retail';
import { Loader2, Save } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SettingsFormProps {
  initialSettings: any;
}

export default function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings || {
    purchase_invoice_prefix: 'INV-PB-',
    purchase_return_prefix: 'RET-PB-',
    sales_invoice_prefix: 'INV-PJ-',
    sales_return_prefix: 'RET-PJ-',
    receipt_header: '',
    receipt_footer: 'Terima Kasih',
    receipt_width: 80
  });
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateRetailSettingsAction(settings);
      alert('Pengaturan berhasil disimpan');
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan pengaturan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Tabs defaultValue="numbering" className="space-y-4">
        <TabsList>
          <TabsTrigger value="numbering">Penomoran Otomatis</TabsTrigger>
          <TabsTrigger value="receipt">Struk & Printer</TabsTrigger>
        </TabsList>

        <TabsContent value="numbering" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Format Nomor Transaksi</CardTitle>
              <CardDescription>
                Atur awalan (prefix) untuk nomor faktur dan retur otomatis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Prefix Faktur Pembelian</Label>
                  <Input 
                    value={settings.purchase_invoice_prefix}
                    onChange={e => setSettings({...settings, purchase_invoice_prefix: e.target.value})}
                    placeholder="INV-PB-"
                  />
                  <p className="text-xs text-slate-500">Contoh hasil: INV-PB-20241223-001</p>
                </div>
                <div className="space-y-2">
                  <Label>Prefix Retur Pembelian</Label>
                  <Input 
                    value={settings.purchase_return_prefix}
                    onChange={e => setSettings({...settings, purchase_return_prefix: e.target.value})}
                    placeholder="RET-PB-"
                  />
                  <p className="text-xs text-slate-500">Contoh hasil: RET-PB-20241223-001</p>
                </div>
                <div className="space-y-2">
                  <Label>Prefix Faktur Penjualan</Label>
                  <Input 
                    value={settings.sales_invoice_prefix}
                    onChange={e => setSettings({...settings, sales_invoice_prefix: e.target.value})}
                    placeholder="INV-PJ-"
                  />
                  <p className="text-xs text-slate-500">Contoh hasil: INV-PJ-20241223-001</p>
                </div>
                <div className="space-y-2">
                  <Label>Prefix Retur Penjualan</Label>
                  <Input 
                    value={settings.sales_return_prefix}
                    onChange={e => setSettings({...settings, sales_return_prefix: e.target.value})}
                    placeholder="RET-PJ-"
                  />
                  <p className="text-xs text-slate-500">Contoh hasil: RET-PJ-20241223-001</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipt" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Konfigurasi Struk</CardTitle>
              <CardDescription>
                Atur tampilan struk belanja untuk printer thermal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Header Struk (Nama Toko/Alamat)</Label>
                <Input 
                  value={settings.receipt_header}
                  onChange={e => setSettings({...settings, receipt_header: e.target.value})}
                  placeholder="Koperasi Sejahtera..."
                />
              </div>
              <div className="space-y-2">
                <Label>Footer Struk (Ucapan)</Label>
                <Input 
                  value={settings.receipt_footer}
                  onChange={e => setSettings({...settings, receipt_footer: e.target.value})}
                  placeholder="Terima Kasih..."
                />
              </div>
              <div className="space-y-2">
                <Label>Lebar Kertas (mm)</Label>
                <Input 
                  type="number"
                  value={settings.receipt_width}
                  onChange={e => setSettings({...settings, receipt_width: Number(e.target.value)})}
                  placeholder="80"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Simpan Pengaturan
        </Button>
      </div>
    </form>
  );
}
