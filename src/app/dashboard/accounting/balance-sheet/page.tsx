import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function BalanceSheetPage() {
  const supabase = createClient();
  
  // Fetch all ledger entries (Warning: Heavy query for MVP only)
  // In prod, use materialized views or optimized SQL queries
  const { data: entries } = await supabase.from('ledger_entries').select('account_debit, account_credit, amount');

  // Aggregation Logic
  const balances: Record<string, number> = {};

  entries?.forEach(entry => {
      // Debit increases Assets (1), decreases Liab (2)/Equity (3)
      // Credit decreases Assets (1), increases Liab (2)/Equity (3)
      
      // Debit Side
      const debitPrefix = entry.account_debit.split('-')[0];
      if (debitPrefix === '1') {
          balances[entry.account_debit] = (balances[entry.account_debit] || 0) + Number(entry.amount);
      } else {
          balances[entry.account_debit] = (balances[entry.account_debit] || 0) - Number(entry.amount);
      }

      // Credit Side
      const creditPrefix = entry.account_credit.split('-')[0];
      if (creditPrefix === '1') {
          balances[entry.account_credit] = (balances[entry.account_credit] || 0) - Number(entry.amount);
      } else {
          balances[entry.account_credit] = (balances[entry.account_credit] || 0) + Number(entry.amount);
      }
  });

  // Helper to filter and sum
  const getGroupTotal = (prefix: string) => {
      return Object.entries(balances)
        .filter(([code]) => code.startsWith(prefix))
        .reduce((sum, [_, val]) => sum + val, 0);
  };

  const assets = Object.entries(balances).filter(([code]) => code.startsWith('1')).sort();
  const liabilities = Object.entries(balances).filter(([code]) => code.startsWith('2')).sort();
  const equity = Object.entries(balances).filter(([code]) => code.startsWith('3')).sort();

  const totalAssets = getGroupTotal('1');
  const totalLiabilities = getGroupTotal('2');
  const totalEquity = getGroupTotal('3');

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/accounting" className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Balance Sheet</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ASSETS */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h2 className="text-xl font-bold border-b pb-4 mb-4 text-blue-700">Assets (Aktiva)</h2>
            <div className="space-y-3">
                {assets.map(([code, amount]) => (
                    <div key={code} className="flex justify-between text-sm">
                        <span className="font-mono text-slate-500">{code}</span>
                        <span className="font-medium">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)}</span>
                    </div>
                ))}
            </div>
            <div className="mt-6 pt-4 border-t flex justify-between font-bold text-lg">
                <span>Total Assets</span>
                <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalAssets)}</span>
            </div>
        </div>

        {/* LIABILITIES & EQUITY */}
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h2 className="text-xl font-bold border-b pb-4 mb-4 text-red-700">Liabilities (Pasiva)</h2>
                <div className="space-y-3">
                    {liabilities.map(([code, amount]) => (
                        <div key={code} className="flex justify-between text-sm">
                            <span className="font-mono text-slate-500">{code}</span>
                            <span className="font-medium">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-6 pt-4 border-t flex justify-between font-bold">
                    <span>Total Liabilities</span>
                    <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalLiabilities)}</span>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h2 className="text-xl font-bold border-b pb-4 mb-4 text-green-700">Equity (Modal)</h2>
                <div className="space-y-3">
                    {equity.map(([code, amount]) => (
                        <div key={code} className="flex justify-between text-sm">
                            <span className="font-mono text-slate-500">{code}</span>
                            <span className="font-medium">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-6 pt-4 border-t flex justify-between font-bold">
                    <span>Total Equity</span>
                    <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalEquity)}</span>
                </div>
            </div>

            <div className="bg-slate-100 p-4 rounded-lg border flex justify-between font-bold text-lg">
                <span>Total Liabilities + Equity</span>
                <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalLiabilities + totalEquity)}</span>
            </div>
        </div>
      </div>
    </div>
  );
}
