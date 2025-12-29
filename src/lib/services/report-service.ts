import { SupabaseClient } from '@supabase/supabase-js';
import { AccountCode } from '@/lib/types/ledger';
import { calculateAccountBalances, classifyIncomeStatement } from '@/lib/utils/accounting';

export interface BalanceSheetItem {
    account_code: string;
    account_name: string;
    level: number;
    balance: number;
    children: BalanceSheetItem[];
}

export interface BalanceSheetSection {
    total: number;
    items: BalanceSheetItem[];
}

export interface BalanceSheetReport {
    as_of_date: string;
    assets: BalanceSheetSection;
    liabilities: BalanceSheetSection;
    equity: BalanceSheetSection;
    summary: {
        total_assets: number;
        total_liabilities_equity: number;
        is_balanced: boolean;
        discrepancy: number;
    };
}

export interface IncomeStatementReport {
    start_date: string;
    end_date: string;
    revenue: BalanceSheetSection;
    expenses: BalanceSheetSection;
    summary: {
        total_revenue: number;
        total_expenses: number;
        net_income: number;
    };
}

export interface CashFlowItem {
    name: string;
    amount: number;
}

export interface CashFlowSection {
    total: number;
    items: CashFlowItem[];
}

export interface CashFlowReport {
    start_date: string;
    end_date: string;
    operating_activities: CashFlowSection;
    investing_activities: CashFlowSection;
    financing_activities: CashFlowSection;
    summary: {
        net_change_in_cash: number;
        beginning_cash_balance: number;
        ending_cash_balance: number;
    };
}

// Internal interface for Account from DB
interface Account {
    id: string;
    code: string;
    name: string;
    type: string;
    normal_balance: 'DEBIT' | 'CREDIT';
    parent_id: string | null;
}

// Internal interface for Journal Line
interface JournalLine {
    account_id: string;
    debit: number;
    credit: number;
}

export class ReportService {
    constructor(private supabase: SupabaseClient) { }

    // Helper to fetch raw data for reports (Centralized Fetching)
    async getReportData(koperasiId: string, startDate: Date, endDate: Date, unitId?: string) {
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // 1. Fetch Accounts
        const { data: accounts, error: accountsError } = await this.supabase
            .from('accounts')
            .select('id, code, name, type, normal_balance, parent_id')
            .eq('koperasi_id', koperasiId)
            .order('code');

        if (accountsError) throw accountsError;

        // 2. Fetch Journal Lines via Journals
        // We need lines where journal.transaction_date is within range and matches koperasi_id
        // Note: unitId filtering would require business_unit on journals
        let query = this.supabase
            .from('journal_lines')
            .select(`
                account_id,
                debit,
                credit,
                journals!inner (
                    transaction_date,
                    koperasi_id,
                    business_unit
                )
            `)
            .eq('journals.koperasi_id', koperasiId)
            .gte('journals.transaction_date', startDateStr)
            .lte('journals.transaction_date', endDateStr);

        if (unitId) {
            // Assuming business_unit maps to unitId somehow, or we filter loosely.
            // For now, if business_unit is a string name, we might not match UUID.
            // If the user system uses unit UUIDs in business_unit column, this works.
            query = query.eq('journals.business_unit', unitId);
        }

        const { data: lines, error: linesError } = await query;

        if (linesError) throw linesError;

        // Flatten lines
        const flattenedLines: JournalLine[] = (lines || []).map((l: any) => ({
            account_id: l.account_id,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0
        }));

        return { accounts: (accounts || []) as Account[], entries: flattenedLines };
    }

    // For Balance Sheet, we need all history
    async getReportDataAsOf(koperasiId: string, asOfDate: Date, unitId?: string) {
        const asOfDateStr = asOfDate.toISOString().split('T')[0];

        // 1. Fetch Accounts
        const { data: accounts, error: accountsError } = await this.supabase
            .from('accounts')
            .select('id, code, name, type, normal_balance, parent_id')
            .eq('koperasi_id', koperasiId)
            .order('code');

        if (accountsError) throw accountsError;

        // 2. Fetch Snapshot (Optimization) - Not implemented for 'accounts' yet in migration
        // Assuming we rely on full calculation for now as 'opening_balance_snapshot' used old table.
        // TODO: Implement snapshotting for new accounts table.

        let startDateStr = '1970-01-01';
        let initialBalances: Record<string, number> = {};

        // 3. Fetch Entries from beginning
        let query = this.supabase
            .from('journal_lines')
            .select(`
                account_id,
                debit,
                credit,
                journals!inner (
                    transaction_date,
                    koperasi_id,
                    business_unit
                )
            `)
            .eq('journals.koperasi_id', koperasiId)
            .lte('journals.transaction_date', asOfDateStr);

        if (unitId) {
            query = query.eq('journals.business_unit', unitId);
        }

        const { data: lines, error: linesError } = await query;

        if (linesError) throw linesError;

        const flattenedLines: JournalLine[] = (lines || []).map((l: any) => ({
            account_id: l.account_id,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0
        }));

        return { accounts: (accounts || []) as Account[], entries: flattenedLines, initialBalances };
    }

