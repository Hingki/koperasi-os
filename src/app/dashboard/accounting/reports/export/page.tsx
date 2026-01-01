'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getExportData } from '@/app/actions/reports';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';

export default function ExportPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [reportType, setReportType] = useState<'marketplace' | 'ledger' | 'escrow'>('marketplace');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [koperasiId, setKoperasiId] = useState<string>('');

  useEffect(() => {
    const fetchUser = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.koperasi_id) {
            setKoperasiId(user.user_metadata.koperasi_id);
        }
    };
    fetchUser();
  }, []);

  const handleDownload = async () => {
    if (!date || !koperasiId) return;

    setLoading(true);
    try {
      // For simplicity, download for selected DAY. 
      // If range needed, can add range picker.
      const startDate = date.toISOString();
      const endDate = date.toISOString(); // Action handles end of day

      const data = await getExportData(reportType, startDate, endDate, koperasiId);

      if (!data || data.length === 0) {
        toast({
            title: "No Data",
            description: "Tidak ada data untuk periode yang dipilih.",
            variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Convert to CSV
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map((row: any) => headers.map(header => {
            const val = row[header];
            return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_${format(date, 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download Berhasil",
        description: `Laporan ${reportType} berhasil diunduh.`,
      });

    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Export Data</h2>
          <p className="text-muted-foreground">
            Unduh data transaksi untuk keperluan audit eksternal.
          </p>
        </div>
      </div>

      <Card className="max-w-md">
        <CardHeader>
            <CardTitle>Parameter Export</CardTitle>
            <CardDescription>Pilih jenis laporan dan tanggal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Jenis Laporan</label>
                <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Pilih laporan" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="marketplace">Marketplace Transactions (Core)</SelectItem>
                        <SelectItem value="ledger">Ledger Journals (Accounting)</SelectItem>
                        <SelectItem value="escrow">Escrow Movements (Dana Titipan)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Tanggal</label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <Button className="w-full" onClick={handleDownload} disabled={loading || !koperasiId}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Download className="mr-2 h-4 w-4" />
                Download CSV
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
