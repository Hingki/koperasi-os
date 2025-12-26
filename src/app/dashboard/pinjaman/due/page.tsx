import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, Calendar, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function LoanDuePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <div>Unauthorized</div>;

  const koperasiId = user.user_metadata.koperasi_id;
  
  // Get overdue or upcoming payments
  // Join loan_repayment_schedule -> loans -> loan_applications (to get member info)
  // Note: Supabase nested query depth might be limited, let's try 
  const { data: repayments } = await supabase
    .from('loan_repayment_schedule')
    .select(`
        *,
        loan:loans(
            id,
            account_number,
            application:loan_applications(
                member:member(nama_lengkap, nomor_anggota)
            )
        )
    `)
    .eq('status', 'pending') // Only unpaid
    .lte('due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()) // Due within 7 days or past due
    .order('due_date', { ascending: true });

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/pinjaman" className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Jadwal Jatuh Tempo</h1>
            <p className="text-slate-500">Daftar tagihan yang akan datang atau terlewat.</p>
        </div>
      </div>

      <div className="rounded-md border bg-white overflow-hidden">
        <table className="w-full caption-bottom text-sm">
            <thead className="bg-slate-50 border-b">
                <tr>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Jatuh Tempo</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Anggota</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Nomor Pinjaman</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Angsuran Ke</th>
                    <th className="h-12 px-4 text-right font-medium text-slate-500">Total Tagihan</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {repayments?.map((item: any) => {
                    const dueDate = new Date(item.due_date);
                    const isOverdue = dueDate < now;
                    
                    return (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="p-4 font-medium">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <span className={isOverdue ? "text-red-600 font-bold" : ""}>
                                        {dueDate.toLocaleDateString('id-ID')}
                                    </span>
                                </div>
                            </td>
                            <td className="p-4">
                                <div className="font-medium">{item.loan?.application?.member?.nama_lengkap}</div>
                                <div className="text-xs text-slate-500">{item.loan?.application?.member?.nomor_anggota}</div>
                            </td>
                            <td className="p-4 font-mono text-xs">
                                <Link href={`/dashboard/pinjaman/${item.loan?.application?.id}`} className="hover:underline text-red-600">
                                    {item.loan?.account_number}
                                </Link>
                            </td>
                            <td className="p-4 text-center">
                                {item.installment_number}
                            </td>
                            <td className="p-4 text-right font-medium">
                                {formatCurrency(item.amount_total + item.penalty_amount)}
                            </td>
                            <td className="p-4">
                                {isOverdue ? (
                                    <Badge variant="destructive" className="flex w-fit items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Terlambat
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                        Akan Datang
                                    </Badge>
                                )}
                            </td>
                        </tr>
                    );
                })}
                {(!repayments || repayments.length === 0) && (
                    <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                            Tidak ada tagihan yang jatuh tempo dalam 7 hari ke depan.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
}
