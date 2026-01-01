'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { getClosingSummary, submitClosing, ClosingSummary } from '@/app/actions/retail-closing';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RetailClosingPage() {
  const [summary, setSummary] = useState<ClosingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actualCash, setActualCash] = useState<string>('');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    try {
      const data = await getClosingSummary();
      setSummary(data);
      // Default actual cash to expected cash for convenience, or leave empty to force count?
      // Leaving empty is better for audit.
    } catch (error: any) {
      toast({
        title: 'Gagal memuat data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!summary) return;
    
    setSubmitting(true);
    try {
      await submitClosing({
        summary,
        actual_cash: Number(actualCash) || 0,
        notes
      });
      
      toast({
        title: 'Closing Berhasil',
        description: 'Laporan closing harian telah disimpan.',
      });
      
      router.push('/dashboard/retail');
    } catch (error: any) {
      toast({
        title: 'Gagal melakukan closing',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!summary) {
    return <div className="p-8 text-center">Data tidak tersedia</div>;
  }

  const cashDiff = (Number(actualCash) || 0) - summary.cash_amount;
  const isMatch = Math.abs(cashDiff) < 100; // Tolerance for small change? No, strict.

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Closing Harian Kasir</h1>
        <p className="text-muted-foreground">Rekonsiliasi transaksi dan kas fisik.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Shift</CardTitle>
            <CardDescription>
              Operator: {summary.operator_name} <br/>
              Waktu: {new Date(summary.start_time).toLocaleString('id-ID')} s/d Sekarang
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Total Transaksi</span>
                <p className="text-2xl font-bold">{summary.total_transactions}</p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Total Omset</span>
                <p className="text-2xl font-bold text-primary">Rp {summary.total_amount.toLocaleString('id-ID')}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Pembayaran Tunai (Cash)</span>
                <span className="font-medium">Rp {summary.cash_amount.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>QRIS</span>
                <span className="font-medium">Rp {summary.qris_amount.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Simpanan Anggota</span>
                <span className="font-medium">Rp {summary.savings_amount.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rekonsiliasi Kas</CardTitle>
            <CardDescription>Masukkan jumlah uang fisik yang ada di laci kasir.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="actual-cash">Uang Fisik (Actual Cash)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500">Rp</span>
                <Input
                  id="actual-cash"
                  type="number"
                  placeholder="0"
                  className="pl-10 text-lg font-medium"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                />
              </div>
            </div>

            <div className={`p-4 rounded-lg border ${
              !actualCash ? 'bg-slate-50 border-slate-200' :
              cashDiff === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex justify-between items-center">
                <span className="font-medium">Selisih (Difference)</span>
                <span className={`text-lg font-bold ${
                  cashDiff === 0 ? 'text-green-700' : 'text-red-600'
                }`}>
                  Rp {cashDiff.toLocaleString('id-ID')}
                </span>
              </div>
              {actualCash && cashDiff !== 0 && (
                <p className="text-xs text-red-600 mt-1 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Terdapat selisih kas. Harap periksa kembali atau berikan catatan.
                </p>
              )}
               {actualCash && cashDiff === 0 && (
                <p className="text-xs text-green-600 mt-1 flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Kas sesuai (Balanced).
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan (Opsional)</Label>
              <Input
                id="notes"
                placeholder="Alasan selisih, dll."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Button 
              className="w-full" 
              size="lg" 
              onClick={handleSubmit}
              disabled={submitting || !actualCash}
              variant={cashDiff !== 0 ? "destructive" : "default"}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {cashDiff !== 0 ? 'Simpan dengan Selisih' : 'Simpan & Closing'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
