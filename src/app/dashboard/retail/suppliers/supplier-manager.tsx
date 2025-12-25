'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InventorySupplier } from '@/lib/services/retail-service';
import { createSupplier, updateSupplier, deleteSupplier } from '@/lib/actions/retail';
import { Pencil, Trash2, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface SupplierManagerProps {
  suppliers: InventorySupplier[];
}

export function SupplierManager({ suppliers }: SupplierManagerProps) {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: ''
    });
    setEditingId(null);
  };

  const handleEdit = (supplier: InventorySupplier) => {
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || ''
    });
    setEditingId(supplier.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });

    try {
      if (editingId) {
        await updateSupplier(editingId, data);
        toast({ title: 'Berhasil', description: 'Data supplier diperbarui' });
      } else {
        await createSupplier(data);
        toast({ title: 'Berhasil', description: 'Supplier baru ditambahkan' });
      }
      resetForm();
    } catch (error) {
      toast({ title: 'Gagal', description: 'Terjadi kesalahan', variant: 'destructive' });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus supplier ini?')) return;
    
    try {
      await deleteSupplier(id);
      toast({ title: 'Berhasil', description: 'Supplier dihapus' });
    } catch (error) {
      toast({ title: 'Gagal', description: 'Gagal menghapus supplier', variant: 'destructive' });
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
        {/* Form Create/Edit */}
        <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-lg border shadow-sm sticky top-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">
                        {editingId ? 'Edit Supplier' : 'Tambah Supplier Baru'}
                    </h3>
                    {editingId && (
                        <Button variant="ghost" size="sm" onClick={resetForm}>
                            <X className="h-4 w-4" /> Batal
                        </Button>
                    )}
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">Nama Supplier <span className="text-red-500">*</span></label>
                        <Input 
                            id="name" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required 
                            placeholder="Contoh: PT. Sumber Makmur" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="contact_person" className="text-sm font-medium">Kontak Person</label>
                        <Input 
                            id="contact_person" 
                            value={formData.contact_person}
                            onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                            placeholder="Nama sales/PIC" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="phone" className="text-sm font-medium">No. Telepon</label>
                        <Input 
                            id="phone" 
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            placeholder="0812..." 
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">Email</label>
                        <Input 
                            id="email" 
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            placeholder="email@supplier.com" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="address" className="text-sm font-medium">Alamat</label>
                        <Input 
                            id="address" 
                            value={formData.address}
                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                            placeholder="Alamat lengkap..." 
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Simpan')}
                    </Button>
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
                            <th className="px-6 py-4 text-center">Aksi</th>
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
                            suppliers.map((s) => (
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
                                        <div className="flex justify-center gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}>
                                                <Pencil className="h-4 w-4 text-slate-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
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
    </div>
  );
}
