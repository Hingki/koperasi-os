'use client';

import { createMember } from '@/lib/actions/member';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewMemberPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/members" prefetch={false} className="p-2 hover:bg-slate-100 rounded-full" aria-label="Kembali">
            <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Daftarkan Anggota Baru</h1>
      </div>

      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <form action={createMember} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label htmlFor="nama_lengkap" className="text-sm font-medium">Nama Lengkap</label>
                    <input 
                        id="nama_lengkap"
                        type="text" 
                        name="nama_lengkap" 
                        required 
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>
                
                <div className="space-y-2">
                    <label htmlFor="nik" className="text-sm font-medium">NIK (KTP)</label>
                    <input 
                        id="nik"
                        type="text" 
                        name="nik" 
                        required 
                        maxLength={16}
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium">Nomor Telepon</label>
                    <input 
                        id="phone"
                        type="tel" 
                        name="phone" 
                        required 
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="pekerjaan" className="text-sm font-medium">Pekerjaan</label>
                    <input 
                        id="pekerjaan"
                        type="text" 
                        name="pekerjaan" 
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="alamat_lengkap" className="text-sm font-medium">Alamat Lengkap</label>
                <textarea 
                    id="alamat_lengkap"
                    name="alamat_lengkap" 
                    required 
                    rows={3}
                    className="flex w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label htmlFor="tempat_lahir" className="text-sm font-medium">Tempat Lahir</label>
                    <input 
                        id="tempat_lahir"
                        type="text" 
                        name="tempat_lahir" 
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="tanggal_lahir" className="text-sm font-medium">Tanggal Lahir</label>
                    <input 
                        id="tanggal_lahir"
                        type="date" 
                        name="tanggal_lahir" 
                        className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="nama_ibu_kandung" className="text-sm font-medium">Nama Ibu Kandung</label>
                <input 
                    id="nama_ibu_kandung"
                    type="text" 
                    name="nama_ibu_kandung" 
                    className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
            </div>

            <div className="pt-4 flex justify-end space-x-4">
                <Button variant="outline" asChild>
                  <Link href="/dashboard/members">Batal</Link>
                </Button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                    Simpan Anggota
                </button>
            </div>
        </form>
      </div>
    </div>
  );
}
