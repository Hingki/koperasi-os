import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { BookOpen, TrendingUp, DollarSign } from 'lucide-react';

export default async function AccountingPage() {
  const supabase = createClient();
  
  // Fetch recent journal entries
  const { data: entries } = await supabase
    .from('ledger_entries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Accounting</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/dashboard/accounting/balance-sheet" className="p-6 bg-white rounded-lg border shadow-sm hover:bg-slate-50 transition-colors">
            <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-900">Balance Sheet</h3>
                    <p className="text-slate-500">View Assets, Liabilities, and Equity</p>
                </div>
            </div>
        </Link>
        <Link href="/dashboard/accounting/journal" className="p-6 bg-white rounded-lg border shadow-sm hover:bg-slate-50 transition-colors">
            <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-900">General Journal</h3>
                    <p className="text-slate-500">View all transaction history</p>
                </div>
            </div>
        </Link>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
            <h3 className="font-bold text-lg">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Description</th>
                        <th className="px-6 py-3">Debit Account</th>
                        <th className="px-6 py-3">Credit Account</th>
                        <th className="px-6 py-3 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {entries?.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-3">{new Date(entry.transaction_date).toLocaleDateString()}</td>
                            <td className="px-6 py-3">{entry.description}</td>
                            <td className="px-6 py-3 font-mono text-xs">{entry.account_debit}</td>
                            <td className="px-6 py-3 font-mono text-xs">{entry.account_credit}</td>
                            <td className="px-6 py-3 text-right font-medium">
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(entry.amount)}
                            </td>
                        </tr>
                    ))}
                    {entries?.length === 0 && (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No transactions recorded yet.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
