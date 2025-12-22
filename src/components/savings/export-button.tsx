'use client';

import { FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ExportSavingsButton({ data }: { data: any[] }) {
    const handleExport = () => {
        const rows = data.map(item => ({
            'No. Rekening': item.account_number,
            'Nama Anggota': item.member?.nama_lengkap,
            'Nomor Anggota': item.member?.nomor_anggota,
            'Produk': item.product?.name,
            'Saldo': item.balance,
            'Status': item.status,
            'Tanggal Buka': new Date(item.opened_at).toLocaleDateString('id-ID'),
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Simpanan");
        XLSX.writeFile(wb, "Data_Simpanan_Koperasi.xlsx");
    };

    return (
        <button 
            onClick={handleExport}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 h-10 px-4 py-2"
        >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
        </button>
    );
}
