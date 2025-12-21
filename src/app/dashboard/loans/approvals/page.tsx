import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus, CheckCircle, XCircle, Clock } from 'lucide-react';

export default async function LoanApprovalsPage() {
  const supabase = await createClient();
  
  // Fetch applications
  const { data: applications, error } = await supabase
    .from('loan_applications')
    .select(`
        *,
        member:member(nama_lengkap, nomor_anggota),
        product:loan_products(name, code)
    `)
    .order('created_at', { ascending: false });

  if (error) return <div>Error loading applications</div>;

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'approved': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1"/> Approved</span>;
          case 'rejected': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1"/> Rejected</span>;
          case 'disbursed': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3 mr-1"/> Disbursed</span>;
          default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1"/> {status}</span>;
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Loan Approvals</h1>
            <p className="text-slate-500">Review and manage loan applications.</p>
        </div>
        <Link href="/dashboard/loans/create">
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2">
                <Plus className="mr-2 h-4 w-4" />
                New Application
            </button>
        </Link>
      </div>

      <div className="rounded-md border bg-white overflow-hidden">
        <table className="w-full caption-bottom text-sm">
            <thead className="bg-slate-50 border-b">
                <tr>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Date</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Applicant</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Product</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Amount</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Status</th>
                    <th className="h-12 px-4 text-right font-medium text-slate-500">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {applications?.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/50">
                        <td className="p-4">{new Date(app.created_at).toLocaleDateString()}</td>
                        <td className="p-4">
                            <div className="font-medium">{app.member?.nama_lengkap}</div>
                            <div className="text-xs text-slate-500">{app.member?.nomor_anggota}</div>
                        </td>
                        <td className="p-4">{app.product?.name}</td>
                        <td className="p-4 font-medium">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(app.amount)}
                            <div className="text-xs text-slate-500">{app.tenor_months} months</div>
                        </td>
                        <td className="p-4">{getStatusBadge(app.status)}</td>
                        <td className="p-4 text-right">
                            <Link href={`/dashboard/loans/approvals/${app.id}`}>
                                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                    Review
                                </button>
                            </Link>
                        </td>
                    </tr>
                ))}
                {applications?.length === 0 && (
                    <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-500">No applications found.</td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
}
