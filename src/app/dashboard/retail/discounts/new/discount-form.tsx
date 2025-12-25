'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { createDiscountAction } from '@/lib/actions/retail';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

interface DiscountFormProps {
  koperasiId: string;
}

export default function DiscountForm({ koperasiId }: DiscountFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'percentage' as 'percentage' | 'fixed_amount',
    value: '',
    min_purchase_amount: '',
    start_date: '',
    end_date: '',
    is_active: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createDiscountAction({
        koperasi_id: koperasiId,
        name: formData.name,
        type: formData.type,
        value: Number(formData.value),
        min_purchase_amount: formData.min_purchase_amount ? Number(formData.min_purchase_amount) : 0,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        is_active: formData.is_active
      });
      router.push('/dashboard/retail/discounts');
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan diskon');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nama Diskon</Label>
              <Input 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Contoh: Diskon Akhir Tahun"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipe Diskon</Label>
              <Select 
                value={formData.type} 
                onValueChange={(val: 'percentage' | 'fixed_amount') => setFormData({...formData, type: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Persentase (%)</SelectItem>
                  <SelectItem value="fixed_amount">Nominal (Rp)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nilai Diskon</Label>
              <Input 
                type="number"
                required
                min="0"
                value={formData.value}
                onChange={e => setFormData({...formData, value: e.target.value})}
                placeholder={formData.type === 'percentage' ? 'Contoh: 10' : 'Contoh: 5000'}
              />
            </div>
            <div className="space-y-2">
              <Label>Minimal Pembelian (Opsional)</Label>
              <Input 
                type="number"
                min="0"
                value={formData.min_purchase_amount}
                onChange={e => setFormData({...formData, min_purchase_amount: e.target.value})}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Input 
                type="date"
                value={formData.start_date}
                onChange={e => setFormData({...formData, start_date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Berakhir</Label>
              <Input 
                type="date"
                value={formData.end_date}
                onChange={e => setFormData({...formData, end_date: e.target.value})}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch 
              id="active"
              checked={formData.is_active}
              onCheckedChange={(checked: boolean) => setFormData({...formData, is_active: checked})}
              />
            <Label htmlFor="active">Aktifkan Diskon</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Link href="/dashboard/retail/discounts">
          <Button type="button" variant="outline">Batal</Button>
        </Link>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Simpan Diskon
        </Button>
      </div>
    </form>
  );
}
