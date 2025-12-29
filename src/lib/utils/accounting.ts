import { LedgerTransaction } from '@/lib/types/ledger';

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface AccountBalance {
  id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  normal_balance: 'debit' | 'credit';
  balance: number;
}

export function calculateAccountBalances(accounts: any[], entries: any[], initialBalances: Record<string, number> = {}): AccountBalance[] {
  // 1. Create a map of account balances
  const balanceMap: Record<string, number> = {};
  
  // Initialize map with initial balances if available
  accounts.forEach(acc => {
    balanceMap[acc.id] = initialBalances[acc.id] || 0;
  });

  // 2. Iterate entries once (O(M))
  const accountNormalBalance: Record<string, 'debit' | 'credit'> = {};
  accounts.forEach(acc => {
      accountNormalBalance[acc.id] = acc.normal_balance;
  });

  entries.forEach(entry => {
    const amount = Number(entry.amount);
    
    // Process Debit Side
    if (balanceMap[entry.account_debit] !== undefined) {
        if (accountNormalBalance[entry.account_debit] === 'debit') {
            balanceMap[entry.account_debit] += amount;
        } else {
            balanceMap[entry.account_debit] -= amount;
        }
    }

    // Process Credit Side
    if (balanceMap[entry.account_credit] !== undefined) {
        if (accountNormalBalance[entry.account_credit] === 'credit') {
            balanceMap[entry.account_credit] += amount;
        } else {
            balanceMap[entry.account_credit] -= amount;
        }
    }
  });

  // 3. Map back to array
  return accounts.map(account => ({
      ...account,
      balance: balanceMap[account.id] || 0
  }));
}

export function classifyBalanceSheet(balances: AccountBalance[]) {
  const assets = balances.filter(a => a.account_type === 'asset');
  const liabilities = balances.filter(a => a.account_type === 'liability');
  const equity = balances.filter(a => a.account_type === 'equity');
  const revenue = balances.filter(a => a.account_type === 'revenue');
  const expenses = balances.filter(a => a.account_type === 'expense');

  // Helper to sum based on group logic
  const sumAssets = (accs: AccountBalance[]) => accs.reduce((sum, a) => {
      return sum + (a.normal_balance === 'debit' ? a.balance : -a.balance);
  }, 0);

  const sumLiabilitiesEquity = (accs: AccountBalance[]) => accs.reduce((sum, a) => {
      return sum + (a.normal_balance === 'credit' ? a.balance : -a.balance);
  }, 0);

  // Calculate Current Year Earnings (SHU Tahun Berjalan)
  const totalRevenue = revenue.reduce((sum, a) => sum + a.balance, 0); 
  const totalExpenses = expenses.reduce((sum, a) => sum + a.balance, 0); 
  const currentEarnings = totalRevenue - totalExpenses;

  // Sub-classifications
  const currentAssets = assets.filter(a => a.account_code.startsWith('1-1'));
  const nonCurrentAssets = assets.filter(a => !a.account_code.startsWith('1-1'));
  
  const currentLiabilities = liabilities.filter(a => a.account_code.startsWith('2-1'));
  const longTermLiabilities = liabilities.filter(a => !a.account_code.startsWith('2-1'));

  return {
    assets: {
      current: currentAssets,
      nonCurrent: nonCurrentAssets,
      total: sumAssets(assets)
    },
    liabilities: {
      current: currentLiabilities,
      longTerm: longTermLiabilities,
      total: sumLiabilitiesEquity(liabilities)
    },
    equity: {
      accounts: equity,
      currentEarnings,
      total: sumLiabilitiesEquity(equity) + currentEarnings
    }
  };
}

