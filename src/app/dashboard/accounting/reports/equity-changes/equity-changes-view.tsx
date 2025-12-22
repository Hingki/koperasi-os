'use client';

import { Separator } from '@/components/ui/separator';
import { PrintButton } from '@/components/common/print-button';

interface EquityChangesViewProps {
  data: any;
}

export function EquityChangesView({ data }: EquityChangesViewProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan Perubahan Ekuitas</h1>
          <p className="text-muted-foreground">
            Periode Berjalan
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow print:border-none print:shadow-none bg-white">
        <div className="p-6 text-center border-b">
          <h2 className="text-xl font-bold">KOPERASI OPEN SOURCE</h2>
          <h3 className="text-lg font-medium">Laporan Perubahan Ekuitas</h3>
          <p className="text-sm text-muted-foreground">Per {new Date().toLocaleDateString('id-ID')}</p>
        </div>
        <div className="p-6">
            <div className="space-y-6">
                
                {/* 1. Saldo Awal */}
                <div>
                    <div className="flex justify-between font-semibold text-lg">
                        <span>Saldo Awal Ekuitas</span>
                        <span>{formatCurrency(data.summary.beginningBalance)}</span>
                    </div>
                </div>

                <Separator />

                {/* 2. Perubahan Ekuitas */}
                <div>
                    <h3 className="font-semibold mb-4 text-slate-800">Perubahan Selama Periode</h3>
                    
                    {/* Modal Disetor */}
                    <div className="mb-6">
                        <div className="font-medium text-slate-700 mb-2">Modal Disetor</div>
                        {data.paidInCapital.accounts.map((acc: any) => (
                            <div key={acc.id} className="flex justify-between text-sm ml-4 py-1">
                                <span>{acc.account_name} <span className="text-slate-400 text-xs">({acc.account_code})</span></span>
                                <span>{formatCurrency(acc.normal_balance === 'credit' ? acc.balance : -acc.balance)}</span>
                            </div>
                        ))}
                        <div className="flex justify-between font-medium border-t border-dashed pt-2 ml-4 mt-2">
                            <span>Total Modal Disetor</span>
                            <span>{formatCurrency(data.paidInCapital.total)}</span>
                        </div>
                    </div>

                    {/* Laba Ditahan */}
                    <div className="mb-6">
                        <div className="font-medium text-slate-700 mb-2">Saldo Laba / Cadangan</div>
                        {data.retainedEarnings.accounts.map((acc: any) => (
                            <div key={acc.id} className="flex justify-between text-sm ml-4 py-1">
                                <span>{acc.account_name} <span className="text-slate-400 text-xs">({acc.account_code})</span></span>
                                <span>{formatCurrency(acc.normal_balance === 'credit' ? acc.balance : -acc.balance)}</span>
                            </div>
                        ))}
                         {data.retainedEarnings.accounts.length === 0 && (
                             <div className="text-sm ml-4 text-slate-400 italic">Tidak ada data</div>
                         )}
                        <div className="flex justify-between font-medium border-t border-dashed pt-2 ml-4 mt-2">
                            <span>Total Saldo Laba</span>
                            <span>{formatCurrency(data.retainedEarnings.total)}</span>
                        </div>
                    </div>

                     {/* SHU Tahun Berjalan */}
                     <div className="mb-6">
                        <div className="font-medium text-slate-700 mb-2">SHU Tahun Berjalan</div>
                        <div className="flex justify-between text-sm ml-4 py-1">
                                <span>Laba/Rugi Bersih Periode Ini</span>
                                <span>{formatCurrency(data.currentEarnings.total)}</span>
                        </div>
                    </div>

                </div>

                <Separator className="my-4" />

                {/* 3. Saldo Akhir */}
                 <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="flex justify-between font-bold text-lg text-primary">
                        <span>Saldo Akhir Ekuitas</span>
                        <span>{formatCurrency(data.summary.endingBalance)}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
