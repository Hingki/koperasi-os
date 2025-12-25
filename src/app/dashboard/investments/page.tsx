import { createClient } from '@/lib/supabase/server';
import { CapitalService } from '@/lib/services/capital-service';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

export default async function InvestmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Unauthorized</div>;

  const koperasiId = user.user_metadata.koperasi_id;
  const capitalService = new CapitalService(supabase);
  
  const products = await capitalService.getProducts(koperasiId);
  const { data: memberData } = await supabase.from('member').select('id').eq('user_id', user.id).single();
  const myInvestments = memberData ? await capitalService.getMemberInvestments(memberData.id) : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Modal Penyertaan</h1>
        <p className="text-muted-foreground">Investasi pada unit usaha koperasi dan nikmati bagi hasil.</p>
      </div>

      {/* My Investments */}
      {myInvestments && myInvestments.length > 0 && (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Portofolio Saya</h2>
            <div className="grid gap-4 md:grid-cols-3">
                {myInvestments.map((inv: any) => (
                    <Card key={inv.id} className="bg-blue-50 border-blue-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">{inv.product.name}</CardTitle>
                            <Badge variant="outline" className="w-fit">Active</Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-700">
                                {formatCurrency(inv.amount_invested)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Bagi Hasil: {inv.product.profit_share_percent}%
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
      )}

      {/* Available Products */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Peluang Investasi</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products && products.length > 0 ? (
                products.map((product: any) => (
                    <Card key={product.id} className="flex flex-col h-full">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg">{product.name}</CardTitle>
                                <Badge>{product.unit_usaha?.nama_unit || 'Umum'}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-4">
                            <p className="text-sm text-slate-600 line-clamp-3">
                                {product.description}
                            </p>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Target Dana:</span>
                                    <span className="font-medium">{formatCurrency(product.target_amount)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Min. Investasi:</span>
                                    <span className="font-medium">{formatCurrency(product.min_investment)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Bagi Hasil:</span>
                                    <span className="font-bold text-green-600">{product.profit_share_percent}%</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Link href={`/dashboard/investments/${product.id}`} className="w-full">
                                <Button className="w-full">Lihat Detail</Button>
                            </Link>
                        </CardFooter>
                    </Card>
                ))
            ) : (
                <div className="col-span-full text-center py-10 text-muted-foreground border rounded-lg border-dashed">
                    Belum ada produk investasi yang tersedia saat ini.
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
