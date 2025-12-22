'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Receipt, Search, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BillingItem {
  id: string;
  due_date: string;
  amount_total: number;
  principal_amount: number;
  interest_amount: number;
  status: string;
  installment_number: number;
  loan: {
    account_number: string;
    member_name: string;
    member_number: string;
  };
}

interface BillingViewProps {
  month: number;
  year: number;
  items: BillingItem[];
}

export function BillingView({ month, year, items }: BillingViewProps) {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState(month.toString());
  const [selectedYear, setSelectedYear] = useState(year.toString());
  const [isNavigating, setIsNavigating] = useState(false);

  const applyFilter = () => {
    setIsNavigating(true);
    router.push(`/dashboard/accounting/reports/billing?month=${selectedMonth}&year=${selectedYear}`);
  };

  const downloadExcel = () => {
    const data = items.map(item => ({
        'Jatuh Tempo': new Date(item.due_date).toLocaleDateString('id-ID'),
        'No. Anggota': item.loan.member_number,
        'Nama Anggota': item.loan.member_name,
        'No. Pinjaman': item.loan.account_number,
        'Angsuran Ke': item.installment_number,
        'Pokok': item.principal_amount,
        'Bunga': item.interest_amount,
        'Total Tagihan': item.amount_total,
        'Status': item.status === 'paid' ? 'Lunas' : 'Belum Lunas'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Tagihan");
    XLSX.writeFile(wb, `Rekap_Tagihan_${selectedMonth}_${selectedYear}.xlsx`);
  };

  const totalBilled = items.reduce((sum, i) => sum + i.amount_total, 0);
  const totalPaid = items.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount_total, 0);
  const totalPending = items.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.amount_total, 0);

  const months = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center bg-white p-4 rounded-lg border shadow-sm print:hidden">
        <div className="flex gap-4 items-end">
            <div className="space-y-1">
                <label className="text-sm font-medium">Bulan</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium">Tahun</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[100px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <Button onClick={applyFilter} disabled={isNavigating}>
                <Search className="h-4 w-4 mr-2" />
                Tampilkan
            </Button>
            <Button variant="outline" onClick={downloadExcel}>
                <Download className="h-4 w-4 mr-2" />
                Excel
            </Button>
        </div>

        <div className="ml-auto flex gap-6 text-sm">
             <div className="flex flex-col items-end">
                <span className="text-muted-foreground">Total Tagihan</span>
                <span className="font-bold text-lg">{formatCurrency(totalBilled)}</span>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-muted-foreground">Terbayar</span>
                <span className="font-bold text-lg text-green-600">{formatCurrency(totalPaid)}</span>
            </div>
             <div className="flex flex-col items-end">
                <span className="text-muted-foreground">Sisa Tagihan</span>
                <span className="font-bold text-lg text-red-600">{formatCurrency(totalPending)}</span>
            </div>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3 border-b bg-slate-50/50">
            <CardTitle className="text-base font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4 text-slate-500" />
                Daftar Tagihan (Angsuran Pinjaman)
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
             <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm text-left">
                    <thead className="[&_tr]:border-b bg-slate-50">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Jatuh Tempo</th>
                            <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Anggota</th>
                            <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Pinjaman</th>
                            <th className="h-10 px-4 align-middle font-medium text-muted-foreground text-right">Pokok</th>
                            <th className="h-10 px-4 align-middle font-medium text-muted-foreground text-right">Bunga</th>
                            <th className="h-10 px-4 align-middle font-medium text-muted-foreground text-right">Total</th>
                            <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Status</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {items.length === 0 ? (
                             <tr>
                                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                    Tidak ada tagihan pada periode ini.
                                </td>
                            </tr>
                        ) : (
                            items.map(item => (
                                <tr key={item.id} className="border-b transition-colors hover:bg-slate-50/50">
                                    <td className="p-4 align-middle font-medium">
                                        {new Date(item.due_date).toLocaleDateString('id-ID')}
                                    </td>
                                    <td className="p-4 align-middle">
                                        <div className="font-medium">{item.loan.member_name}</div>
                                        <div className="text-xs text-slate-500">{item.loan.member_number}</div>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <div className="font-mono text-xs">{item.loan.account_number}</div>
                                        <div className="text-xs text-slate-500">Ke-{item.installment_number}</div>
                                    </td>
                                    <td className="p-4 align-middle text-right text-slate-600">
                                        {formatCurrency(item.principal_amount)}
                                    </td>
                                    <td className="p-4 align-middle text-right text-slate-600">
                                        {formatCurrency(item.interest_amount)}
                                    </td>
                                    <td className="p-4 align-middle text-right font-medium">
                                        {formatCurrency(item.amount_total)}
                                    </td>
                                    <td className="p-4 align-middle">
                                        {item.status === 'paid' ? (
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Lunas</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-slate-500">Belum Lunas</Badge>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
