'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { JournalEntry, JournalLine } from '@/types/accounting';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface JournalListProps {
  journals: (JournalEntry & { 
    journal_lines: (JournalLine & { 
      accounts: { code: string; name: string } | null 
    })[] 
  })[];
}

export function JournalList({ journals }: JournalListProps) {
  if (journals.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground border rounded-lg bg-muted/10">
        <p>Belum ada data jurnal untuk periode ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {journals.map((journal) => (
        <Card key={journal.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="bg-muted/30 py-3 border-b">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex flex-wrap gap-3 items-center">
                <Badge variant="outline" className="font-mono bg-background">
                  {format(new Date(journal.transaction_date), 'dd MMM yyyy', { locale: id })}
                </Badge>
                <span className="font-semibold text-sm">
                  {journal.description}
                </span>
                <Badge variant="secondary" className="text-[10px] h-5">
                  {journal.business_unit || 'UMUM'}
                </Badge>
              </div>
              <div className="flex gap-2 text-xs text-muted-foreground items-center">
                <span className="font-mono">{journal.reference_id ? `#${journal.reference_id.substring(0,8)}` : '-'}</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                <span className="uppercase font-medium text-[10px] tracking-wider">{journal.reference_type || 'MANUAL'}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow className="h-8 hover:bg-transparent">
                  <TableHead className="w-[120px] text-xs font-medium">Kode Akun</TableHead>
                  <TableHead className="text-xs font-medium">Nama Akun</TableHead>
                  <TableHead className="w-[150px] text-right text-xs font-medium">Debit</TableHead>
                  <TableHead className="w-[150px] text-right text-xs font-medium">Kredit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journal.journal_lines.map((line) => (
                  <TableRow key={line.id} className="h-9 border-0 hover:bg-muted/5">
                    <TableCell className="py-1 font-mono text-xs text-muted-foreground">
                      {line.accounts?.code}
                    </TableCell>
                    <TableCell className="py-1 text-sm text-foreground/90">
                      {line.accounts?.name}
                    </TableCell>
                    <TableCell className="py-1 text-right font-mono text-sm">
                      {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                    </TableCell>
                    <TableCell className="py-1 text-right font-mono text-sm">
                      {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total Row */}
                <TableRow className="bg-muted/10 font-medium border-t">
                  <TableCell colSpan={2} className="py-2 text-right text-xs text-muted-foreground">Total Balance</TableCell>
                  <TableCell className="py-2 text-right text-xs font-bold text-foreground">
                    {formatCurrency(journal.journal_lines.reduce((sum, line) => sum + line.debit, 0))}
                  </TableCell>
                  <TableCell className="py-2 text-right text-xs font-bold text-foreground">
                    {formatCurrency(journal.journal_lines.reduce((sum, line) => sum + line.credit, 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
