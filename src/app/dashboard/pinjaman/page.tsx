import { createClient } from '@/lib/supabase/server';
import { LoanService } from '@/lib/services/loan-service';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, CheckCircle, Banknote, Clock, AlertCircle } from 'lucide-react';
import { reviewLoanApplication, disburseLoan } from '@/lib/actions/loan';

export const dynamic = 'force-dynamic';

export default async function LoanManagementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <div>Unauthorized</div>;

  const loanService = new LoanService(supabase);
  const koperasiId = user.user_metadata.koperasi_id;

  // Validate Koperasi ID
  if (!koperasiId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Konfigurasi Akun Bermasalah</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-6">
          ID Koperasi tidak ditemukan atau tidak valid ({koperasiId || 'Kosong'}). 
          Pastikan Anda login dengan akun yang memiliki akses koperasi yang valid.
        </p>
      </div>
    );
  }
  
  // Fetch data
  const loans = await loanService.getLoanApplications(koperasiId);

  // Stats
  const activeLoans = loans.filter(l => ['approved', 'disbursed'].includes(l.status)).length;
  const pendingLoans = loans.filter(l => l.status === 'submitted').length;
  const totalDisbursed = loans
    .filter(l => l.status === 'disbursed')
    .reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manajemen Pinjaman</h1>
          <p className="text-slate-500">Kelola pengajuan dan pencairan pinjaman anggota</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <Banknote className="h-6 w-6" />
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-500">Total Pencairan</p>
                    <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalDisbursed)}</h3>
                </div>
            </div>
        </Card>
        <Card className="p-6">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                    <Clock className="h-6 w-6" />
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-500">Menunggu Persetujuan</p>
                    <h3 className="text-2xl font-bold text-slate-900">{pendingLoans}</h3>
                </div>
            </div>
        </Card>
        <Card className="p-6">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                    <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-500">Pinjaman Aktif</p>
                    <h3 className="text-2xl font-bold text-slate-900">{activeLoans}</h3>
                </div>
            </div>
        </Card>
      </div>

      {/* Loan List */}
      <Card>
        <div className="p-6 border-b">
            <h3 className="font-semibold text-lg">Daftar Pengajuan</h3>
        </div>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Anggota</TableHead>
                    <TableHead>Jenis Pinjaman</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Tenor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loans.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                            Belum ada pengajuan pinjaman
                        </TableCell>
                    </TableRow>
                ) : (
                    loans.map((loan) => (
                        <TableRow key={loan.id}>
                            <TableCell>{new Date(loan.applied_at).toLocaleDateString('id-ID')}</TableCell>
                            <TableCell>
                                <div className="font-medium">{loan.member?.name}</div>
                                <div className="text-xs text-slate-500">{loan.member?.member_no}</div>
                            </TableCell>
                            <TableCell>{loan.loan_type?.name}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(loan.amount)}</TableCell>
                            <TableCell>{loan.loan_type?.tenor_months} Bulan</TableCell>
                            <TableCell>
                                <StatusBadge status={loan.status} />
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Link href={`/dashboard/pinjaman/${loan.id}`}>
                                        <Button variant="outline" size="sm">
                                            <Eye className="h-4 w-4 mr-1" />
                                            Detail
                                        </Button>
                                    </Link>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        draft: 'bg-slate-100 text-slate-700',
        submitted: 'bg-amber-100 text-amber-700',
        approved: 'bg-blue-100 text-blue-700',
        rejected: 'bg-red-100 text-red-700',
        disbursed: 'bg-green-100 text-green-700',
        paid_off: 'bg-purple-100 text-purple-700',
        defaulted: 'bg-red-900 text-white'
    };
    
    const labels: Record<string, string> = {
        draft: 'Draft',
        submitted: 'Menunggu Review',
        approved: 'Disetujui',
        rejected: 'Ditolak',
        disbursed: 'Cair / Aktif',
        paid_off: 'Lunas',
        defaulted: 'Macet'
    };

    return (
        <Badge variant="outline" className={`${styles[status] || 'bg-slate-100'} border-0`}>
            {labels[status] || status}
        </Badge>
    );
}