export function classifyIncomeStatement(balances: AccountBalance[]) {
  const revenue = balances.filter(a => a.account_type === 'revenue');
  const expenses = balances.filter(a => a.account_type === 'expense');

  const sumRevenue = (accs: AccountBalance[]) => accs.reduce((sum, a) => sum + a.balance, 0);
  const sumExpense = (accs: AccountBalance[]) => accs.reduce((sum, a) => sum + a.balance, 0);

  // Operating Revenue (4-1...)
  const operatingRevenue = revenue.filter(a => a.account_code.startsWith('4-1'));
  const otherRevenue = revenue.filter(a => !a.account_code.startsWith('4-1'));

  // Operating Expenses (5-1...)
  const operatingExpenses = expenses.filter(a => a.account_code.startsWith('5-1'));
  const otherExpenses = expenses.filter(a => !a.account_code.startsWith('5-1'));

  const totalOperatingRevenue = sumRevenue(operatingRevenue);
  const totalOtherRevenue = sumRevenue(otherRevenue);
  const totalOperatingExpenses = sumExpense(operatingExpenses);
  const totalOtherExpenses = sumExpense(otherExpenses);

  const operatingProfit = totalOperatingRevenue - totalOperatingExpenses;
  const netProfit = operatingProfit + totalOtherRevenue - totalOtherExpenses;

  return {
    revenue: {
        operating: operatingRevenue,
        other: otherRevenue,
        totalOperating: totalOperatingRevenue,
        totalOther: totalOtherRevenue,
        total: totalOperatingRevenue + totalOtherRevenue
    },
    expenses: {
        operating: operatingExpenses,
        other: otherExpenses,
        totalOperating: totalOperatingExpenses,
        totalOther: totalOtherExpenses,
        total: totalOperatingExpenses + totalOtherExpenses
    },
    operatingProfit,
    netProfit
  };
}

export function classifyCashFlow(balances: AccountBalance[]) {
  const incomeStatement = classifyIncomeStatement(balances);
  const netProfit = incomeStatement.netProfit;

  // Adjustments
  const receivables = balances.filter(a => a.account_code.startsWith('1-1-2'));
  const changeReceivables = receivables.reduce((sum, a) => sum + (a.normal_balance === 'debit' ? a.balance : -a.balance), 0);
  
  const otherCurrentAssets = balances.filter(a => (a.account_code.startsWith('1-1-3') || a.account_code.startsWith('1-1-4')));
  const changeOtherCurrentAssets = otherCurrentAssets.reduce((sum, a) => sum + (a.normal_balance === 'debit' ? a.balance : -a.balance), 0);

  const currentLiabilities = balances.filter(a => a.account_code.startsWith('2-1'));
  const changeCurrentLiabilities = currentLiabilities.reduce((sum, a) => sum + (a.normal_balance === 'credit' ? a.balance : -a.balance), 0);

  const cashFromOperations = netProfit - changeReceivables - changeOtherCurrentAssets + changeCurrentLiabilities;

  // Investing
  const fixedAssets = balances.filter(a => a.account_code.startsWith('1-2'));
  const changeFixedAssets = fixedAssets.reduce((sum, a) => sum + (a.normal_balance === 'debit' ? a.balance : -a.balance), 0);
  const cashFromInvesting = -changeFixedAssets;

  // Financing
  const longTermLiabilities = balances.filter(a => a.account_code.startsWith('2-2'));
  const changeLongTermLiabilities = longTermLiabilities.reduce((sum, a) => sum + (a.normal_balance === 'credit' ? a.balance : -a.balance), 0);

  const equityAccounts = balances.filter(a => a.account_type === 'equity');
  const changeEquity = equityAccounts.reduce((sum, a) => sum + (a.normal_balance === 'credit' ? a.balance : -a.balance), 0);

  const cashFromFinancing = changeLongTermLiabilities + changeEquity;

  const netChangeInCash = cashFromOperations + cashFromInvesting + cashFromFinancing;
  const beginningCash = 0;
  const endingCash = beginningCash + netChangeInCash;

  const cashAccounts = balances.filter(a => a.account_code.startsWith('1-1-1'));
  const actualCashBalance = cashAccounts.reduce((sum, a) => sum + (a.normal_balance === 'debit' ? a.balance : -a.balance), 0);

  return {
    operating: {
      netProfit,
      adjustments: {
        receivables: -changeReceivables,
        otherCurrentAssets: -changeOtherCurrentAssets,
        currentLiabilities: changeCurrentLiabilities
      },
      total: cashFromOperations
    },
    investing: {
      fixedAssets: -changeFixedAssets,
      total: cashFromInvesting
    },
    financing: {
      longTermLiabilities: changeLongTermLiabilities,
      equity: changeEquity,
      total: cashFromFinancing
    },
    summary: {
      netChange: netChangeInCash,
      beginningBalance: beginningCash,
      endingBalance: endingCash,
      actualBalance: actualCashBalance,
      discrepancy: endingCash - actualCashBalance
    }
  };
}

