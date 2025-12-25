import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import ReturnForm from './return-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function NewSalesReturnPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const retailService = new RetailService(supabase);
  const koperasiId = user.user_metadata.koperasi_id;
  const transactions = await retailService.getPosTransactions(koperasiId, 50); // Get recent 50 transactions

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/retail/sales/returns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Buat Retur Penjualan</h1>
          <p className="text-sm text-slate-500">
            Form pengembalian barang dari pelanggan
          </p>
        </div>
      </div>

      <ReturnForm koperasiId={koperasiId} transactions={transactions || []} />
    </div>
  );
}
