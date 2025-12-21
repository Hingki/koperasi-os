import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  Banknote, 
  Calendar, 
  ChevronRight, 
  Clock, 
  DollarSign, 
  Percent,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function MemberLoansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Get member data
  const { data: member } = await supabase
    .from('member')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!member) redirect('/login');

  // Fetch loans
  const { data: loans } = await supabase
    .from('loans')
    .select('*')
    .eq('member_id', member.id)
    .order('created_at', { ascending: false });

  // Fetch loan applications (pending/submitted)
  const { data: applications } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('member_id', member.id)
    .neq('status', 'approved') // Approved becomes a loan usually, or stays as record?
    .neq('status', 'rejected') // Maybe show rejected too?
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pinjaman Saya</h1>
          <p className="text-slate-500">Kelola pinjaman dan pengajuan Anda</p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
          <Link href="/member/pinjaman/ajuan">
            <Plus className="w-4 h-4 mr-2" />
            Ajukan Pinjaman
          </Link>
        </Button>
      </div>

      {/* Active & Past Loans */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Daftar Pinjaman</h2>
        
        {(!loans || loans.length === 0) ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Banknote className="w-12 h-12 mb-4 text-slate-300" />
              <p>Anda belum memiliki riwayat pinjaman.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {loans.map((loan) => (
              <Card key={loan.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Status Strip */}
                    <div className={`w-full sm:w-2 h-2 sm:h-auto ${
                      loan.status === 'active' ? 'bg-emerald-500' :
                      loan.status === 'paid' ? 'bg-blue-500' :
                      'bg-slate-300'
                    }`} />
                    
                    <div className="flex-1 p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg text-slate-900">
                              Pinjaman #{loan.loan_number || loan.id.slice(0, 8)}
                            </h3>
                            <Badge variant={
                              loan.status === 'active' ? 'default' :
                              loan.status === 'paid' ? 'secondary' : 'outline'
                            } className={
                              loan.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                              loan.status === 'paid' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : ''
                            }>
                              {loan.status === 'active' ? 'Aktif' :
                               loan.status === 'paid' ? 'Lunas' : loan.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-500">
                            Dicairkan pada {new Date(loan.disbursement_date || loan.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric', month: 'long', year: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-sm text-slate-500">Sisa Pinjaman</p>
                          <p className="text-xl font-bold text-emerald-600">
                            {formatCurrency(loan.remaining_principal)}
                          </p>
                          <p className="text-xs text-slate-400">
                            dari total {formatCurrency(loan.total_amount)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-t border-slate-100">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Angsuran</p>
                          <p className="font-medium text-slate-900">
                            {formatCurrency(loan.monthly_installment)}/bln
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Tenor</p>
                          <p className="font-medium text-slate-900">{loan.duration_months} Bulan</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Bunga</p>
                          <p className="font-medium text-slate-900">{loan.interest_rate}% p.a</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Jatuh Tempo</p>
                          <p className="font-medium text-slate-900">
                            Tgl {new Date(loan.due_date).getDate()}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <Button variant="outline" asChild size="sm">
                          <Link href={`/member/pinjaman/${loan.id}`}>
                            Lihat Detail
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Applications */}
      {applications && applications.length > 0 && (
        <div className="space-y-4 pt-6">
          <h2 className="text-lg font-semibold text-slate-900">Riwayat Pengajuan</h2>
          <div className="grid gap-4">
            {applications.map((app) => (
              <Card key={app.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      Pengajuan {formatCurrency(app.amount)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(app.created_at).toLocaleDateString('id-ID')} &bull; {app.duration_months} Bulan
                    </p>
                  </div>
                  <Badge variant={
                    app.status === 'approved' ? 'default' :
                    app.status === 'rejected' ? 'destructive' : 'secondary'
                  }>
                    {app.status === 'submitted' ? 'Menunggu Review' :
                     app.status === 'approved' ? 'Disetujui' :
                     app.status === 'rejected' ? 'Ditolak' : app.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
