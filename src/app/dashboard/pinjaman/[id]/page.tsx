import { createClient } from '@/lib/supabase/server';
import { LoanService } from '@/lib/services/loan-service';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, CreditCard, Clock, AlertTriangle, Printer } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LoanActionButtons } from '../action-buttons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PrintLoanButton } from '@/components/loans/print-loan-button';

export default async function LoanDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(params.id)) {
        return notFound();
    }

    const supabase = await createClient();
    const loanService = new LoanService(supabase);
    
    // Fetch detailed loan info including repayments
    const { data: loan } = await supabase
        .from('loan_applications')
        .select(`
            *,
            product:loan_products(*),
            member:member(*),
            loans(
                *,
                repayments:loan_repayment_schedule(*)
            )
        `)
        .eq('id', params.id)
        .single();

    if (!loan) return notFound();

    // Sort repayments from the active loan record if it exists
    const activeLoan = loan.loans?.[0];
    const sortedRepayments = activeLoan?.repayments?.sort((a: any, b: any) => a.installment_number - b.installment_number) || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/pinjaman">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Detail Pinjaman #{loan.id.substring(0, 8)}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={loan.status} />
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500 text-sm">
                            Diajukan: {new Date(loan.created_at).toLocaleDateString('id-ID')}
                        </span>
                    </div>
                </div>
                <div className="ml-auto flex gap-2">
                    <PrintLoanButton data={loan} />
                    <LoanActionButtons 
                        id={loan.id} 
                        status={loan.status} 
                        amount={loan.amount}
                    />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Left Column: Member & Loan Info */}
                <div className="md:col-span-2 space-y-6">
                    {/* Member Info */}
                    <Card className="p-6">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <User className="h-5 w-5 text-slate-500" />
                            Informasi Peminjam
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Nama Anggota</label>
                                <p className="font-medium text-slate-900">{loan.member.nama_lengkap}</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Nomor Anggota</label>
                                <p className="font-medium text-slate-900">{loan.member.nomor_anggota}</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Telepon</label>
                                <p className="text-slate-700">{loan.member.phone || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Alamat</label>
                                <p className="text-slate-700 truncate">{loan.member.address || '-'}</p>
                            </div>
                        </div>
                    </Card>

                    {/* Loan Details */}
                    <Card className="p-6">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-slate-500" />
                            Rincian Pinjaman
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Jenis Pinjaman</label>
                                <p className="font-medium text-slate-900 text-lg">{loan.product.name}</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Jumlah Pinjaman</label>
                                <p className="font-bold text-slate-900 text-xl text-blue-600">
                                    {formatCurrency(loan.amount)}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Bunga</label>
                                <p className="font-medium text-slate-900">{loan.product.interest_rate}% / Tahun</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Tenor</label>
                                <p className="font-medium text-slate-900">{loan.tenor_months} Bulan</p>
                            </div>
                             <div>
                                <label className="text-xs text-slate-500 font-medium uppercase">Tujuan Penggunaan</label>
                                <p className="text-slate-700 italic">"{loan.purpose}"</p>
                            </div>
                        </div>
                    </Card>

                    {/* Repayment Schedule */}
                    {sortedRepayments.length > 0 && (
                        <Card className="overflow-hidden">
                            <div className="p-6 border-b bg-slate-50">
                                <h3 className="font-semibold text-lg">Jadwal Angsuran</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">No</TableHead>
                                            <TableHead>Jatuh Tempo</TableHead>
                                            <TableHead>Pokok</TableHead>
                                            <TableHead>Bunga</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedRepayments.map((item: any) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="text-center">{item.installment_number}</TableCell>
                                                <TableCell>{new Date(item.due_date).toLocaleDateString('id-ID')}</TableCell>
                                                <TableCell>{formatCurrency(item.principal_portion)}</TableCell>
                                                <TableCell>{formatCurrency(item.interest_portion)}</TableCell>
                                                <TableCell className="font-medium">{formatCurrency(item.total_installment)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={
                                                        item.status === 'paid' ? 'bg-green-100 text-green-700 border-0' :
                                                        item.status === 'overdue' ? 'bg-red-100 text-red-700 border-0' : 
                                                        'bg-slate-100 text-slate-700 border-0'
                                                    }>
                                                        {item.status === 'paid' ? 'Lunas' : 
                                                         item.status === 'overdue' ? 'Terlambat' : 'Belum Bayar'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {/* Payment Action handled in parent component or separate modal */}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Right Column: Timeline & Notes */}
                <div className="space-y-6">
                     <Card className="p-6">
                        <h3 className="font-semibold text-lg mb-4">Catatan / Riwayat</h3>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="mt-1">
                                    <div className="h-2 w-2 rounded-full bg-blue-500 ring-4 ring-blue-50"></div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Pengajuan Dibuat</p>
                                    <p className="text-xs text-slate-500">{new Date(loan.created_at).toLocaleString('id-ID')}</p>
                                </div>
                            </div>
                            
                            {loan.workflow_metadata?.reviewed_at && (
                                <div className="flex gap-3">
                                    <div className="mt-1">
                                        <div className={`h-2 w-2 rounded-full ring-4 ${
                                            loan.status === 'rejected' ? 'bg-red-500 ring-red-50' : 'bg-green-500 ring-green-50'
                                        }`}></div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">
                                            {loan.status === 'rejected' ? 'Ditolak' : 'Disetujui'}
                                        </p>
                                        <p className="text-xs text-slate-500">{new Date(loan.workflow_metadata.reviewed_at).toLocaleString('id-ID')}</p>
                                        {loan.workflow_metadata.notes && (
                                            <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded">
                                                "{loan.workflow_metadata.notes}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {loan.disbursed_at && (
                                <div className="flex gap-3">
                                    <div className="mt-1">
                                        <div className="h-2 w-2 rounded-full bg-green-600 ring-4 ring-green-50"></div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">Dana Dicairkan</p>
                                        <p className="text-xs text-slate-500">{new Date(loan.disbursed_at).toLocaleString('id-ID')}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                     </Card>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const labels: Record<string, string> = {
        draft: 'Draft',
        submitted: 'Menunggu Review',
        approved: 'Disetujui',
        rejected: 'Ditolak',
        disbursed: 'Cair / Aktif',
        paid_off: 'Lunas',
        defaulted: 'Macet'
    };

    const colors: Record<string, string> = {
        draft: 'text-slate-600 bg-slate-100',
        submitted: 'text-amber-600 bg-amber-100',
        approved: 'text-blue-600 bg-blue-100',
        rejected: 'text-red-600 bg-red-100',
        disbursed: 'text-green-600 bg-green-100',
        paid_off: 'text-purple-600 bg-purple-100',
        defaulted: 'text-white bg-red-600'
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
            {labels[status] || status}
        </span>
    );
}