export function classifyEquityChanges(balances: AccountBalance[]) {
  const incomeStatement = classifyIncomeStatement(balances);
  const netProfit = incomeStatement.netProfit;

  const equityAccounts = balances.filter(a => a.account_type === 'equity');
  
  const paidInCapital = equityAccounts.filter(a => a.account_code.startsWith('3-1'));
  const retainedEarnings = equityAccounts.filter(a => a.account_code.startsWith('3-2'));

  const totalPaidInCapital = paidInCapital.reduce((sum, a) => sum + (a.normal_balance === 'credit' ? a.balance : -a.balance), 0);
  const totalRetainedEarnings = retainedEarnings.reduce((sum, a) => sum + (a.normal_balance === 'credit' ? a.balance : -a.balance), 0);

  const beginningBalance = 0; 
  const endingBalance = beginningBalance + totalPaidInCapital + totalRetainedEarnings + netProfit;

  return {
    paidInCapital: {
        accounts: paidInCapital,
        total: totalPaidInCapital
    },
    retainedEarnings: {
        accounts: retainedEarnings,
        total: totalRetainedEarnings
    },
    currentEarnings: {
        total: netProfit
    },
    summary: {
        beginningBalance,
        totalChanges: totalPaidInCapital + totalRetainedEarnings + netProfit,
        endingBalance
    }
  };
}

export function calculateFinancialRatios(balances: AccountBalance[]) {
  const balanceSheet = classifyBalanceSheet(balances);
  const incomeStatement = classifyIncomeStatement(balances);

  // Helper to sum balances from AccountBalance[]
  // Note: balances are already signed correctly? No, classifyBalanceSheet returns filtered arrays.
  // In classifyBalanceSheet, assets are summed using normal_balance check.
  // Here we can reuse the logic or just assume positive if we trust the source.
  // However, classifyBalanceSheet output has raw balances.
  
  // Re-summing based on balance sheet logic to be safe:
  const sumAccounts = (accs: AccountBalance[], type: 'asset' | 'liability' | 'equity') => 
    accs.reduce((sum, a) => {
        // For ratio analysis, we usually work with positive magnitudes
        // But let's respect accounting signs:
        // Asset: Debit +, Credit -
        // Liability/Equity: Credit +, Debit -
        if (type === 'asset') return sum + (a.normal_balance === 'debit' ? a.balance : -a.balance);
        return sum + (a.normal_balance === 'credit' ? a.balance : -a.balance);
    }, 0);

  const currentAssets = sumAccounts(balanceSheet.assets.current, 'asset');
  const currentLiabilities = sumAccounts(balanceSheet.liabilities.current, 'liability');
  
  const totalAssets = balanceSheet.assets.total;
  const totalLiabilities = balanceSheet.liabilities.total;
  const totalEquity = balanceSheet.equity.total;

  const netProfit = incomeStatement.netProfit;
  const totalRevenue = incomeStatement.revenue.total;

  // Liquidity Ratios
  // Current Ratio = Current Assets / Current Liabilities
  const currentRatio = currentLiabilities !== 0 ? currentAssets / currentLiabilities : 0;
  
  // Solvency Ratios
  // Debt to Equity = Total Liabilities / Total Equity
  const debtToEquityRatio = totalEquity !== 0 ? totalLiabilities / totalEquity : 0;
  const debtToAssetRatio = totalAssets !== 0 ? totalLiabilities / totalAssets : 0;
  
  // Profitability Ratios
  // Net Profit Margin = (Net Profit / Revenue) * 100
  const netProfitMargin = totalRevenue !== 0 ? (netProfit / totalRevenue) * 100 : 0;
  
  // ROA = (Net Profit / Total Assets) * 100
  const returnOnAssets = totalAssets !== 0 ? (netProfit / totalAssets) * 100 : 0;
  
  // ROE = (Net Profit / Total Equity) * 100
  const returnOnEquity = totalEquity !== 0 ? (netProfit / totalEquity) * 100 : 0;

  return {
    liquidity: {
      currentRatio,
      currentAssets,
      currentLiabilities
    },
    solvency: {
      debtToEquityRatio,
      debtToAssetRatio,
      totalLiabilities,
      totalEquity
    },
    profitability: {
      netProfitMargin,
      returnOnAssets,
      returnOnEquity,
      netProfit,
      totalRevenue
    }
  };
}
