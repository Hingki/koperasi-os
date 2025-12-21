import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Calendar, 
  CreditCard, 
  DollarSign, 
  FileText,
  Percent
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MemberLoanDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch loan details with product info
  const { data: loan, error } = await supabase
    .from('loans')
    .select(`
      *,
      product:loan_products(name, description, interest_rate, interest_type)
    `)
    .eq('id', id)
    .single();

  if (error || !loan) {
    // If not found in loans, check applications? 
    // Usually detail page is for active/past loans. 
    // Applications have their own detail or just list view status.
    // For now redirect back if not found.
    redirect('/member/pinjaman');
  }

  // Verify ownership
  const { data: member } = await supabase
    .from('member')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!member || loan.member_id !== member.id) {
    redirect('/member/pinjaman');
  }

  // Fetch Repayment Schedule
  const { data: schedule } = await supabase
    .from('loan_repayment_schedule')
    .select('*')
    .eq('loan_id', loan.id)
    .order('installment_number', { ascending: true });

  // Calculate Progress
  const totalPrincipal = Number(loan.principal_amount);
  const remainingPrincipal = Number(loan.remaining_principal);
  const paidPrincipal = totalPrincipal - remainingPrincipal;
  const progressPercentage = (paidPrincipal / totalPrincipal) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/member/pinjaman">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Detail Pinjaman</h1>
          <p className="text-slate-500">#{loan.loan_code || loan.id.slice(0, 8)}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Loan Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informasi Pinjaman</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-slate-500">Produk</p>
                <p className="font-medium">{loan.product?.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-500">Status</p>
                <Badge variant={loan.status === 'active' ? 'default' : 'secondary'}>
                  {loan.status === 'active' ? 'Aktif' : loan.status === 'paid' ? 'Lunas' : loan.status}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-slate-500">Jumlah Pinjaman</p>
                <p className="font-medium">{formatCurrency(loan.principal_amount)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-500">Suku Bunga</p>
                <p className="font-medium">{loan.interest_rate}% ({loan.interest_type})</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-500">Tanggal Mulai</p>
                <p className="font-medium">{formatDate(loan.start_date)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-500">Jatuh Tempo</p>
                <p className="font-medium">{formatDate(loan.due_date)}</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">Sisa Pokok</span>
                <span className="font-bold">{formatCurrency(remainingPrincipal)}</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-slate-400 mt-1 text-right">{progressPercentage.toFixed(1)}% Terbayar</p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Summary (if needed, or just keep it simple) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ringkasan Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex flex-col items-center justify-center h-full py-4 text-center space-y-2">
                <div className="p-3 bg-blue-100 rounded-full">
                    <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-medium">Total Kewajiban</h3>
                <p className="text-2xl font-bold text-slate-900">
                    {formatCurrency(loan.total_amount_repayable || 0)}
                </p>
                <p className="text-sm text-slate-500">Termasuk bunga</p>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Repayment Schedule Table */}
      <Card>
        <CardHeader>
          <CardTitle>Jadwal Angsuran</CardTitle>
        </CardHeader>
        <CardContent>
            {!schedule || schedule.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                    Belum ada jadwal angsuran.
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">No</TableHead>
                            <TableHead>Jatuh Tempo</TableHead>
                            <TableHead>Angsuran</TableHead>
                            <TableHead>Pokok</TableHead>
                            <TableHead>Bunga</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {schedule.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.installment_number}</TableCell>
                                <TableCell>{formatDate(item.due_date)}</TableCell>
                                <TableCell className="font-medium">{formatCurrency(item.total_installment)}</TableCell>
                                <TableCell className="text-slate-500">{formatCurrency(item.principal_portion)}</TableCell>
                                <TableCell className="text-slate-500">{formatCurrency(item.interest_portion)}</TableCell>
                                <TableCell>
                                    <Badge variant={
                                        item.status === 'paid' ? 'default' :
                                        item.status === 'overdue' ? 'destructive' : 
                                        'outline'
                                    } className={
                                        item.status === 'paid' ? 'bg-emerald-500 hover:bg-emerald-600' : ''
                                    }>
                                        {item.status === 'paid' ? 'Lunas' : 
                                         item.status === 'overdue' ? 'Telat' : 'Belum Bayar'}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
