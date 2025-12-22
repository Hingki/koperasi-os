'use client';

import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CashFlowData {
  operating: {
    netProfit: number;
    adjustments: {
      receivables: number;
      otherCurrentAssets: number;
      currentLiabilities: number;
    };
    total: number;
  };
  investing: {
    fixedAssets: number;
    total: number;
  };
  financing: {
    longTermLiabilities: number;
    equity: number;
    total: number;
  };
  summary: {
    netChange: number;
    beginningBalance: number;
    endingBalance: number;
    actualBalance: number;
    discrepancy: number;
  };
}

export function CashFlowView({ data }: { data: CashFlowData }) {
  const SectionRow = ({ title, amount, indent = false, isTotal = false }: { title: string, amount: number, indent?: boolean, isTotal?: boolean }) => (
    <div className={`flex justify-between py-1 text-sm ${indent ? 'pl-4 text-slate-600' : 'text-slate-800'} ${isTotal ? 'font-semibold border-t mt-1 pt-1' : ''}`}>
      <span>{title}</span>
      <span>{formatCurrency(amount)}</span>
    </div>
  );

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Operating Activities */}
      <Card>
        <CardHeader className="bg-slate-50 py-3">
            <CardTitle className="text-lg text-blue-700">ARUS KAS DARI AKTIVITAS OPERASIONAL</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
            <SectionRow title="Laba Bersih Tahun Berjalan" amount={data.operating.netProfit} />
            
            <div className="py-2">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Penyesuaian Modal Kerja:</p>
                <SectionRow title="Perubahan Piutang Usaha" amount={data.operating.adjustments.receivables} indent />
                <SectionRow title="Perubahan Aset Lancar Lainnya" amount={data.operating.adjustments.otherCurrentAssets} indent />
                <SectionRow title="Perubahan Liabilitas Jangka Pendek" amount={data.operating.adjustments.currentLiabilities} indent />
            </div>

            <SectionRow title="Arus Kas Bersih dari Aktivitas Operasional" amount={data.operating.total} isTotal />
        </CardContent>
      </Card>

      {/* Investing Activities */}
      <Card>
        <CardHeader className="bg-slate-50 py-3">
            <CardTitle className="text-lg text-amber-700">ARUS KAS DARI AKTIVITAS INVESTASI</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
            <SectionRow title="Perolehan/Pelepasan Aset Tetap" amount={data.investing.fixedAssets} indent />
            <SectionRow title="Arus Kas Bersih dari Aktivitas Investasi" amount={data.investing.total} isTotal />
        </CardContent>
      </Card>

      {/* Financing Activities */}
      <Card>
        <CardHeader className="bg-slate-50 py-3">
            <CardTitle className="text-lg text-emerald-700">ARUS KAS DARI AKTIVITAS PENDANAAN</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
            <SectionRow title="Perubahan Liabilitas Jangka Panjang" amount={data.financing.longTermLiabilities} indent />
            <SectionRow title="Perubahan Ekuitas (Simpanan Pokok/Wajib)" amount={data.financing.equity} indent />
            <SectionRow title="Arus Kas Bersih dari Aktivitas Pendanaan" amount={data.financing.total} isTotal />
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader className="bg-slate-50 py-3">
            <CardTitle className="text-lg text-slate-800">RINGKASAN KAS</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
            <SectionRow title="Kenaikan/(Penurunan) Bersih Kas" amount={data.summary.netChange} />
            <SectionRow title="Saldo Kas Awal Periode" amount={data.summary.beginningBalance} />
            <div className="border-t-2 border-slate-800 my-2"></div>
            <div className="flex justify-between py-2 font-bold text-base">
                <span>Saldo Kas Akhir Periode (Hitungan)</span>
                <span>{formatCurrency(data.summary.endingBalance)}</span>
            </div>
            
            <div className="mt-4 p-3 bg-slate-100 rounded text-sm">
                <div className="flex justify-between font-medium">
                    <span>Saldo Kas di Neraca (Aktual)</span>
                    <span>{formatCurrency(data.summary.actualBalance)}</span>
                </div>
                {Math.abs(data.summary.discrepancy) > 1 && (
                     <div className="flex justify-between text-red-600 mt-1">
                        <span>Selisih (Perlu Rekonsiliasi)</span>
                        <span>{formatCurrency(data.summary.discrepancy)}</span>
                    </div>
                )}
                 {Math.abs(data.summary.discrepancy) <= 1 && (
                     <div className="flex justify-between text-green-600 mt-1">
                        <span>Status</span>
                        <span>Seimbang (Balanced)</span>
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
