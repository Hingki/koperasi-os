'use client';

import { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { 
    calculateAccountBalances, 
    classifyBalanceSheet, 
    classifyIncomeStatement,
    AccountBalance 
} from '@/lib/utils/accounting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface MultiPeriodViewProps {
    accounts: any[];
    entries: any[];
}

type ReportType = 'balance-sheet' | 'income-statement';

export function MultiPeriodView({ accounts, entries }: MultiPeriodViewProps) {
    const [reportType, setReportType] = useState<ReportType>('balance-sheet');
    const [year, setYear] = useState<number>(new Date().getFullYear());

    const months = useMemo(() => [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ], []);

    const reportData = useMemo(() => {
        const monthlyData = months.map((monthName, index) => {
            const monthIndex = index; // 0-11
            
            // Define Time Range
            // Start Date is 1st of month (only for Income Statement)
            const startDate = new Date(year, monthIndex, 1);
            // End Date is last day of month
            const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59);

            let periodEntries: any[] = [];

            if (reportType === 'balance-sheet') {
                // Balance Sheet: Cumulative from beginning of time up to endDate
                // Assuming 'entries' contains all history. 
                // In production, we would use opening balances + period entries.
                periodEntries = entries.filter(e => new Date(e.entry_date) <= endDate);
            } else {
                // Income Statement: Periodic (Start to End of Month)
                periodEntries = entries.filter(e => {
                    const d = new Date(e.entry_date);
                    return d >= startDate && d <= endDate;
                });
            }

            const balances = calculateAccountBalances(accounts, periodEntries);
            
            // We need to return the classified structure or just flattened rows?
            // For a multi-period table, we usually want flattened rows:
            // Account Name | Jan | Feb | ...
            
            // However, calculateAccountBalances returns an array of AccountBalance.
            // We can just return the map of balances for easy lookup by account ID.
            const balanceMap = balances.reduce((acc, curr) => {
                acc[curr.id] = curr.balance;
                return acc;
            }, {} as Record<string, number>);

            return {
                monthName,
                balances: balanceMap,
                rawBalances: balances
            };
        });

        return monthlyData;
    }, [accounts, entries, reportType, year, months]);

    // Group accounts for display
    // We can reuse the classification logic to get the structure (Assets -> Current -> ...), 
    // but we need to iterate the structure and pull values from `monthlyData`.
    
    // Strategy: 
    // 1. Run classification on the LAST month to get the full structure of active accounts (or all accounts).
    // 2. Use that structure to render rows, but pull values from each month in `reportData`.
    
    // Actually, better to just use `accounts` list and group by type manually for the table, 
    // or run classification on "All Time" to get structure.
    // Let's run classification on ALL accounts (with 0 balance) to get the structure tree.
    const structureBalances = calculateAccountBalances(accounts, []); 
    // This gives 0 balances but correct structure if we pass it to classifier?
    // Wait, classifier filters based on balance? No, based on type.
    
    let structure;
    if (reportType === 'balance-sheet') {
        structure = classifyBalanceSheet(structureBalances);
    } else {
        structure = classifyIncomeStatement(structureBalances);
    }

    // Helper to render a row
    const RenderRow = ({ label, accountId, bold = false, indent = false }: { label: string, accountId?: string, bold?: boolean, indent?: boolean }) => (
        <TableRow className={`${bold ? 'font-bold bg-muted/50' : ''}`}>
            <TableCell className={`min-w-[200px] ${indent ? 'pl-8' : ''}`}>{label}</TableCell>
            {reportData.map((m, idx) => {
                const val = accountId ? (m.balances[accountId] || 0) : 0; // If group header, we might need manual aggregation logic, handled below
                // Wait, if it's a specific account, use ID. If it's a total line, we need to calculate it from the month's data.
                return (
                    <TableCell key={idx} className="text-right whitespace-nowrap">
                        {accountId ? formatCurrency(val) : '-'}
                    </TableCell>
                );
            })}
        </TableRow>
    );

    // Helper for Total Rows
    const RenderTotalRow = ({ label, getValue }: { label: string, getValue: (data: any) => number }) => (
        <TableRow className="font-bold bg-muted">
            <TableCell>{label}</TableCell>
            {reportData.map((m, idx) => {
                // We need to re-classify for each month to get totals accurately?
                // Yes. 'm.rawBalances' is available.
                const classified = reportType === 'balance-sheet' 
                    ? classifyBalanceSheet(m.rawBalances)
                    : classifyIncomeStatement(m.rawBalances);
                
                const val = getValue(classified);
                return (
                    <TableCell key={idx} className="text-right whitespace-nowrap">
                        {formatCurrency(val)}
                    </TableCell>
                );
            })}
        </TableRow>
    );

    return (
        <Card className="w-full overflow-x-auto">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Laporan {reportType === 'balance-sheet' ? 'Neraca' : 'Laba Rugi'} Multi-Periode</CardTitle>
                    <div className="flex gap-2">
                         <select 
                            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                        >
                            {[2023, 2024, 2025].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <div className="flex rounded-md border bg-muted p-1">
                            <Button 
                                variant={reportType === 'balance-sheet' ? 'default' : 'ghost'} 
                                size="sm" 
                                onClick={() => setReportType('balance-sheet')}
                            >
                                Neraca
                            </Button>
                            <Button 
                                variant={reportType === 'income-statement' ? 'default' : 'ghost'} 
                                size="sm" 
                                onClick={() => setReportType('income-statement')}
                            >
                                Laba Rugi
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">Akun / Keterangan</TableHead>
                                {months.map(m => (
                                    <TableHead key={m} className="text-right min-w-[120px]">{m}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportType === 'balance-sheet' && (
                                <>
                                    <TableRow><TableCell colSpan={13} className="font-bold bg-slate-100">ASET</TableCell></TableRow>
                                    <TableRow><TableCell colSpan={13} className="font-semibold text-slate-500 pl-4">Aset Lancar</TableCell></TableRow>
                                    {(structure as any).assets.current.map((acc: any) => (
                                        <RenderRow key={acc.id} label={`${acc.account_code} - ${acc.account_name}`} accountId={acc.id} indent />
                                    ))}
                                    <RenderTotalRow label="Total Aset Lancar" getValue={(d: any) => d.assets.current.reduce((sum: number, a: any) => sum + (a.normal_balance === 'debit' ? a.balance : -a.balance), 0)} />

                                    <TableRow><TableCell colSpan={13} className="font-semibold text-slate-500 pl-4">Aset Tidak Lancar</TableCell></TableRow>
                                    {(structure as any).assets.nonCurrent.map((acc: any) => (
                                        <RenderRow key={acc.id} label={`${acc.account_code} - ${acc.account_name}`} accountId={acc.id} indent />
                                    ))}
                                    <RenderTotalRow label="Total Aset" getValue={(d: any) => d.assets.total} />

                                    <TableRow><TableCell colSpan={13} className="font-bold bg-slate-100">LIABILITAS</TableCell></TableRow>
                                    {(structure as any).liabilities.current.map((acc: any) => (
                                        <RenderRow key={acc.id} label={`${acc.account_code} - ${acc.account_name}`} accountId={acc.id} indent />
                                    ))}
                                    {(structure as any).liabilities.longTerm.map((acc: any) => (
                                        <RenderRow key={acc.id} label={`${acc.account_code} - ${acc.account_name}`} accountId={acc.id} indent />
                                    ))}
                                    <RenderTotalRow label="Total Liabilitas" getValue={(d: any) => d.liabilities.total} />

                                    <TableRow><TableCell colSpan={13} className="font-bold bg-slate-100">EKUITAS</TableCell></TableRow>
                                    {(structure as any).equity.accounts.map((acc: any) => (
                                        <RenderRow key={acc.id} label={`${acc.account_code} - ${acc.account_name}`} accountId={acc.id} indent />
                                    ))}
                                    <RenderTotalRow label="SHU Tahun Berjalan" getValue={(d: any) => d.equity.currentEarnings} />
                                    <RenderTotalRow label="Total Ekuitas" getValue={(d: any) => d.equity.total} />
                                    
                                    <RenderTotalRow label="Total Liabilitas & Ekuitas" getValue={(d: any) => d.liabilities.total + d.equity.total} />
                                </>
                            )}

                            {reportType === 'income-statement' && (
                                <>
                                    <TableRow><TableCell colSpan={13} className="font-bold bg-slate-100">PENDAPATAN</TableCell></TableRow>
                                    {(structure as any).revenue.operating.map((acc: any) => (
                                        <RenderRow key={acc.id} label={`${acc.account_code} - ${acc.account_name}`} accountId={acc.id} indent />
                                    ))}
                                    {(structure as any).revenue.other.map((acc: any) => (
                                        <RenderRow key={acc.id} label={`${acc.account_code} - ${acc.account_name}`} accountId={acc.id} indent />
                                    ))}
                                    <RenderTotalRow label="Total Pendapatan" getValue={(d: any) => d.revenue.total} />

                                    <TableRow><TableCell colSpan={13} className="font-bold bg-slate-100">BEBAN</TableCell></TableRow>
                                    {(structure as any).expenses.operating.map((acc: any) => (
                                        <RenderRow key={acc.id} label={`${acc.account_code} - ${acc.account_name}`} accountId={acc.id} indent />
                                    ))}
                                    {(structure as any).expenses.other.map((acc: any) => (
                                        <RenderRow key={acc.id} label={`${acc.account_code} - ${acc.account_name}`} accountId={acc.id} indent />
                                    ))}
                                    <RenderTotalRow label="Total Beban" getValue={(d: any) => d.expenses.total} />

                                    <RenderTotalRow label="Laba Bersih (Net Profit)" getValue={(d: any) => d.netProfit} />
                                </>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
