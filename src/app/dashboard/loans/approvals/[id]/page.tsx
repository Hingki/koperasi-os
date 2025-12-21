import { createClient } from '@/lib/supabase/server';
import { reviewLoanApplicationAction, disburseLoan } from '@/lib/actions/loan';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Banknote, AlertTriangle } from 'lucide-react';
import { redirect } from 'next/navigation';
import { DownloadContractButton } from '@/components/loans/DownloadContractButton';

export default async function ApplicationDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  
  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(params.id)) {
      return <div>Invalid Application ID</div>;
  }

  const supabase = await createClient();
  const { data: app, error } = await supabase
    .from('loan_applications')
    .select(`
        *,
        member:member(*),
        product:loan_products(*)
    `)
    .eq('id', params.id)
    .single();

  if (error || !app) return <div>Application not found</div>;

  // Calculate projected interest (Simple Flat for display)
  const interestTotal = app.amount * (app.product.interest_rate / 100) * (app.tenor_months / 12);
  const monthlyInstallment = (app.amount + interestTotal) / app.tenor_months;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/loans/approvals" className="p-2 hover:bg-slate-100 rounded-full" aria-label="Kembali">
            <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Tinjauan Pengajuan</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Application Details */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Rincian Pinjaman</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-sm text-slate-500">Produk</div>
                        <div className="font-medium">{app.product.name}</div>
                    </div>
                    <div>
                        <div className="text-sm text-slate-500">Jumlah Diajukan</div>
                        <div className="font-medium text-lg">
                             {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(app.amount)}
                        </div>
                    </div>
                     <div>
                        <div className="text-sm text-slate-500">Tenor</div>
                        <div className="font-medium">{app.tenor_months} Bulan</div>
                    </div>
                     <div>
                        <div className="text-sm text-slate-500">Tujuan</div>
                        <div className="font-medium">{app.purpose}</div>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-md space-y-2 mt-4">
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Suku Bunga</span>
                        <span className="font-medium">{app.product.interest_rate}% p.a. ({app.product.interest_type})</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Proyeksi Bunga</span>
                        <span className="font-medium">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(interestTotal)}</span>
                     </div>
                     <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="text-slate-900 font-semibold">Est. Angsuran Bulanan</span>
                        <span className="text-blue-600 font-bold">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(monthlyInstallment)}</span>
                     </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
                 <h3 className="font-semibold text-lg border-b pb-2">Informasi Pemohon</h3>
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <div className="text-sm text-slate-500">Nama</div>
                        <div className="font-medium">{app.member.nama_lengkap}</div>
                    </div>
                    <div>
                        <div className="text-sm text-slate-500">No. Anggota</div>
                        <div className="font-medium">{app.member.nomor_anggota}</div>
                    </div>
                    <div>
                        <div className="text-sm text-slate-500">NIK</div>
                        <div className="font-medium">{app.member.nik}</div>
                    </div>
                    <div>
                        <div className="text-sm text-slate-500">Telepon</div>
                        <div className="font-medium">{app.member.phone}</div>
                    </div>
                    <div className="col-span-2">
                        <div className="text-sm text-slate-500">Alamat</div>
                        <div className="font-medium">{app.member.alamat_lengkap}</div>
                    </div>
                 </div>
            </div>
        </div>

        {/* Right: Actions */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
                <h3 className="font-semibold text-lg">Pusat Tindakan</h3>
                
                <div className="space-y-2">
                    <div className="text-sm text-slate-500">Status Saat Ini</div>
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold capitalize bg-slate-100">
                        {app.status === 'submitted' ? 'Diajukan' : app.status === 'approved' ? 'Disetujui' : app.status === 'disbursed' ? 'Dicairkan' : app.status}
                    </div>
                </div>
                
                {/* Download Contract Button (Always visible for approved/disbursed, or even submitted for draft) */}
                <div className="pt-2">
                    <DownloadContractButton 
                        application={app} 
                        member={app.member} 
                        product={app.product} 
                    />
                </div>

                {app.status === 'submitted' && (
                    <form action={reviewLoanApplicationAction} className="space-y-4 pt-4 border-t">
                        <input type="hidden" name="application_id" value={app.id} />
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Catatan Review</label>
                            <textarea name="notes" className="w-full rounded-md border border-slate-200 p-2 text-sm" rows={3} placeholder="Tambahkan komentar..."></textarea>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button name="action" value="reject" className="flex items-center justify-center px-4 py-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100 text-sm font-medium">
                                <XCircle className="w-4 h-4 mr-2" /> Tolak
                            </button>
                            <button name="action" value="approve" className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium">
                                <CheckCircle className="w-4 h-4 mr-2" /> Setujui
                            </button>
                        </div>
                    </form>
                )}

                {app.status === 'approved' && (
                    <div className="pt-4 border-t space-y-4">
                        <div className="bg-blue-50 p-3 rounded-md flex items-start">
                            <AlertTriangle className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                            <p className="text-sm text-blue-800">Pengajuan disetujui. Siap untuk pencairan dana. Ini akan memicu pencatatan Jurnal dan membuat kontrak pinjaman aktif.</p>
                        </div>
                        <form action={async () => {
                            'use server';
                            await disburseLoan(app.id);
                        }}>
                             <button type="submit" className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-bold shadow-sm">
                                <Banknote className="w-5 h-5 mr-2" /> Cairkan Dana
                            </button>
                        </form>
                    </div>
                )}

                {app.status === 'disbursed' && (
                    <div className="pt-4 border-t">
                        <div className="text-center p-4 bg-green-50 rounded-md text-green-800 text-sm font-medium">
                            Pinjaman Dicairkan pada {new Date(app.disbursed_at).toLocaleDateString('id-ID')}
                        </div>
                        <Link href="/dashboard/loans" className="block mt-4 text-center text-sm text-blue-600 hover:underline">
                            Lihat Pinjaman Aktif
                        </Link>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
