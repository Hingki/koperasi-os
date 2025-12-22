'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExportLoansButtonProps {
    loans: any[];
}

export default function ExportLoansButton({ loans }: ExportLoansButtonProps) {
    const handleExport = () => {
        const data = loans.map(loan => ({
            'No. Referensi': loan.id.substring(0, 8),
            'Tanggal Pengajuan': new Date(loan.created_at).toLocaleDateString('id-ID'),
            'Anggota': loan.member?.nama_lengkap,
            'No. Anggota': loan.member?.nomor_anggota,
            'Jenis Pinjaman': loan.product?.name,
            'Jumlah Pinjaman': loan.amount,
            'Tenor (Bulan)': loan.tenor_months,
            'Status': loan.status,
            'Tanggal Cair': loan.disbursed_at ? new Date(loan.disbursed_at).toLocaleDateString('id-ID') : '-',
            'Sisa Pokok': loan.loans?.[0]?.remaining_principal || 0
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);

        // Auto-width cols
        const colWidths = [
            { wch: 15 }, // Ref
            { wch: 15 }, // Date
            { wch: 25 }, // Name
            { wch: 15 }, // Member No
            { wch: 20 }, // Product
            { wch: 15 }, // Amount
            { wch: 10 }, // Tenor
            { wch: 12 }, // Status
            { wch: 15 }, // Disbursed
            { wch: 15 }, // Remaining
        ];
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, "Data Pinjaman");
        XLSX.writeFile(wb, `Laporan_Pinjaman_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Unduh Excel
        </Button>
    );
}
