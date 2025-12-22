import { createClient } from '@/lib/supabase/server';
import { DailyView } from './daily-view';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import { PrintButton } from '@/components/common/print-button';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DailyReportPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const dateParam = typeof params.date === 'string' ? params.date : undefined;
  
  // Default to today in YYYY-MM-DD
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const selectedDate = dateParam || todayStr;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <div>Unauthorized</div>;

  // Fetch Koperasi ID
  const { data: member } = await supabase.from('member').select('koperasi_id').eq('user_id', user.id).maybeSingle();
  let koperasiId = member?.koperasi_id;
  
  if (!koperasiId) {
      const { data: kop } = await supabase.from('koperasi').select('id').limit(1).maybeSingle();
      koperasiId = kop?.id;
  }

  if (!koperasiId) return <div>Koperasi not found</div>;

  // 1. Fetch Chart of Accounts for mapping
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('account_code, account_name')
    .eq('koperasi_id', koperasiId);

  const accountsMap = (accounts || []).reduce((acc, curr) => {
    acc[curr.account_code] = curr.account_name;
    return acc;
  }, {} as Record<string, string>);

  // 2. Fetch Transactions for the date
  // Construct ISO range
  // Note: We assume local time for "Daily Report" logic, but DB stores ISO/UTC.
  // Ideally we should query by the stored ISO string range covering the "local day".
  // For MVP simplicity, we'll assume the server/DB timezone alignment or just query strictly by the string date part if stored as DATE type.
  // But `entry_date` is timestamptz/iso string.
  
  // A simple approach: 
  // If `entry_date` is 2024-05-20T10:00:00Z, and user selects 2024-05-20.
  // We want to find entries where `entry_date` string starts with `2024-05-20` (if in UTC) or handle timezone.
  // To avoid timezone hell, I'll filter by the broad range [selectedDateT00:00:00, selectedDateT23:59:59] assuming UTC for now, 
  // or better, if the system is local-first, it might just rely on the date string.
  
  // Let's use string matching on the ISO date part for now, or just range.
  const start = `${selectedDate}T00:00:00.000Z`;
  const end = `${selectedDate}T23:59:59.999Z`;

  // Actually, since we don't know the exact TZ of the user, filtering by UTC range of that date is the standard "UTC Day" approach.
  const { data: transactions } = await supabase
    .from('ledger_entry')
    .select('*')
    .eq('koperasi_id', koperasiId)
    .gte('entry_date', start)
    .lte('entry_date', end)
    .order('entry_date', { ascending: true });

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
                <h1 className="text-2xl font-bold tracking-tight">Laporan Harian</h1>
                <p className="text-muted-foreground">
                    Jurnal Transaksi Harian
                </p>
            </div>
        </div>
        <PrintButton />
      </div>

      <DailyView 
        date={selectedDate} 
        transactions={transactions || []} 
        accountsMap={accountsMap} 
      />
    </div>
  );
}
