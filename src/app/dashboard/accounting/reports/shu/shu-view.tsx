'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, AlertCircle } from 'lucide-react';

interface SHUViewProps {
  netProfit: number;
}

interface AllocationItem {
  id: string;
  name: string;
  percentage: number; // 0-100
  description: string;
}

const DEFAULT_ALLOCATIONS: AllocationItem[] = [
  { id: 'reserve', name: 'Dana Cadangan', percentage: 25, description: 'Penguatan modal koperasi' },
  { id: 'member', name: 'Jasa Anggota', percentage: 40, description: 'Dibagi ke anggota (Modal & Usaha)' },
  { id: 'board', name: 'Dana Pengurus', percentage: 5, description: 'Insentif pengurus' },
  { id: 'employee', name: 'Dana Karyawan', percentage: 5, description: 'Kesejahteraan karyawan' },
  { id: 'education', name: 'Dana Pendidikan', percentage: 5, description: 'Pendidikan perkoperasian' },
  { id: 'social', name: 'Dana Sosial', percentage: 5, description: 'Kegiatan sosial kemasyarakatan' },
  { id: 'development', name: 'Dana Pembangunan', percentage: 15, description: 'Pengembangan daerah kerja' },
];

export function SHUView({ netProfit }: SHUViewProps) {
  const [allocations, setAllocations] = useState<AllocationItem[]>(DEFAULT_ALLOCATIONS);
  const [baseSHU, setBaseSHU] = useState<number>(netProfit);

  // Sync with prop, but allow override if user wants to simulate
  useEffect(() => {
    setBaseSHU(netProfit);
  }, [netProfit]);

  const handlePercentageChange = (id: string, newPercent: string) => {
    const val = parseFloat(newPercent) || 0;
    setAllocations(prev => prev.map(item => 
      item.id === id ? { ...item, percentage: val } : item
    ));
  };

  const totalPercentage = allocations.reduce((sum, item) => sum + item.percentage, 0);
  
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const isLoss = baseSHU < 0;

  return (
    <div className="space-y-6">
      {/* SHU Summary Card */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sisa Hasil Usaha (Net Profit)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isLoss ? 'text-red-600' : 'text-green-600'}`}>
              {formatMoney(baseSHU)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sumber: Laporan Laba Rugi Periode Berjalan
            </p>
          </CardContent>
        </Card>

        <Card>
           <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Alokasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPercentage !== 100 ? 'text-amber-600' : 'text-blue-600'}`}>
              {totalPercentage}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalPercentage !== 100 ? 'Total alokasi harus 100%' : 'Alokasi valid'}
            </p>
          </CardContent>
        </Card>
      </div>

      {isLoss && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Perhatian</AlertTitle>
          <AlertDescription>
            Koperasi mengalami kerugian pada periode ini. Distribusi SHU tidak dapat dilakukan.
          </AlertDescription>
        </Alert>
      )}

      {!isLoss && (
        <Card>
          <CardHeader>
            <CardTitle>Rencana Pembagian SHU</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Pos Alokasi</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="w-[120px] text-right">Persentase (%)</TableHead>
                  <TableHead className="w-[200px] text-right">Nilai Rupiah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.description}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                         <Input 
                            type="number" 
                            min="0" 
                            max="100"
                            className="w-20 text-right h-8"
                            value={item.percentage}
                            onChange={(e) => handlePercentageChange(item.id, e.target.value)}
                         />
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                        {formatMoney(baseSHU * (item.percentage / 100))}
                    </TableCell>
                  </TableRow>
                ))}
                
                <TableRow className="bg-slate-50 font-bold">
                    <TableCell colSpan={2}>TOTAL</TableCell>
                    <TableCell className={`text-right ${totalPercentage !== 100 ? 'text-red-500' : ''}`}>
                        {totalPercentage}%
                    </TableCell>
                    <TableCell className="text-right">
                        {formatMoney(baseSHU * (totalPercentage / 100))}
                    </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            
            {/* Additional Info Box */}
            <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-blue-800">Tentang Pembagian SHU</h4>
                    <p className="text-sm text-blue-700">
                        Pembagian ini adalah simulasi berdasarkan AD/ART. Nilai final akan diputuskan dalam Rapat Anggota Tahunan (RAT).
                        Khusus untuk <strong>Jasa Anggota (40%)</strong>, biasanya akan dibagi lagi menjadi:
                    </p>
                    <ul className="list-disc list-inside text-sm text-blue-700 ml-2">
                        <li>Jasa Modal (berdasarkan simpanan): {formatMoney(baseSHU * (allocations.find(a => a.id === 'member')?.percentage || 0) / 100 * 0.5)} (Est. 50% dari Jasa Anggota)</li>
                        <li>Jasa Usaha (berdasarkan transaksi): {formatMoney(baseSHU * (allocations.find(a => a.id === 'member')?.percentage || 0) / 100 * 0.5)} (Est. 50% dari Jasa Anggota)</li>
                    </ul>
                </div>
            </div>

          </CardContent>
        </Card>
      )}
    </div>
  );
}
