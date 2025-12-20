'use client';

import { createLoanProduct } from '@/lib/actions/product';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewLoanProductPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/loans/products" className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Create Loan Product</h1>
      </div>

      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <form action={createLoanProduct} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Product Code</label>
                    <input type="text" name="code" placeholder="e.g. FLAT-12" required 
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Product Name</label>
                    <input type="text" name="name" placeholder="e.g. Pinjaman Flat Reguler" required 
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea name="description" rows={2} 
                    className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="space-y-2">
                    <label className="text-sm font-medium">Interest Rate (% p.a.)</label>
                    <input type="number" name="interest_rate" step="0.01" required 
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Interest Type</label>
                    <select name="interest_type" required 
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value="flat">Flat</option>
                        <option value="effective">Effective</option>
                        <option value="annuity">Annuity</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Max Tenor (Months)</label>
                    <input type="number" name="max_tenor_months" required 
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-sm font-medium">Min Amount (Rp)</label>
                    <input type="number" name="min_amount" required 
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Max Amount (Rp)</label>
                    <input type="number" name="max_amount" required 
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="space-y-2">
                    <label className="text-sm font-medium">Admin Fee (Rp)</label>
                    <input type="number" name="admin_fee" defaultValue={0} 
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Provision Fee (%)</label>
                    <input type="number" name="provision_fee" step="0.1" defaultValue={0} 
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium">Late Penalty (%/day)</label>
                    <input type="number" name="penalty_late_daily" step="0.01" defaultValue={0} 
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <input type="checkbox" name="is_active" id="is_active" defaultChecked className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <label htmlFor="is_active" className="text-sm font-medium">Active (Available for application)</label>
            </div>

            <div className="pt-4 flex justify-end space-x-4">
                <Link href="/dashboard/loans/products">
                    <button type="button" className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                        Cancel
                    </button>
                </Link>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                    Save Product
                </button>
            </div>
        </form>
      </div>
    </div>
  );
}
