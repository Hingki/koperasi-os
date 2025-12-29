'use client';

import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';
import { exportToPDF, exportToExcel } from '@/lib/utils/export-utils';

interface ReportExportButtonsProps {
  data: any;
  reportType: 'income-statement' | 'balance-sheet' | 'cash-flow' | 'shu';
  period: string;
  koperasiName: string;
}

export function ReportExportButtons({ data, reportType, period, koperasiName }: ReportExportButtonsProps) {
  
  const handleExportPDF = () => {
    let title = '';
    let columns: string[] = [];
    let rows: any[][] = [];

    if (reportType === 'income-statement') {
      title = 'Laporan Laba Rugi';
      columns = ['Kode Akun', 'Nama Akun', 'Saldo'];
      
      // Helper to add section
      const addSection = (items: any[], sectionTitle: string) => {
        if (items.length > 0) {
            rows.push([sectionTitle.toUpperCase(), '', '']);
            items.forEach((item: any) => {
                rows.push([item.account_code, item.account_name, new Intl.NumberFormat('id-ID').format(item.balance)]);
            });
        }
      };

      addSection(data.revenue.operating, 'Pendapatan Operasional');
      addSection(data.revenue.other, 'Pendapatan Lainnya');
      rows.push(['TOTAL PENDAPATAN', '', new Intl.NumberFormat('id-ID').format(data.revenue.total)]);

      addSection(data.expenses.operating, 'Beban Operasional');
      addSection(data.expenses.other, 'Beban Lainnya');
      rows.push(['TOTAL BEBAN', '', new Intl.NumberFormat('id-ID').format(data.expenses.total)]);

      rows.push(['', '', '']);
      rows.push(['LABA BERSIH (SHU)', '', new Intl.NumberFormat('id-ID').format(data.netProfit)]);
    } 
    else if (reportType === 'balance-sheet') {
        title = 'Laporan Neraca';
        columns = ['Kode Akun', 'Nama Akun', 'Saldo'];
        
        const addSection = (items: any[], sectionTitle: string) => {
             rows.push([sectionTitle.toUpperCase(), '', '']);
             items.forEach((item: any) => {
                rows.push([item.account_code, item.account_name, new Intl.NumberFormat('id-ID').format(item.balance)]);
             });
        };

        addSection(data.assets.current, 'Aset Lancar');
        addSection(data.assets.nonCurrent, 'Aset Tidak Lancar');
        rows.push(['TOTAL ASET', '', new Intl.NumberFormat('id-ID').format(data.assets.total)]);

        addSection(data.liabilities.current, 'Kewajiban Lancar');
        addSection(data.liabilities.longTerm, 'Kewajiban Jangka Panjang');
        rows.push(['TOTAL KEWAJIBAN', '', new Intl.NumberFormat('id-ID').format(data.liabilities.total)]);

        addSection(data.equity.accounts, 'Ekuitas');
        rows.push(['SHU Tahun Berjalan', '', new Intl.NumberFormat('id-ID').format(data.equity.currentEarnings)]);
        rows.push(['TOTAL EKUITAS', '', new Intl.NumberFormat('id-ID').format(data.equity.total)]);
    }
    else if (reportType === 'shu') {
        title = 'Estimasi SHU';
        columns = ['Keterangan', 'Nilai'];
        rows.push(['Laba Bersih (SHU)', new Intl.NumberFormat('id-ID').format(data.netProfit)]);
        // SHU report data structure might be simpler or just the net profit for now
    }

    exportToPDF({ title, period, entityName: koperasiName }, columns, rows, `${reportType}-${period}`);
  };

  const handleExportExcel = () => {
    let title = '';
    let flatData: any[] = [];

    if (reportType === 'income-statement') {
        title = 'Laporan Laba Rugi';
        // Flatten for Excel
        const processItems = (items: any[], type: string) => items.map((item: any) => ({
            Kategori: type,
            Kode: item.account_code,
            Akun: item.account_name,
            Saldo: item.balance
        }));

        flatData = [
            ...processItems(data.revenue.operating, 'Pendapatan Operasional'),
            ...processItems(data.revenue.other, 'Pendapatan Lainnya'),
            ...processItems(data.expenses.operating, 'Beban Operasional'),
            ...processItems(data.expenses.other, 'Beban Lainnya'),
            { Kategori: 'SUMMARY', Akun: 'Laba Bersih', Saldo: data.netProfit }
        ];
    }
    else if (reportType === 'balance-sheet') {
        title = 'Laporan Neraca';
        const processItems = (items: any[], type: string) => items.map((item: any) => ({
            Kategori: type,
            Kode: item.account_code,
            Akun: item.account_name,
            Saldo: item.balance
        }));
        
        flatData = [
            ...processItems(data.assets.current, 'Aset Lancar'),
            ...processItems(data.assets.nonCurrent, 'Aset Tidak Lancar'),
            ...processItems(data.liabilities.current, 'Kewajiban Lancar'),
            ...processItems(data.liabilities.longTerm, 'Kewajiban Jangka Panjang'),
            ...processItems(data.equity.accounts, 'Ekuitas'),
            { Kategori: 'Ekuitas', Akun: 'SHU Tahun Berjalan', Saldo: data.equity.currentEarnings }
        ];
    }

    exportToExcel({ title, period, entityName: koperasiName }, flatData, `${reportType}-${period}`);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleExportPDF}>
        <Download className="mr-2 h-4 w-4" /> PDF
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportExcel}>
        <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
      </Button>
    </div>
  );
}
