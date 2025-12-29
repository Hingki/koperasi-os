'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';

interface AccountingPeriod {
  id: string;
  period_name: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface ReportPeriodSelectorProps {
  periods: any[]; // Relaxed to accept DB result directly, or strictly use AccountingPeriod
  className?: string;
}

export function ReportPeriodSelector({ periods, className }: ReportPeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPeriodId = searchParams.get('periodId') || 'current';

  const handlePeriodChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value === 'current') {
      params.delete('periodId');
      params.delete('startDate');
      params.delete('endDate');
    } else {
      const period = periods.find(p => p.id === value);
      if (period) {
        params.set('periodId', value);
        params.set('startDate', period.start_date);
        params.set('endDate', period.end_date);
      }
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Periode:</span>
      <Select value={currentPeriodId} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Pilih Periode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current">
            <span className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Periode Berjalan (Current)
            </span>
          </SelectItem>
          {periods.map((period) => (
            <SelectItem key={period.id} value={period.id}>
              {period.period_name} ({period.status ? period.status.toUpperCase() : 'UNKNOWN'})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
