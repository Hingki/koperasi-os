import { createClient } from '@/lib/supabase/server';
import { SHUService } from '@/lib/services/shu-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, TrendingUp, Wallet, ShoppingBag } from 'lucide-react';

export const metadata = {
  title: 'Estimasi SHU | Member Area',
  description: 'Lihat estimasi Sisa Hasil Usaha (SHU) Anda tahun ini.',
};

export default async function MemberSHUPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <div>Unauthorized</div>;

  // 1. Get Member & Koperasi Info
  const { data: member } = await supabase
    .from('member')
    .select('id, nama_lengkap, koperasi_id, member_type')
    .eq('user_id', user.id)
    .single();

  if (!member || !member.koperasi_id) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Data keanggotaan tidak ditemukan.</AlertDescription>
      </Alert>
    );
  }

  // 2. Calculate SHU
  const currentYear = new Date().getFullYear();
  const shuService = new SHUService(supabase);
  
  let shuData;
  try {
      shuData = await shuService.calculateMemberSHU(member.koperasi_id, currentYear, member.id);
  } catch (error) {
      console.error('SHU Calculation Error:', error);
      return (
        <Alert variant="destructive">
            <AlertTitle>Gagal Memuat Data</AlertTitle>
            <AlertDescription>Terjadi kesalahan saat menghitung estimasi SHU.</AlertDescription>
        </Alert>
      );
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const { total_shu, details } = shuData;
  const hasData = details && total_shu >= 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Estimasi SHU {currentYear}</h1>
        <p className="text-slate-500">
            Proyeksi pembagian Sisa Hasil Usaha berdasarkan partisipasi Anda hingga hari ini.
        </p>
      </div>

      {!hasData ? (
         <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Belum Ada Data</AlertTitle>
            <AlertDescription>
                Data keuangan tahun ini belum mencukupi untuk estimasi SHU, atau Koperasi belum mencatatkan laba bersih.
            </AlertDescription>
         </Alert>
      ) : (
        <>
            {/* Main Estimate Card */}
            <Card className="bg-gradient-to-br from-red-600 to-red-700 text-white border-none shadow-xl">
                <CardHeader>
                    <CardTitle className="text-red-100 font-medium text-lg">Total Estimasi Diterima</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold mb-2">
                        {formatMoney(total_shu)}
                    </div>
                    <p className="text-red-100 text-sm opacity-90">
                        *Nilai ini adalah estimasi sementara dan dapat berubah sesuai kinerja koperasi hingga akhir tahun.
                    </p>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Jasa Modal Breakdown */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Jasa Modal (Investasi)</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatMoney(details.jasa_modal)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Dari total simpanan Anda
                        </p>
                        
                        <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Simpanan Anda</span>
                                <span className="font-medium">{formatMoney(details.member_capital)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Total Simpanan Koperasi</span>
                                <span className="font-medium">{formatMoney(details.total_capital)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>Porsi Kepemilikan</span>
                                <span>{((details.member_capital / details.total_capital) * 100).toFixed(4)}%</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Jasa Anggota Breakdown */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Jasa Anggota (Transaksi)</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatMoney(details.jasa_anggota)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Dari aktivitas belanja & pinjaman
                        </p>

                         <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Transaksi Anda</span>
                                <span className="font-medium">{formatMoney(details.member_transactions)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Total Transaksi Anggota</span>
                                <span className="font-medium">{formatMoney(details.total_transactions)}</span>
                            </div>
                             <div className="flex justify-between text-xs text-slate-400">
                                <span>Kontribusi Aktivitas</span>
                                <span>{((details.member_transactions / details.total_transactions) * 100).toFixed(4)}%</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Breakdown */}
             <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Rincian Aktivitas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-full">
                                <ShoppingBag className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-900">Belanja Retail</p>
                                <p className="text-xs text-slate-500">Total belanja di unit toko/mart</p>
                            </div>
                        </div>
                        <span className="font-semibold">{formatMoney(details.breakdown?.retail_sales || 0)}</span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-full">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-900">Jasa Pinjaman</p>
                                <p className="text-xs text-slate-500">Total bunga pinjaman yang dibayarkan</p>
                            </div>
                        </div>
                        <span className="font-semibold">{formatMoney(details.breakdown?.loan_interest || 0)}</span>
                    </div>
                </CardContent>
            </Card>

            <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Informasi Penting</AlertTitle>
                <AlertDescription className="text-blue-700 text-sm">
                    Nilai SHU final akan diputuskan dan disahkan pada Rapat Anggota Tahunan (RAT). 
                    Pastikan status keanggotaan Anda tetap aktif untuk menerima pembagian SHU.
                </AlertDescription>
            </Alert>
        </>
      )}
    </div>
  );
}
