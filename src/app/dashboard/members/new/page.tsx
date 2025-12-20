'use client';

import { createMember } from '@/lib/actions/member';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewMemberPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/members" className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Register New Member</h1>
      </div>

      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <form action={createMember} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label htmlFor="nama_lengkap" className="text-sm font-medium">Full Name</label>
                    <input 
                        type="text" 
                        name="nama_lengkap" 
                        required 
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                
                <div className="space-y-2">
                    <label htmlFor="nik" className="text-sm font-medium">NIK (KTP)</label>
                    <input 
                        type="text" 
                        name="nik" 
                        required 
                        maxLength={16}
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
                    <input 
                        type="tel" 
                        name="phone" 
                        required 
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="pekerjaan" className="text-sm font-medium">Occupation</label>
                    <input 
                        type="text" 
                        name="pekerjaan" 
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="alamat_lengkap" className="text-sm font-medium">Full Address</label>
                <textarea 
                    name="alamat_lengkap" 
                    required 
                    rows={3}
                    className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label htmlFor="tempat_lahir" className="text-sm font-medium">Birth Place</label>
                    <input 
                        type="text" 
                        name="tempat_lahir" 
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="tanggal_lahir" className="text-sm font-medium">Birth Date</label>
                    <input 
                        type="date" 
                        name="tanggal_lahir" 
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="nama_ibu_kandung" className="text-sm font-medium">Mother's Maiden Name</label>
                <input 
                    type="text" 
                    name="nama_ibu_kandung" 
                    className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="pt-4 flex justify-end space-x-4">
                <Link href="/dashboard/members">
                    <button type="button" className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                        Cancel
                    </button>
                </Link>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                    Save Member
                </button>
            </div>
        </form>
      </div>
    </div>
  );
}