    async getSHUCalculation(koperasiId: string, startDate: Date, endDate: Date, unitId?: string) {
        // Reuse getReportData to get period entries
        const { accounts, entries } = await this.getReportData(koperasiId, startDate, endDate, unitId);

        // Calculate Balances
        // Map entries to account codes for the utility function?
        // The utility `calculateAccountBalances` expects `accounts` and `entries`.
        // But `entries` there expected `ledger_entry` format (account_debit, account_credit).
        // We have `journal_lines`. We should do calculation here directly.

        const balanceMap = new Map<string, number>(); // Account ID -> Net Balance (Normal)

        // Calculate Net Debit first
        const netDebitMap = new Map<string, number>();
        entries.forEach(line => {
            const net = line.debit - line.credit;
            netDebitMap.set(line.account_id, (netDebitMap.get(line.account_id) || 0) + net);
        });

        const accountBalances = new Map<string, number>(); // Code -> Balance

        accounts.forEach(acc => {
            const netDebit = netDebitMap.get(acc.id) || 0;
            let balance = 0;
            // Income/Revenue: Credit Normal. Balance = Credit - Debit = -netDebit
            if (acc.type === 'INCOME' || acc.type === 'EQUITY' || acc.type === 'LIABILITY' || acc.normal_balance === 'CREDIT') {
                balance = -netDebit;
            } else {
                balance = netDebit;
            }
            accountBalances.set(acc.code, balance);
        });

        // Use classifyIncomeStatement utility if it accepts map?
        // It likely accepts an object or array. 
        // Let's manually calculate Net Profit here to be safe.

        let totalRevenue = 0;
        let totalExpense = 0;

        accounts.forEach(acc => {
            const bal = accountBalances.get(acc.code) || 0;
            if (acc.type === 'INCOME') totalRevenue += bal;
            if (acc.type === 'EXPENSE') totalExpense += bal;
        });

        const netProfit = totalRevenue - totalExpense;

        return {
            netProfit,
            details: { revenue: totalRevenue, expense: totalExpense }
        };
    }


    async getBalanceSheet(koperasiId: string, asOfDate: Date, unitId?: string): Promise<BalanceSheetReport> {
        const { accounts, entries, initialBalances } = await this.getReportDataAsOf(koperasiId, asOfDate, unitId);

        // 1. Calculate Net Debit per Account ID
        const balanceMap = new Map<string, number>();

        // Apply initial balances (from snapshot if any)
        Object.keys(initialBalances).forEach(accId => {
            balanceMap.set(accId, initialBalances[accId]);
        });

        entries.forEach(line => {
            const net = line.debit - line.credit;
            balanceMap.set(line.account_id, (balanceMap.get(line.account_id) || 0) + net);
        });

        // 2. Map to Account Codes and Apply Normal Balance
        const accountBalances = new Map<string, number>();
        let netIncome = 0;

        accounts.forEach(acc => {
            const netDebit = balanceMap.get(acc.id) || 0;

            // Calculate Net Income (Revenue - Expense) for Equity section
            if (acc.type === 'INCOME') {
                netIncome += (-netDebit); // Credit normal
            } else if (acc.type === 'EXPENSE') {
                netIncome -= netDebit; // Debit normal
            }

            let balance = 0;
            if (acc.normal_balance === 'DEBIT' || acc.type === 'ASSET' || acc.type === 'EXPENSE') {
                balance = netDebit;
            } else {
                balance = -netDebit;
            }
            accountBalances.set(acc.code, balance);
        });

        // 3. Build Hierarchy
        const assets = await this.buildHierarchy(accounts, accountBalances, 'ASSET');
        const liabilities = await this.buildHierarchy(accounts, accountBalances, 'LIABILITY');
        const equity = await this.buildHierarchy(accounts, accountBalances, 'EQUITY');

        // Add Net Income to Equity (Retained Earnings or Current Year Earnings)
        // Usually we append it as a line item or merge it into Retained Earnings.
        // For display, let's add it to Summary or as a special item in Equity?
        // Ideally it should be in "Current Year Earnings" account.
        // If that account exists, it should be updated. 
        // But since we calculated it dynamically, we might need to inject it.
        // Let's just track it in summary for now.

        const totalAssets = assets.total;
        const totalLiabilities = liabilities.total;
        const totalEquity = equity.total + netIncome; // Add Net Income to Equity total

        return {
            as_of_date: asOfDate.toISOString().split('T')[0],
            assets,
            liabilities,
            equity,
            summary: {
                total_assets: totalAssets,
                total_liabilities_equity: totalLiabilities + totalEquity,
                is_balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
                discrepancy: totalAssets - (totalLiabilities + totalEquity)
            }
        };
    }

