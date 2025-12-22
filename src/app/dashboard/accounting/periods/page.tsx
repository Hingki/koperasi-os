import { createClient } from '@/lib/supabase/server';
import { PeriodTable } from './period-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

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
        <Button className="flex items-center gap-2" disabled>
            <Plus className="h-4 w-4" /> Buka Periode Baru (Auto)
        </Button>
      </div>

      <div className="rounded-md border bg-white p-4">
         <PeriodTable initialPeriods={periods || []} />
      </div>
    </div>
  );
}
