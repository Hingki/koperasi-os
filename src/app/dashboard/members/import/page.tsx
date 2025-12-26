'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function MemberImportPage() {
  const [data, setData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const jsonData = XLSX.utils.sheet_to_json(ws);
      validateData(jsonData);
    };
    reader.readAsBinaryString(file);
  };

  const validateData = (rows: any[]) => {
    const newErrors: string[] = [];
    const validRows: any[] = [];

    rows.forEach((row, index) => {
      const rowNum = index + 2; // +2 because Excel header is 1, and index starts at 0
      
      // Basic Validation
      if (!row['Nama Lengkap']) newErrors.push(`Baris ${rowNum}: Nama Lengkap wajib diisi.`);
      if (!row['NIK']) newErrors.push(`Baris ${rowNum}: NIK wajib diisi.`);
      else if (String(row['NIK']).length !== 16) newErrors.push(`Baris ${rowNum}: NIK harus 16 digit.`);
      
      // Duplicate Check in Current Batch
      const isDuplicateInBatch = validRows.some(r => r['NIK'] === row['NIK']);
      if (isDuplicateInBatch) newErrors.push(`Baris ${rowNum}: NIK ${row['NIK']} duplikat di file ini.`);

      validRows.push(row);
    });

    setErrors(newErrors);
    setData(validRows);
  };

  const handleImport = async () => {
    if (errors.length > 0) return;
    setLoading(true);

    try {
        // Fetch Koperasi ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Unauthorized");

        const { data: kop } = await supabase.from('koperasi').select('id').limit(1).single();
        if (!kop) throw new Error("Koperasi not found");

        const membersToInsert = data.map(row => ({
            koperasi_id: kop.id,
            nama_lengkap: row['Nama Lengkap'],
            nik: String(row['NIK']),
            phone: String(row['No HP'] || ''),
            alamat_lengkap: row['Alamat'] || '',
            nama_ibu_kandung: row['Nama Ibu Kandung'] || '',
            tempat_lahir: row['Tempat Lahir'] || '',
            tanggal_lahir: row['Tanggal Lahir (YYYY-MM-DD)'] ? new Date(row['Tanggal Lahir (YYYY-MM-DD)']).toISOString() : null,
            pekerjaan: row['Pekerjaan'] || '',
            nomor_anggota: row['No Anggota'] || `M-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
            status: 'active',
            tanggal_daftar: new Date().toISOString()
        }));

        const { error } = await supabase.from('member').insert(membersToInsert);
        if (error) throw error;

        alert('Import berhasil! ' + membersToInsert.length + ' anggota ditambahkan.');
        router.push('/dashboard/members');
        router.refresh();

    } catch (err: any) {
        setErrors([err.message]);
    } finally {
        setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
        { 
            'Nama Lengkap': 'Budi Santoso', 
            'NIK': '3201123456789001', 
            'No HP': '081234567890',
            'Alamat': 'Jl. Mawar No. 10',
            'Tempat Lahir': 'Jakarta',
            'Tanggal Lahir (YYYY-MM-DD)': '1980-01-01',
            'Nama Ibu Kandung': 'Siti Aminah',
            'Pekerjaan': 'Wiraswasta',
            'No Anggota': 'A-001' 
        }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Anggota");
    XLSX.writeFile(wb, "Template_Import_Anggota.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Import Data Anggota</h1>
        <button 
            onClick={downloadTemplate}
            className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-md hover:bg-slate-50 text-sm font-medium"
        >
            <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
            Download Template Excel
        </button>
      </div>

      <div className="bg-white p-8 rounded-lg border border-dashed border-slate-300 text-center">
        <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleFileUpload}
            className="hidden" 
            id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
            <div className="h-12 w-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-sm font-medium text-slate-900">Klik untuk upload file Excel</span>
            <span className="text-xs text-slate-500 mt-1">Format .xlsx atau .xls</span>
        </label>
      </div>

      {/* Validation Results */}
      {(data.length > 0 || errors.length > 0) && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="font-semibold">Hasil Validasi</h3>
                <div className="flex space-x-4 text-sm">
                    <span className="flex items-center text-green-600">
                        <CheckCircle className="w-4 h-4 mr-1" /> {data.length} Valid
                    </span>
                    <span className="flex items-center text-red-600">
                        <X className="w-4 h-4 mr-1" /> {errors.length} Error
                    </span>
                </div>
            </div>
            
            <div className="p-4 space-y-4">
                {errors.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-md border border-red-100">
                        <h4 className="text-sm font-bold text-red-800 mb-2 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" /> Perbaiki error berikut sebelum import:
                        </h4>
                        <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                            {errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                            {errors.length > 5 && <li>...dan {errors.length - 5} error lainnya.</li>}
                        </ul>
                    </div>
                )}

                {data.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-500">
                                <tr>
                                    <th className="px-4 py-2">Nama</th>
                                    <th className="px-4 py-2">NIK</th>
                                    <th className="px-4 py-2">No HP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.slice(0, 5).map((row, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="px-4 py-2">{row['Nama Lengkap']}</td>
                                        <td className="px-4 py-2 font-mono">{row['NIK']}</td>
                                        <td className="px-4 py-2">{row['No HP']}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {data.length > 5 && <p className="text-xs text-slate-500 mt-2 text-center">Menampilkan 5 dari {data.length} data.</p>}
                    </div>
                )}
            </div>

            <div className="p-4 border-t bg-slate-50 flex justify-end">
                <button 
                    onClick={handleImport}
                    disabled={errors.length > 0 || loading || data.length === 0}
                    className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                    {loading ? 'Mengimport...' : 'Proses Import Sekarang'}
                </button>
            </div>
        </div>
      )}
    </div>
  );
}
