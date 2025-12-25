import { createClient } from '@/lib/supabase/server';
import DiscountForm from './discount-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function NewDiscountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/retail/discounts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tambah Diskon Baru</h1>
          <p className="text-sm text-slate-500">
            Buat program diskon atau promosi
          </p>
        </div>
      </div>

      <DiscountForm koperasiId={user.user_metadata.koperasi_id} />
    </div>
  );
}
