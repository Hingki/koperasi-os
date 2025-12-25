import { SupabaseClient } from '@supabase/supabase-js';
import { AccountCode } from '@/lib/types/ledger';

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

export class ReportService {
  constructor(private supabase: SupabaseClient) {}

  // ... (existing private buildHierarchy and other methods)

  private async buildHierarchy(
    accounts: any[],
    accountBalances: Map<string, number>,
    type: string
  ): Promise<BalanceSheetSection> {
    const typeAccounts = accounts.filter(a => a.account_type === type);
    
    // Recursive function to build the tree
    const buildNode = (parent: any): BalanceSheetItem => {
        const children = typeAccounts
            .filter(a => a.parent_code === parent.account_code)
            .map(child => buildNode(child));
        
        // Calculate total for this node
        // If it's a header, sum children. If it's a leaf, use ledger balance.
        let myBalance = 0;
        if (parent.is_header) {
            myBalance = children.reduce((sum, child) => sum + child.balance, 0);
        } else {
            myBalance = accountBalances.get(parent.account_code) || 0;
        }

        return {
            account_code: parent.account_code,
            account_name: parent.account_name,
            level: parent.level,
            balance: myBalance,
            children
        };
    };

    // Find top-level nodes for this type (level 1 or nodes with no parent in the set)
    const topNodes = typeAccounts.filter(a => !a.parent_code || !typeAccounts.find(p => p.account_code === a.parent_code));
    const items = topNodes.map(node => buildNode(node));
    const total = items.reduce((sum, item) => sum + item.balance, 0);

    return { total, items };
  }

