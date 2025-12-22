'use client';

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Period {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed' | 'draft';
}

export function PeriodTable({ initialPeriods }: { initialPeriods: Period[] }) {
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Periode</TableHead>
              <TableHead>Mulai</TableHead>
              <TableHead>Selesai</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialPeriods.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Belum ada periode akuntansi.
                </TableCell>
              </TableRow>
            ) : (
              initialPeriods.map((period) => (
                <TableRow key={period.id}>
                  <TableCell className="font-medium">{period.period_name}</TableCell>
                  <TableCell>{formatDate(period.start_date)}</TableCell>
                  <TableCell>{formatDate(period.end_date)}</TableCell>
                  <TableCell>
                    <Badge variant={period.status === 'open' ? 'default' : 'secondary'} className={period.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}>
                        {period.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
