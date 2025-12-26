'use client';

import { useState } from 'react';
import { updateKoperasiSettings } from '@/lib/actions/koperasi';
import { Koperasi } from '@/lib/types/koperasi';
import { Building, Save, AlertCircle } from 'lucide-react';

interface KoperasiProfileFormProps {
  initialData: Koperasi | null;
}

export function KoperasiProfileForm({ initialData }: KoperasiProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);
    try {
      await updateKoperasiSettings(formData);
      setMessage({ type: 'success', text: 'Profil koperasi berhasil diperbarui' });
      // Reload page to reflect changes
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: error.message || 'Gagal menyimpan perubahan' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center">
          <Building className="w-5 h-5 mr-2 text-slate-500" />
          Profil Koperasi
        </h2>
      </div>

      {message && (
        <div className={`p-4 rounded-md mb-6 flex items-center ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'error' && <AlertCircle className="w-5 h-5 mr-2" />}
          {message.text}
        </div>
      )}

      <form action={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="nama" className="text-sm font-medium text-slate-700">Nama Koperasi</label>
            <input
              id="nama"
              name="nama"
              defaultValue={initialData?.nama}
              placeholder="Contoh: Koperasi Merah Putih"
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="nomor_badan_hukum" className="text-sm font-medium text-slate-700">Nomor Badan Hukum</label>
            <input
              id="nomor_badan_hukum"
              name="nomor_badan_hukum"
              defaultValue={initialData?.nomor_badan_hukum}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="tanggal_berdiri" className="text-sm font-medium text-slate-700">Tanggal Berdiri</label>
            <input
              id="tanggal_berdiri"
              type="date"
              name="tanggal_berdiri"
              defaultValue={initialData?.tanggal_berdiri ? new Date(initialData.tanggal_berdiri).toISOString().split('T')[0] : ''}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="npwp" className="text-sm font-medium text-slate-700">NPWP</label>
            <input
              id="npwp"
              name="npwp"
              defaultValue={initialData?.npwp}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="alamat" className="text-sm font-medium text-slate-700">Alamat Lengkap</label>
          <textarea
            id="alamat"
            name="alamat"
            defaultValue={initialData?.alamat}
            required
            rows={3}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="kelurahan" className="text-sm font-medium text-slate-700">Kelurahan</label>
            <input
              id="kelurahan"
              name="kelurahan"
              defaultValue={initialData?.kelurahan}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="kecamatan" className="text-sm font-medium text-slate-700">Kecamatan</label>
            <input
              id="kecamatan"
              name="kecamatan"
              defaultValue={initialData?.kecamatan}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="kota" className="text-sm font-medium text-slate-700">Kota/Kabupaten</label>
            <input
              id="kota"
              name="kota"
              defaultValue={initialData?.kota}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="provinsi" className="text-sm font-medium text-slate-700">Provinsi</label>
            <input
              id="provinsi"
              name="provinsi"
              defaultValue={initialData?.provinsi}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </div>
  );
}
