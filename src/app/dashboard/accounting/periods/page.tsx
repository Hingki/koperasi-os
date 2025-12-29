import { createClient } from '@/lib/supabase/server';
import { PeriodTable } from './period-table';
import { OpenPeriodButton } from '@/app/dashboard/accounting/periods/open-period-button';

export const dynamic = 'force-dynamic';

export default async function PeriodsPage() {
  const supabase = await createClient();

  const { data: periods } = await supabase
    .from('accounting_period')
    .select('*')
    .order('start_date', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Periode Pembukuan</h1>
          <p className="text-muted-foreground">
            Kelola tahun fiskal dan periode bulanan.
          </p>
        </div>
        <OpenPeriodButton />
      </div>

      <div className="rounded-md border bg-white p-4">
        <PeriodTable initialPeriods={periods || []} />
      </div>
    </div>
  );
}
