'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { closePeriodAction } from '@/lib/actions/accounting-period';
import { useTransition } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface Period {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed' | 'draft';
}

import { ApprovalModal } from '@/components/accounting/approval-modal';
import { useState } from 'react';

export function PeriodTable({ initialPeriods }: { initialPeriods: Period[] }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState<{ id: string; name: string } | null>(null);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const handleCloseClick = (id: string, name: string) => {
    setSelectedPeriod({ id, name });
  };

  const handleConfirmClose = (reason: string) => {
    if (!selectedPeriod) return;

    startTransition(async () => {
      try {
        await closePeriodAction(selectedPeriod.id, reason);
        toast({
          title: "Periode Ditutup",
          description: `Periode ${selectedPeriod.name} berhasil ditutup.`,
        });
      } catch (error: any) {
        toast({
          title: "Gagal Menutup Periode",
          description: error.message,
          variant: "destructive"
        });
      }
      setSelectedPeriod(null);
    });
  };

  return (
    <div className="space-y-4">
      <ApprovalModal
        isOpen={!!selectedPeriod}
        onClose={() => setSelectedPeriod(null)}
        onConfirm={handleConfirmClose}
        title="Konfirmasi Tutup Buku"
        description={`Anda akan menutup periode akuntansi ${selectedPeriod?.name}. Pastikan semua jurnal telah diposting. KONSEKUENSI: Tidak bisa input transaksi lagi untuk periode ini. Laporan keuangan akan menjadi final.`}
        actionLabel="Tutup Periode"
        isDestructive={true}
        requireReason={true}
      >
        <div className="flex items-center space-x-2 py-2">
          <input type="checkbox" id="confirm-draft" className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
          <label htmlFor="confirm-draft" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700">
            Saya sudah memastikan tidak ada draft jurnal tertinggal
          </label>
        </div>
      </ApprovalModal>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Periode</TableHead>
              <TableHead>Mulai</TableHead>
              <TableHead>Selesai</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialPeriods.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Belum ada periode akuntansi.
                </TableCell>
              </TableRow>
            ) : (
              initialPeriods.map((period) => (
                <TableRow key={period.id}>
                  <TableCell className="font-medium">{period.period_name}</TableCell>
                  <TableCell>{formatDate(period.start_date)}</TableCell>
                  <TableCell>{formatDate(period.end_date)}</TableCell>
                  <TableCell>
                    <Badge variant={period.status === 'open' ? 'default' : 'secondary'} className={period.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}>
                      {period.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {period.status === 'open' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleCloseClick(period.id, period.period_name)}
                      >
                        <Lock className="w-3 h-3 mr-1" />
                        Tutup Periode
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
