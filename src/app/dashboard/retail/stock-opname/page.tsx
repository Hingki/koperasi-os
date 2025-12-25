import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default async function StockOpnamePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Unauthorized</div>;

  const koperasiId = user.user_metadata.koperasi_id;
  const retailService = new RetailService(supabase);
  
  const stockOpnames = await retailService.getStockOpnames(koperasiId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Stock Opname</h1>
            <p className="text-muted-foreground">Riwayat penyesuaian stok fisik.</p>
        </div>
        <Link href="/dashboard/retail/stock-opname/new">
            <Button>
                <Plus className="mr-2 h-4 w-4" />
                Buat Stock Opname
            </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {stockOpnames && stockOpnames.length > 0 ? (
            stockOpnames.map((so: any) => (
                <Card key={so.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">
                            {so.notes || 'Stock Opname'}
                        </CardTitle>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            so.status === 'final' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                            {so.status.toUpperCase()}
                        </span>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Dibuat: {new Date(so.created_at).toLocaleDateString('id-ID')}
                        </p>
                    </CardContent>
                </Card>
            ))
        ) : (
            <div className="text-center py-10 text-muted-foreground">
                Belum ada data stock opname.
            </div>
        )}
      </div>
    </div>
  );
}
