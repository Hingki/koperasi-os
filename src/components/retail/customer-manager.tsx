'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Pencil, Trash2, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface RetailCustomer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  is_active: boolean;
}

interface Props {
  initialCustomers: RetailCustomer[];
  koperasiId: string;
}

export function CustomerManager({ initialCustomers, koperasiId }: Props) {
  const [customers, setCustomers] = useState<RetailCustomer[]>(initialCustomers || []);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  function resetForm() {
    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setIsEditing(null);
    setIsFormOpen(false);
  }

  function handleEdit(customer: RetailCustomer) {
    setName(customer.name);
    setPhone(customer.phone || '');
    setAddress(customer.address || '');
    setNotes(customer.notes || '');
    setIsEditing(customer.id);
    setIsFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        koperasi_id: koperasiId,
        name,
        phone,
        address,
        notes,
      };

      let res;
      if (isEditing) {
        res = await fetch(`/api/retail/customers/${isEditing}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/retail/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Terjadi kesalahan');

      if (isEditing) {
        setCustomers(customers.map(c => c.id === isEditing ? json.data : c));
      } else {
        setCustomers([json.data, ...customers]);
      }

      resetForm();
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Apakah Anda yakin ingin menghapus pelanggan ini?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/retail/customers/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ koperasi_id: koperasiId }),
      });

      if (!res.ok) throw new Error('Gagal menghapus');

      setCustomers(customers.filter(c => c.id !== id));
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {!isFormOpen && (
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Tambah Pelanggan
        </Button>
      )}

      {isFormOpen && (
        <div className="bg-slate-50 border rounded-lg p-4 max-w-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">{isEditing ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}</h3>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Lengkap *</label>
                <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Budi Santoso" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">No. Telepon</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0812..." />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Alamat</label>
              <Textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Alamat lengkap..." rows={2} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Catatan</label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan tambahan (opsional)" />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetForm} disabled={loading}>Batal</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Simpan Perubahan' : 'Simpan Pelanggan'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-4">Nama Pelanggan</th>
              <th className="px-6 py-4">Kontak</th>
              <th className="px-6 py-4">Alamat</th>
              <th className="px-6 py-4">Catatan</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  Belum ada data pelanggan.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{customer.name}</td>
                  <td className="px-6 py-4 text-slate-600">{customer.phone || '-'}</td>
                  <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{customer.address || '-'}</td>
                  <td className="px-6 py-4 text-slate-500">{customer.notes || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(customer)}>
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(customer.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
