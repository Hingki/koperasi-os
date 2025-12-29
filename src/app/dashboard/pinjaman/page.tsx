import { createClient } from '@/lib/supabase/server';
import { LoanService } from '@/lib/services/loan-service';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, CheckCircle, Banknote, Clock, AlertCircle, AlertTriangle, FileText } from 'lucide-react';
import { reviewLoanApplication, disburseLoan } from '@/lib/actions/loan';
import ExportLoansButton from '@/components/loans/export-loans-button';
import { LoanActionButtons } from './action-buttons';
import { ReminderButton } from '@/components/loans/reminder-button';

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
                <div className="flex space-x-2">
                    <ReminderButton />
                    <ExportLoansButton loans={loans} />
                    <Link href="/dashboard/pinjaman/due" prefetch={false}>
                        <Button variant="secondary">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Jatuh Tempo
                        </Button>
                    </Link>
                    <Link href="/dashboard/settings/loan-products" prefetch={false}>
                        <Button variant="outline">
                            Produk Pinjaman
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
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

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span><strong>Draft:</strong> Belum diajukan</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span><strong>Menunggu Review:</strong> Menunggu persetujuan pengurus</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    <span><strong>Disetujui:</strong> Siap dicairkan</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span><strong>Cair / Aktif:</strong> Dana sudah diterima, masa angsuran berjalan</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span><strong>Lunas:</strong> Kewajiban selesai</span>
                </div>
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
                                <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-3 bg-slate-100 rounded-full">
                                            <FileText className="h-6 w-6 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">Belum ada pengajuan pinjaman</p>
                                            <p className="text-sm mt-1">Pengajuan baru dari anggota akan muncul di sini.</p>
                                        </div>
                                        <Link href="/dashboard/pinjaman/pengajuan" className="mt-2">
                                            <Button variant="outline" size="sm">
                                                Buat Pengajuan Baru
                                            </Button>
                                        </Link>
                                    </div>
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
                                            {loan.status === 'submitted' && (
                                                <LoanActionButtons
                                                    id={loan.id}
                                                    status={loan.status}
                                                    amount={loan.amount}
                                                />
                                            )}
                                            <Link href={`/dashboard/pinjaman/${loan.id}`} prefetch={false}>
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
        approved: 'bg-teal-100 text-teal-700',
        rejected: 'bg-red-100 text-red-700',
        disbursed: 'bg-green-100 text-green-700',
        paid_off: 'bg-emerald-100 text-emerald-700',
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
