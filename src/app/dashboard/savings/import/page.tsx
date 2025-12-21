'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SavingsImportPage() {
  const [data, setData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Fetch products for validation
    async function loadProducts() {
        const { data } = await supabase.from('savings_products').select('id, name, code');
        if (data) setProducts(data);
    }
    loadProducts();
  }, []);

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

  const validateData = async (rows: any[]) => {
    const newErrors: string[] = [];
    const validRows: any[] = [];
    
    // Fetch all members to check existence (for small scale MVP this is fine)
    const { data: members } = await supabase.from('member').select('id, nomor_anggota, nik');

    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const rowNum = index + 2;
        
        // 1. Check Required Fields
        if (!row['Nomor Anggota']) newErrors.push(`Baris ${rowNum}: Nomor Anggota wajib diisi.`);
        if (!row['Kode Produk']) newErrors.push(`Baris ${rowNum}: Kode Produk wajib diisi.`);
        if (row['Saldo Awal'] === undefined) newErrors.push(`Baris ${rowNum}: Saldo Awal wajib diisi.`);
        
        // 2. Check Member Existence
        const member = members?.find(m => m.nomor_anggota === row['Nomor Anggota']);
        if (!member) {
            newErrors.push(`Baris ${rowNum}: Anggota dengan nomor ${row['Nomor Anggota']} tidak ditemukan.`);
        }

        // 3. Check Product Existence
        // For now, if no products exist, we might skip strict check or warn. 
        // Ideally we check against `products` state.
        if (products.length > 0) {
            const product = products.find(p => p.code === row['Kode Produk']);
            if (!product) {
                newErrors.push(`Baris ${rowNum}: Produk dengan kode ${row['Kode Produk']} tidak ditemukan.`);
            }
        }

        if (member) {
             validRows.push({
                 ...row,
                 member_id: member.id,
                 // product_id will be resolved during import based on code
             });
        }
    }

    setErrors(newErrors);
    setData(validRows);
  };

  const handleImport = async () => {
    if (errors.length > 0) return;
    setLoading(true);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Unauthorized");
        
        const { data: kop } = await supabase.from('koperasi').select('id').limit(1).single();
        if (!kop) throw new Error("Koperasi not found");

        let importedCount = 0;

        for (const row of data) {
            // Resolve Product ID
            const product = products.find(p => p.code === row['Kode Produk']);
            if (!product) continue; // Should be caught in validation, but safe guard

            // Insert Account
            const { error } = await supabase.from('savings_accounts').insert({
                koperasi_id: kop.id,
                member_id: row.member_id,
                product_id: product.id,
                account_number: `SAV-${row['Nomor Anggota']}-${product.code}`, // Simple auto-gen
                balance: Number(row['Saldo Awal']),
                status: 'active',
                opened_at: new Date().toISOString()
            });

            if (error) throw error;
            importedCount++;
        }

        alert(`Import berhasil! ${importedCount} rekening simpanan ditambahkan.`);
        router.push('/dashboard/savings');
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
            'Nomor Anggota': 'A-001', 
            'Kode Produk': 'SW-01', 
            'Saldo Awal': 100000,
            'Keterangan': 'Saldo Migrasi'
        },
        { 
            'Nomor Anggota': 'A-002', 
            'Kode Produk': 'SP-01', 
            'Saldo Awal': 500000,
            'Keterangan': 'Saldo Migrasi'
        }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Saldo");
    XLSX.writeFile(wb, "Template_Import_Saldo.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/savings" className="p-2 hover:bg-slate-100 rounded-full" aria-label="Kembali">
            <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Import Saldo Simpanan</h1>
      </div>
      
      <div className="flex justify-between items-center">
        <p className="text-slate-500">Pastikan Kode Produk sesuai dengan yang ada di sistem (Contoh: SW-01 untuk Simpanan Wajib).</p>
        <button 
            onClick={downloadTemplate}
            className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-md hover:bg-slate-50 text-sm font-medium"
        >
            <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
            Download Template
        </button>
      </div>

      <div className="bg-white p-8 rounded-lg border border-dashed border-slate-300 text-center">
        <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleFileUpload}
            className="hidden" 
            id="file-upload-savings"
        />
        <label htmlFor="file-upload-savings" className="cursor-pointer flex flex-col items-center">
            <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-blue-600" />
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
                            <AlertCircle className="w-4 h-4 mr-2" /> Perbaiki error berikut:
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
                                    <th className="px-4 py-2">No. Anggota</th>
                                    <th className="px-4 py-2">Kode Produk</th>
                                    <th className="px-4 py-2 text-right">Saldo Awal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.slice(0, 5).map((row, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="px-4 py-2 font-mono">{row['Nomor Anggota']}</td>
                                        <td className="px-4 py-2">{row['Kode Produk']}</td>
                                        <td className="px-4 py-2 text-right">
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(row['Saldo Awal'])}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="p-4 border-t bg-slate-50 flex justify-end">
                <button 
                    onClick={handleImport}
                    disabled={errors.length > 0 || loading || data.length === 0}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                    {loading ? 'Menyimpan...' : 'Simpan Saldo'}
                </button>
            </div>
        </div>
      )}
    </div>
  );
}
