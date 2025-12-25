import { createClient } from '@/lib/supabase/server';
import { CapitalService } from '@/lib/services/capital-service';
import { InvestmentForm } from '@/components/capital/investment-form';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function InvestmentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const capitalService = new CapitalService(supabase);
  
  const product = await capitalService.getProductById(params.id);

  if (!product) return <div>Produk tidak ditemukan</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/dashboard/investments" className="flex items-center text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali ke Daftar
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
            <div>
                <Badge className="mb-2">{product.unit_usaha?.nama_unit || 'Umum'}</Badge>
                <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>
                <p className="text-lg text-slate-600 mt-2">{product.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white border rounded-lg">
                    <div className="text-sm text-muted-foreground">Target Dana</div>
                    <div className="text-xl font-bold">{formatCurrency(product.target_amount)}</div>
                </div>
                <div className="p-4 bg-white border rounded-lg">
                    <div className="text-sm text-muted-foreground">Bagi Hasil</div>
                    <div className="text-xl font-bold text-green-600">{product.profit_share_percent}%</div>
                </div>
                <div className="p-4 bg-white border rounded-lg">
                    <div className="text-sm text-muted-foreground">Min. Investasi</div>
                    <div className="text-xl font-bold">{formatCurrency(product.min_investment)}</div>
                </div>
                <div className="p-4 bg-white border rounded-lg">
                    <div className="text-sm text-muted-foreground">Periode</div>
                    <div className="text-xl font-bold">
                        {product.end_date ? new Date(product.end_date).getFullYear() : 'Selamanya'}
                    </div>
                </div>
            </div>

            <div className="prose text-sm text-slate-500">
                <p>
                    Dengan menyertakan modal pada unit usaha ini, Anda berhak mendapatkan bagi hasil sesuai persentase yang disepakati 
                    dari keuntungan bersih unit usaha tersebut. Laporan kinerja akan disampaikan secara transparan melalui dashboard.
                </p>
            </div>
        </div>

        <div>
            <InvestmentForm product={product} />
        </div>
      </div>
    </div>
  );
}
