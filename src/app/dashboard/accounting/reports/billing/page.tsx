import { createClient } from '@/lib/supabase/server';
import { BillingView } from './billing-view';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PrintButton } from '@/components/common/print-button';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BillingReportPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const now = new Date();
  
  const month = params.month ? parseInt(params.month as string) : now.getMonth() + 1;
  const year = params.year ? parseInt(params.year as string) : now.getFullYear();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <div>Unauthorized</div>;

  // Calculate Date Range
  const startDate = new Date(year, month - 1, 1).toISOString();
  // End date is start of next month
  const endDate = new Date(year, month, 1).toISOString();

  // Fetch Schedules
  const { data: items } = await supabase
    .from('loan_repayment_schedule')
    .select(`
        id,
        due_date,
        amount_total,
        principal_amount,
        interest_amount,
        status,
        installment_number,
        loan:loans(
            account_number,
            application:loan_applications(
                member:member(nama_lengkap, nomor_anggota)
            )
        )
    `)
    .gte('due_date', startDate)
    .lt('due_date', endDate)
    .order('due_date', { ascending: true });

  // Transform data for view
  const formattedItems = (items || []).map((item: any) => ({
    id: item.id,
    due_date: item.due_date,
    amount_total: item.amount_total,
    principal_amount: item.principal_amount,
    interest_amount: item.interest_amount,
    status: item.status,
    installment_number: item.installment_number,
    loan: {
        account_number: item.loan?.account_number || '-',
        member_name: item.loan?.application?.member?.nama_lengkap || 'Unknown',
        member_number: item.loan?.application?.member?.nomor_anggota || '-'
    }
  }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
            <Link href="/dashboard/accounting/reports">
                <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Rekap Tagihan</h1>
                <p className="text-muted-foreground">
                    Laporan Angsuran Pinjaman Bulanan
                </p>
            </div>
        </div>
        <PrintButton />
      </div>

      <BillingView 
        month={month} 
        year={year} 
        items={formattedItems} 
      />
    </div>
  );
}
