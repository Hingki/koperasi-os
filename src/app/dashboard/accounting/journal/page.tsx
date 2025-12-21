import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function JournalPage() {
  const supabase = await createClient();
  const { data: entries } = await supabase
    .from('ledger_entries')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
       <div className="flex items-center space-x-4">
        <Link href="/dashboard/accounting" className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">General Journal</h1>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Ref</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Debit</th>
                    <th className="px-6 py-3">Credit</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {entries?.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 whitespace-nowrap">{new Date(entry.transaction_date).toLocaleString()}</td>
                        <td className="px-6 py-3 font-mono text-xs">{entry.tx_reference}</td>
                        <td className="px-6 py-3">{entry.description}</td>
                        <td className="px-6 py-3 font-mono text-xs">{entry.account_debit}</td>
                        <td className="px-6 py-3 font-mono text-xs">{entry.account_credit}</td>
                        <td className="px-6 py-3 text-right font-medium">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(entry.amount)}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}
