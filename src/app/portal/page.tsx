import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Wallet, Banknote, ArrowRight, TrendingUp } from 'lucide-react';

export default async function MemberPortalDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Fetch Member Info
  const { data: member } = await supabase
    .from('member')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!member) {
      // Handle case where user exists but is not linked to member profile yet
      return <div className="p-4">Member profile not found. Please contact admin.</div>;
  }

  // Fetch Active Loan
  const { data: activeLoan } = await supabase
    .from('loans')
    .select('*')
    .eq('member_id', member.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  // Fetch Savings Summary
  const { data: savings } = await supabase
    .from('savings_accounts')
    .select('balance')
    .eq('member_id', member.id)
    .eq('status', 'active');

  const totalSavings = savings?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-blue-100 text-sm mb-1">Welcome back,</p>
        <h2 className="text-2xl font-bold">{member.nama_lengkap}</h2>
        <div className="mt-4 flex items-center space-x-2 text-sm bg-white/20 w-fit px-3 py-1 rounded-full">
            <span>Member ID: {member.nomor_anggota}</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/portal/savings" className="bg-white p-4 rounded-xl border shadow-sm active:scale-95 transition-transform">
            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <Wallet className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-xs text-slate-500 font-medium">Total Savings</p>
            <p className="text-lg font-bold text-slate-900">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalSavings)}
            </p>
        </Link>

        <Link href="/portal/loans" className="bg-white p-4 rounded-xl border shadow-sm active:scale-95 transition-transform">
            <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center mb-3">
                <Banknote className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-xs text-slate-500 font-medium">Active Loan</p>
             <p className="text-lg font-bold text-slate-900">
                {activeLoan 
                    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(activeLoan.remaining_principal)
                    : '-'
                }
            </p>
        </Link>
      </div>

      {/* Active Loan Details Card */}
      {activeLoan ? (
        <div className="bg-white rounded-xl border shadow-sm p-5">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900">Active Loan</h3>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full capitalize">{activeLoan.status}</span>
            </div>
            <div className="space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Loan Code</span>
                    <span className="font-medium">{activeLoan.loan_code}</span>
                </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Next Payment</span>
                    <span className="font-medium text-red-600">Due Soon</span>
                </div>
                <div className="pt-3 border-t">
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${((activeLoan.principal_amount - activeLoan.remaining_principal) / activeLoan.principal_amount) * 100}%` }}></div>
                    </div>
                    <p className="text-xs text-right mt-1 text-slate-500">
                        {Math.round(((activeLoan.principal_amount - activeLoan.remaining_principal) / activeLoan.principal_amount) * 100)}% Paid
                    </p>
                </div>
            </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm p-6 text-center">
            <div className="mx-auto h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                <TrendingUp className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="font-semibold text-slate-900">Need funds?</h3>
            <p className="text-sm text-slate-500 mb-4">Apply for a loan with competitive interest rates.</p>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-medium shadow hover:bg-blue-700">
                Apply Now
            </button>
        </div>
      )}

      {/* Recent Activity (Placeholder) */}
      <div>
        <div className="flex items-center justify-between mb-3">
             <h3 className="font-bold text-slate-900">Recent Activity</h3>
             <Link href="#" className="text-xs text-blue-600">See all</Link>
        </div>
        <div className="bg-white rounded-xl border shadow-sm divide-y">
            {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Savings Deposit</p>
                            <p className="text-xs text-slate-500">Dec 20, 2025</p>
                        </div>
                    </div>
                    <span className="text-sm font-bold text-green-600">+ Rp 50.000</span>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
