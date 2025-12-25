import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { SupplierManager } from './supplier-manager';

export default async function SuppliersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const koperasiId = user.user_metadata.koperasi_id;
  const retailService = new RetailService(supabase);
  
  // Validate UUID
  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);
  const suppliers = isValidUUID ? await retailService.getSuppliers(koperasiId) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Link href="/dashboard/retail">
                <Button variant="ghost" size="icon" aria-label="Kembali">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Supplier</h1>
                <p className="text-sm text-slate-500">
                    Data pemasok barang
                </p>
            </div>
        </div>
      </div>

      <SupplierManager suppliers={suppliers} />
    </div>
  );
}
