'use client';

import { createLoanApplication } from '@/lib/actions/loan';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CreateApplicationPage() {
    const [members, setMembers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const supabase = createClient();
        Promise.all([
            supabase.from('member').select('id, nama_lengkap, nomor_anggota').eq('status', 'active'),
            supabase.from('loan_products').select('id, name, code, interest_rate').eq('is_active', true)
        ]).then(([m, p]) => {
            setMembers(m.data || []);
            setProducts(p.data || []);
            setLoading(false);
        });
    }, []);

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
             <div className="flex items-center space-x-4">
                <Link href="/dashboard/loans/approvals" className="p-2 hover:bg-slate-100 rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">New Loan Application</h1>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
                <form action={createLoanApplication} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Member</label>
                        <select name="member_id" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white">
                            <option value="">-- Choose Member --</option>
                            {members.map(m => (
                                <option key={m.id} value={m.id}>{m.nama_lengkap} ({m.nomor_anggota})</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Product</label>
                        <select name="product_id" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white">
                            <option value="">-- Choose Product --</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.interest_rate}% p.a.)</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-sm font-medium">Amount (Rp)</label>
                            <input type="number" name="amount" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
                        </div>
                         <div className="space-y-2">
                            <label className="text-sm font-medium">Tenor (Months)</label>
                            <input type="number" name="tenor_months" required className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
                        </div>
                    </div>

                     <div className="space-y-2">
                        <label className="text-sm font-medium">Purpose</label>
                        <textarea name="purpose" required className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-sm" rows={3}></textarea>
                    </div>

                    <div className="pt-4 flex justify-end space-x-4">
                         <Link href="/dashboard/loans/approvals">
                            <button type="button" className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                                Cancel
                            </button>
                        </Link>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                            Submit Application
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