  async getCashFlowStatement(koperasiId: string, startDate: Date, endDate: Date): Promise<CashFlowReport> {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // 1. Get Income Statement for Net Income (SHU)
    const incomeStatement = await this.getIncomeStatement(koperasiId, startDate, endDate);
    const netIncome = incomeStatement.summary.net_income;

    // 2. Fetch Balance Sheet Changes (Indirect Method)
    // We need changes in specific accounts:
    // - Depreciation (Non-cash expense) -> Add back
    // - Operational Assets (Receivables, Inventory) -> Inverse relationship (Increase in Asset = Cash Outflow)
    // - Operational Liabilities (Payables) -> Direct relationship (Increase in Liability = Cash Inflow)
    
    // Fetch Accounts to map codes
    const { data: accounts, error: accountsError } = await this.supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_type, account_name')
      .eq('koperasi_id', koperasiId);
      
    if (accountsError) throw accountsError;

    // Helper to get Net Change for an account type or code range
    // Since getIncomeStatement already fetches period ledger entries, we could reuse logic, but here we need specific account changes.
    // Let's fetch ledger entries for the period again (or refactor to share).
    
    const { data: entries, error: entriesError } = await this.supabase
        .from('ledger_entry')
        .select('account_debit, account_credit, amount')
        .eq('koperasi_id', koperasiId)
        .gte('book_date', startDateStr)
        .lte('book_date', endDateStr);

    if (entriesError) throw entriesError;

    const balanceMap = new Map<string, number>(); // Account ID -> Net Debit Change
    (entries || []).forEach(entry => {
        const debitId = entry.account_debit;
        const creditId = entry.account_credit;
        const amount = Number(entry.amount);
        balanceMap.set(debitId, (balanceMap.get(debitId) || 0) + amount);
        balanceMap.set(creditId, (balanceMap.get(creditId) || 0) - amount);
    });

    const getChange = (code: string) => {
        const acc = accounts.find(a => a.account_code === code);
        if (!acc) return 0;
        return balanceMap.get(acc.id) || 0; // Net Debit Change
    };

    const getChangeByPrefix = (prefix: string) => {
        const matched = accounts.filter(a => a.account_code.startsWith(prefix));
        let totalNetDebit = 0;
        matched.forEach(acc => {
            totalNetDebit += (balanceMap.get(acc.id) || 0);
        });
        return totalNetDebit;
    };

    // --- A. OPERATING ACTIVITIES ---
    const operatingItems: CashFlowItem[] = [];
    
    // 1. Start with Net Income
    operatingItems.push({ name: 'SHU / Laba Bersih', amount: netIncome });

    // 2. Adjustments for Non-Cash Items
    // Depreciation (Beban Penyusutan) - usually 5-2xxx
    // We need to find "Beban Penyusutan" account. In seed: '5-2006'
    const depreciationChange = getChange('5-2006'); 
    // Expense is Debit normal. Positive Net Debit means Expense occurred.
    // We ADD back depreciation expense (it reduced income but didn't use cash).
    if (depreciationChange > 0) {
        operatingItems.push({ name: 'Penyusutan Aset Tetap', amount: depreciationChange });
    }

    // 3. Changes in Working Capital
    // (Increase) in Assets = Use of Cash (-)
    // Decrease in Assets = Source of Cash (+)
    
    // Receivables (1-13xx)
    const receivablesChange = getChangeByPrefix('1-13'); 
    // Net Debit > 0 means Receivables increased (Debit). Cash effect: Negative.
    if (receivablesChange !== 0) {
        operatingItems.push({ name: 'Kenaikan/Penurunan Piutang', amount: -receivablesChange });
    }

    // Inventory (1-14xx)
    const inventoryChange = getChangeByPrefix('1-14');
    if (inventoryChange !== 0) {
        operatingItems.push({ name: 'Kenaikan/Penurunan Persediaan', amount: -inventoryChange });
    }

    // Payables / Liabilities (2-1xxx) - Short term
    // Increase in Liability (Credit) = Source of Cash (+). 
    // Net Debit < 0 means Liability Increased.
    // We want to ADD the increase.
    // Formula: Change in Liability = (Ending - Beginning)
    // If Liability Increases (Credit), Net Debit is Negative. We want Positive cash effect.
    // So: -NetDebit
    const payablesChange = getChangeByPrefix('2-1'); // Short term liabilities
    if (payablesChange !== 0) {
        operatingItems.push({ name: 'Kenaikan/Penurunan Kewajiban Lancar', amount: -payablesChange });
    }

    const totalOperating = operatingItems.reduce((sum, item) => sum + item.amount, 0);

    // --- B. INVESTING ACTIVITIES ---
    const investingItems: CashFlowItem[] = [];
    
    // Purchase of Fixed Assets (1-21xx)
    // Increase in Fixed Assets (Debit) = Use of Cash (-)
    // But exclude Accumulated Depreciation (1-2199) which is handled above or net?
    // Usually "Purchase of Property, Plant, Equipment" matches the Debit to Asset accounts.
    // Let's sum 1-21xx excluding 1-2199 (Contra Asset)
    // Actually, depreciation entry is Dr Expense, Cr Acc. Depreciation.
    // Purchase is Dr Asset, Cr Cash.
    // So we look for Net Debit change in Fixed Assets (excluding Acc Dep).
    
    const fixedAssetsChange = getChangeByPrefix('1-21');
    const accDepChange = getChange('1-2199'); // Usually Credit (Negative Net Debit)
    const netFixedAssetPurchase = fixedAssetsChange - accDepChange; // Remove the credit effect of depreciation from the group sum if any?
    // Actually simpler: Just check 1-2101, 1-2102, etc.
    // Let's just take the group 1-21 change minus the Acc Dep change to be safe?
    // Or just look at the Asset accounts directly.
    // For MVP, let's take Net Change of 1-21xx.
    // If we bought a car: Dr Vehicle 100, Cr Cash 100. Net Debit Vehicle = +100. Cash Effect = -100.
    
    // We should filter out 1-2199 specifically to avoid double counting depreciation if we added it back in operating?
    // No, depreciation is non-cash adjustment to Net Income.
    // Here we track CASH OUTFLOW for purchases.
    // The Ledger Entry for Depreciation (Dr Exp, Cr AccDep) does NOT touch Cash.
    // The Ledger Entry for Purchase (Dr Asset, Cr Cash) DOES touch Cash.
    
    // So if we just look at Net Debit of Asset Accounts (1-21xx excluding 1-2199), that represents Purchases (or Sales).
    
    const fixedAssetAccounts = accounts.filter(a => a.account_code.startsWith('1-21') && a.account_code !== '1-2199');
    let fixedAssetsNetDebit = 0;
    fixedAssetAccounts.forEach(a => fixedAssetsNetDebit += (balanceMap.get(a.id) || 0));
    
    if (fixedAssetsNetDebit !== 0) {
        investingItems.push({ name: 'Perolehan Aset Tetap', amount: -fixedAssetsNetDebit });
    }

    const totalInvesting = investingItems.reduce((sum, item) => sum + item.amount, 0);

    // --- C. FINANCING ACTIVITIES ---
    const financingItems: CashFlowItem[] = [];

    // Long Term Liabilities (2-2xxx)
    const longTermDebtChange = getChangeByPrefix('2-2');
    if (longTermDebtChange !== 0) {
         // Increase (Credit) -> Cash Inflow (+). Net Debit is Negative. So -NetDebit.
         financingItems.push({ name: 'Penerimaan/Pembayaran Hutang Jangka Panjang', amount: -longTermDebtChange });
    }

    // Equity / Capital Injection (3-1xxx excluding SHU 3-1400 and Retained Earnings 3-1001/3-1100 maybe?)
    // Simpanan Pokok/Wajib are technically Equity in some Coops, but here they are Liabilities (2-1xxx).
    // Let's check "Modal Penyertaan" (2-2200) - handled in Long Term Debt above.
    // What about "Modal Sendiri" (3-1xxx)?
    // Usually Koperasi capital comes from Simpanan Pokok/Wajib (Liabilities in our COA) and Modal Penyertaan.
    // So Financing might be covered mostly by Liabilities changes.
    // If there is direct Equity injection (Grant/Donation), it would be here.
    
    const equityChange = getChangeByPrefix('3-1');
    const retainedEarningsChange = getChange('3-1001');
    const currentYearEarningsChange = getChange('3-1400');
    
    // We want to exclude SHU changes because they are from Operations (Net Income).
    // Real financing is external capital.
    // For now, let's assume Koperasi financing is mostly via Simpanan (Liability) and Loans.
    
    const totalFinancing = financingItems.reduce((sum, item) => sum + item.amount, 0);

    // --- SUMMARY ---
    const netChange = totalOperating + totalInvesting + totalFinancing;

    // Calculate Beginning and Ending Cash
    // Beginning = Cash Balance at (startDate - 1 day)
    // Ending = Beginning + Net Change
    
    // We need to fetch Beginning Balance of Cash Accounts (1-10xx)
    // Cash Accounts: 1-1001 (Cash), 1-1002 (BCA), 1-1003 (BRI), etc.
    const cashAccounts = accounts.filter(a => a.account_code.startsWith('1-10'));
    const cashAccountIds = cashAccounts.map(a => a.id);
    
    // Fetch SUM of cash accounts up to startDate (exclusive)
    const { data: prevEntries, error: prevError } = await this.supabase
        .from('ledger_entry')
        .select('account_debit, account_credit, amount')
        .eq('koperasi_id', koperasiId)
        .lt('book_date', startDateStr); // Before start date
        
    if (prevError) throw prevError;
    
    let beginningCash = 0;
    (prevEntries || []).forEach(entry => {
        if (cashAccountIds.includes(entry.account_debit)) beginningCash += Number(entry.amount);
        if (cashAccountIds.includes(entry.account_credit)) beginningCash -= Number(entry.amount);
    });

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

  async getIncomeStatement(koperasiId: string, startDate: Date, endDate: Date): Promise<IncomeStatementReport> {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // 1. Fetch All Accounts (Revenue and Expense)
    const { data: accounts, error: accountsError } = await this.supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .in('account_type', ['revenue', 'expense'])
      .order('account_code');
    
    if (accountsError) throw accountsError;

    // 2. Fetch Ledger Entries for the period
    // Since we need period range, we can't use the same RPC as BS easily (unless modified).
    // We'll query ledger_entry directly for now as it's safer for ranges.
    // Or we can create a new RPC `get_ledger_period_summary`.
    // For now, let's use the direct query fallback approach which is reliable for ranges.
    
    const { data: entries, error: entriesError } = await this.supabase
        .from('ledger_entry')
        .select('account_debit, account_credit, amount')
        .eq('koperasi_id', koperasiId)
        .gte('book_date', startDateStr)
        .lte('book_date', endDateStr);
        
    if (entriesError) throw entriesError;

    const balanceMap = new Map<string, number>(); // Account ID -> Net Debit (Debit - Credit)

    (entries || []).forEach(entry => {
        const debitId = entry.account_debit;
        const creditId = entry.account_credit;
        const amount = Number(entry.amount);
        
        // Debit increases Net Debit
        balanceMap.set(debitId, (balanceMap.get(debitId) || 0) + amount);
        // Credit decreases Net Debit
        balanceMap.set(creditId, (balanceMap.get(creditId) || 0) - amount);
    });

    // 3. Calculate Balances per Account Code
    const accountBalances = new Map<string, number>();

    accounts.forEach(acc => {
        const netDebit = balanceMap.get(acc.id) || 0;
        let balance = 0;

        // Revenue: Normal Credit. Balance = Credit - Debit = -netDebit
        if (acc.account_type === 'revenue') {
            balance = -netDebit;
        } 
        // Expense: Normal Debit. Balance = Debit - Credit = netDebit
        else if (acc.account_type === 'expense') {
            balance = netDebit;
        }

        accountBalances.set(acc.account_code, balance);
    });

    // 4. Build Hierarchy
    const revenue = await this.buildHierarchy(accounts, accountBalances, 'revenue');
    const expenses = await this.buildHierarchy(accounts, accountBalances, 'expense');

    return {
        start_date: startDateStr,
        end_date: endDateStr,
        revenue,
        expenses,
        summary: {
            total_revenue: revenue.total,
            total_expenses: expenses.total,
            net_income: revenue.total - expenses.total
        }
    };
  }

  async getBalanceSheet(koperasiId: string, asOfDate: Date): Promise<BalanceSheetReport> {
    const dateStr = asOfDate.toISOString().split('T')[0];

    // 1. Fetch All Accounts
    const { data: accounts, error: accountsError } = await this.supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .order('account_code');
    
    if (accountsError) throw accountsError;

    // 2. Fetch Ledger Summaries (Group by Account)
    // Since we need to sum up to a date, and ledger_entry is partitioned, we can query the parent table.
    // However, aggregation across partitions can be slow. For MVP, it's fine.
    // Optimally, we would use a materialized view or period summaries.
    
    // We fetch ALL entries up to date.
    // Query: Select account_debit, sum(amount) as debit_total FROM ledger_entry WHERE ... GROUP BY account_debit
    // AND Select account_credit, sum(amount) as credit_total ...
    
    // Supabase JS doesn't support complex UNION/GROUP BY easily without RPC.
    // Let's assume the volume is manageable or use RPC if needed. 
    // Let's try to fetch all raw entries (careful with volume) OR use RPC.
    // Writing a custom RPC is safer for performance.
    
    // RPC: get_ledger_summary(koperasi_id, date)
    const { data: summary, error: summaryError } = await this.supabase.rpc('get_ledger_balance_summary', {
        p_koperasi_id: koperasiId,
        p_date: dateStr
    });

    const balanceMap = new Map<string, number>();

    if (summaryError) {
        // Fallback: Fetch raw entries (Not recommended for prod, but ok for dev if RPC missing)
        console.warn('RPC get_ledger_balance_summary missing, creating it via migration is recommended. Using slow fallback.');
        
        const { data: entries, error: entriesError } = await this.supabase
            .from('ledger_entry')
            .select('account_debit, account_credit, amount')
            .eq('koperasi_id', koperasiId)
            .lte('book_date', dateStr);
            
        if (entriesError) throw entriesError;
        
        (entries || []).forEach(entry => {
            const debitId = entry.account_debit;
            const creditId = entry.account_credit;
            const amount = Number(entry.amount);
            
            balanceMap.set(debitId, (balanceMap.get(debitId) || 0) + amount);
            balanceMap.set(creditId, (balanceMap.get(creditId) || 0) - amount);
        });
    } else {
        (summary as any[]).forEach(row => {
            balanceMap.set(row.account_id, (Number(row.total_debit) || 0) - (Number(row.total_credit) || 0));
        });
    }

    // 3. Calculate Balances per Account
    // We need to map Account ID to Code and calculate based on Normal Balance
    // Also calculate Net Income (SHU)
    
    let netIncome = 0;
    const accountBalances = new Map<string, number>(); // Map Code -> Balance

    accounts.forEach(acc => {
        const netDebit = balanceMap.get(acc.id) || 0;
        
        // Accumulate Net Income (Revenue - Expense)
        // Revenue (Credit Normal): Credit - Debit = -netDebit
        // Expense (Debit Normal): Debit - Credit = netDebit
        
        if (acc.account_type === 'revenue') {
            // Revenue increases on Credit. 
            // netDebit = Debit - Credit. 
            // Revenue = Credit - Debit = -netDebit
            netIncome += (-netDebit);
        } else if (acc.account_type === 'expense') {
            // Expense increases on Debit.
            // Expense = Debit - Credit = netDebit
            netIncome -= netDebit;
        }

        // For Balance Sheet Accounts
        let balance = 0;
        if (acc.normal_balance === 'debit') {
            balance = netDebit;
        } else {
            balance = -netDebit;
        }
        accountBalances.set(acc.account_code, balance);
    });

    // 4. Build Hierarchy
    const buildHierarchy = (type: string): BalanceSheetSection => {
        const typeAccounts = accounts.filter(a => a.account_type === type);
        if (type === 'equity') {
            const retainedEarningsAccount = typeAccounts.find(a => a.account_code === '3-1400' || a.account_name.includes('Tahun Berjalan'));
            if (retainedEarningsAccount) {
                const currentBalance = accountBalances.get(retainedEarningsAccount.account_code) || 0;
                accountBalances.set(retainedEarningsAccount.account_code, currentBalance + netIncome);
            } else {
                const reAccount = typeAccounts.find(a => a.account_code === '3-1001');
                if (reAccount) {
                    const currentBalance = accountBalances.get(reAccount.account_code) || 0;
                    accountBalances.set(reAccount.account_code, currentBalance + netIncome);
                }
            }
        }

        const buildNode = (parent: any): BalanceSheetItem => {
            const children = typeAccounts
                .filter((a: any) => a.parent_code === parent.account_code)
                .map((child: any) => buildNode(child));

            const myBalance = parent.is_header
                ? children.reduce((sum: number, child: BalanceSheetItem) => sum + child.balance, 0)
                : (accountBalances.get(parent.account_code) || 0);

            return {
                account_code: parent.account_code,
                account_name: parent.account_name,
                level: parent.level,
                balance: myBalance,
                children
            };
        };

        const topNodes = typeAccounts.filter((a: any) => !a.parent_code || !typeAccounts.find((p: any) => p.account_code === a.parent_code));
        const items = topNodes.map((node: any) => buildNode(node));
        const total = items.reduce((sum: number, item: BalanceSheetItem) => sum + item.balance, 0);

        return { total, items };
    };

    const assets = buildHierarchy('asset');
    const liabilities = buildHierarchy('liability');
    let equity = buildHierarchy('equity');

    // 5. Inject Current Earnings into Equity
    // We look for "3-1400" SHU Tahun Berjalan or similar, or append it.
    // In our COA we have '3-1400'.
    const shuAccountCode = '3-1400';
    
    // We need to inject this value into the tree.
    // It's easier to modify the `accountBalances` before building hierarchy, but `netIncome` is calculated from Revenue/Expense which are not in BS.
    // So we manually add it to the Equity section.
    
    // Find the SHU node in the tree and update it?
    // Or just add it to the total.
    
    // Re-run equity build?
    // Better approach: Set the SHU balance in accountBalances map BEFORE building hierarchy.
    accountBalances.set(shuAccountCode, netIncome);
    
    // Rebuild Equity with SHU included
    equity = buildHierarchy('equity');

    return {
      as_of_date: dateStr,
      assets,
      liabilities,
      equity,
      summary: {
        total_assets: assets.total,
        total_liabilities_equity: liabilities.total + equity.total,
        is_balanced: Math.abs(assets.total - (liabilities.total + equity.total)) < 1, // Tolerance for floating point
        discrepancy: assets.total - (liabilities.total + equity.total)
      }
    };
  }
}