    private async buildHierarchy(
        accounts: Account[],
        accountBalances: Map<string, number>,
        type: string
    ): Promise<BalanceSheetSection> {
        const typeAccounts = accounts.filter(a => a.type === type);

        // Recursive function to build the tree
        const buildNode = (parent: Account, level: number): BalanceSheetItem => {
            const children = typeAccounts
                .filter(a => a.parent_id === parent.id)
                .map(child => buildNode(child, level + 1));

            // Calculate total for this node
            let myBalance = 0;
            // If it has children, sum children? Or just take its own balance?
            // Usually header accounts don't have balance, but they sum children.
            // If it's a detail account, it has balance.
            // We sum children + own balance.

            const childrenSum = children.reduce((sum, child) => sum + child.balance, 0);
            const ownBalance = accountBalances.get(parent.code) || 0;

            myBalance = ownBalance + childrenSum;

            return {
                account_code: parent.code,
                account_name: parent.name,
                level: level,
                balance: myBalance,
                children
            };
        };

        // Find top-level nodes for this type (no parent or parent not in this set)
        const topNodes = typeAccounts.filter(a => !a.parent_id || !typeAccounts.find(p => p.id === a.parent_id));
        const items = topNodes.map(node => buildNode(node, 1));
        const total = items.reduce((sum, item) => sum + item.balance, 0);

        return { total, items };
    }

    // Validate Period Status (Stub for now, reusing old logic if possible or simplified)
    private async validatePeriod(koperasiId: string, date: Date, type: 'final' | 'draft') {
        if (type === 'draft') return;
        // Check accounting_period table... (unchanged logic mostly)
        const dateStr = date.toISOString().split('T')[0];
        const { data: period } = await this.supabase
            .from('accounting_period')
            .select('status')
            .eq('koperasi_id', koperasiId)
            .lte('start_date', dateStr)
            .gte('end_date', dateStr)
            .maybeSingle();

        if (!period) throw new Error('Accounting Period not found.');
        if (period.status !== 'closed') throw new Error('Period is Open.');
    }

    async getCashFlowStatement(koperasiId: string, startDate: Date, endDate: Date, unitId?: string, isFinal: boolean = false): Promise<CashFlowReport> {
        if (isFinal) {
            await this.validatePeriod(koperasiId, endDate, 'final');
        }

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // 1. Get Net Income
        const incomeStatement = await this.getIncomeStatement(koperasiId, startDate, endDate, unitId, isFinal);
        const netIncome = incomeStatement.summary.net_income;

        // 2. Fetch Changes
        const { accounts, entries } = await this.getReportData(koperasiId, startDate, endDate, unitId);

        const balanceMap = new Map<string, number>(); // Account ID -> Net Debit Change
        entries.forEach(line => {
            const net = line.debit - line.credit;
            balanceMap.set(line.account_id, (balanceMap.get(line.account_id) || 0) + net);
        });

        const getChange = (code: string) => {
            const acc = accounts.find(a => a.code === code);
            if (!acc) return 0;
            return balanceMap.get(acc.id) || 0;
        };

        const getChangeByPrefix = (prefix: string) => {
            const matched = accounts.filter(a => a.code.startsWith(prefix));
            let totalNetDebit = 0;
            matched.forEach(acc => {
                totalNetDebit += (balanceMap.get(acc.id) || 0);
            });
            return totalNetDebit;
        };

        // --- A. OPERATING ACTIVITIES ---
        const operatingItems: CashFlowItem[] = [];
        operatingItems.push({ name: 'SHU / Laba Bersih', amount: netIncome });

        // Depreciation (5-2006)
        const depreciationChange = getChange('5-2006');
        if (depreciationChange > 0) {
            operatingItems.push({ name: 'Penyusutan Aset Tetap', amount: depreciationChange });
        }

        // Receivables (1-13xx)
        const receivablesChange = getChangeByPrefix('1-13');
        if (receivablesChange !== 0) operatingItems.push({ name: 'Kenaikan/Penurunan Piutang', amount: -receivablesChange });

        // Inventory (1-14xx)
        const inventoryChange = getChangeByPrefix('1-14');
        if (inventoryChange !== 0) operatingItems.push({ name: 'Kenaikan/Penurunan Persediaan', amount: -inventoryChange });

        // Payables (2-1xxx)
        const payablesChange = getChangeByPrefix('2-1');
        if (payablesChange !== 0) operatingItems.push({ name: 'Kenaikan/Penurunan Kewajiban Lancar', amount: -payablesChange });

        const totalOperating = operatingItems.reduce((sum, item) => sum + item.amount, 0);

        // --- B. INVESTING ACTIVITIES ---
        const investingItems: CashFlowItem[] = [];

        // Fixed Assets (1-21xx excluding 1-2199)
        // Note: Logic simplified for MVP
        const fixedAssetAccounts = accounts.filter(a => a.code.startsWith('1-21') && a.code !== '1-2199');
        let fixedAssetsNetDebit = 0;
        fixedAssetAccounts.forEach(a => fixedAssetsNetDebit += (balanceMap.get(a.id) || 0));

        if (fixedAssetsNetDebit !== 0) investingItems.push({ name: 'Perolehan Aset Tetap', amount: -fixedAssetsNetDebit });

        const totalInvesting = investingItems.reduce((sum, item) => sum + item.amount, 0);

        // --- C. FINANCING ACTIVITIES ---
        const financingItems: CashFlowItem[] = [];

        // Long Term Debt (2-2xxx)
        const longTermDebtChange = getChangeByPrefix('2-2');
        if (longTermDebtChange !== 0) financingItems.push({ name: 'Penerimaan/Pembayaran Hutang Jangka Panjang', amount: -longTermDebtChange });

        // Equity (3-1xxx)
        const equityChange = getChangeByPrefix('3-1'); // Warning: Includes SHU accounts?
        // Should exclude SHU accounts if possible.
        if (equityChange !== 0) financingItems.push({ name: 'Perubahan Modal', amount: equityChange }); // Equity Credit is Source (+)

        const totalFinancing = financingItems.reduce((sum, item) => sum + item.amount, 0);

        // --- SUMMARY ---
        const netChange = totalOperating + totalInvesting + totalFinancing;

        // Beginning Cash
        // Fetch SUM of cash accounts up to startDate (exclusive)
        const cashAccounts = accounts.filter(a => a.code.startsWith('1-10'));
        const cashAccountIds = cashAccounts.map(a => a.id);

        let beginningCash = 0;
        // Fetch previous entries (journals before start date)
        const { data: prevLines } = await this.supabase
            .from('journal_lines')
            .select(`
                account_id, debit, credit,
                journals!inner(transaction_date, koperasi_id)
            `)
            .eq('journals.koperasi_id', koperasiId)
            .lt('journals.transaction_date', startDateStr);

        if (prevLines) {
            prevLines.forEach((line: any) => {
                if (cashAccountIds.includes(line.account_id)) {
                    beginningCash += (Number(line.debit) - Number(line.credit));
                }
            });
        }
        // Wait, Cash is Asset (Debit Normal). 
        // Debit increases Cash. Credit decreases.
        // So Balance = Debit - Credit. Correct.

        return {
            start_date: startDateStr,
            end_date: endDateStr,
            operating_activities: { total: totalOperating, items: operatingItems },
            investing_activities: { total: totalInvesting, items: investingItems },
            financing_activities: { total: totalFinancing, items: financingItems },
            summary: {
                net_change_in_cash: netChange,
                beginning_cash_balance: beginningCash,
                ending_cash_balance: beginningCash + netChange
            }
        };
    }

    async getIncomeStatement(koperasiId: string, startDate: Date, endDate: Date, unitId?: string, isFinal: boolean = false): Promise<IncomeStatementReport> {
        if (isFinal) {
            await this.validatePeriod(koperasiId, endDate, 'final');
        }

        const { accounts, entries } = await this.getReportData(koperasiId, startDate, endDate, unitId);

        const balanceMap = new Map<string, number>();
        entries.forEach(line => {
            const net = line.debit - line.credit;
            balanceMap.set(line.account_id, (balanceMap.get(line.account_id) || 0) + net);
        });

        const accountBalances = new Map<string, number>();
        accounts.forEach(acc => {
            const netDebit = balanceMap.get(acc.id) || 0;
            let balance = 0;
            if (acc.type === 'INCOME') {
                balance = -netDebit; // Credit Normal
            } else if (acc.type === 'EXPENSE') {
                balance = netDebit; // Debit Normal
            }
            accountBalances.set(acc.code, balance);
        });

        const revenue = await this.buildHierarchy(accounts, accountBalances, 'INCOME');
        const expenses = await this.buildHierarchy(accounts, accountBalances, 'EXPENSE');

        const totalRevenue = revenue.total;
        const totalExpenses = expenses.total;
        const netIncome = totalRevenue - totalExpenses;

        return {
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            revenue,
            expenses,
            summary: {
                total_revenue: totalRevenue,
                total_expenses: totalExpenses,
                net_income: netIncome
            }
        };
    }
}
