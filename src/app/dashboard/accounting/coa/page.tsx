import { createClient } from '@/lib/supabase/server';
import { CoaTable } from './coa-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CoaPage() {
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .order('account_code', { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kode Akun (Chart of Accounts)</h1>
          <p className="text-muted-foreground">
            Daftar akun yang digunakan untuk pencatatan transaksi.
          </p>
        </div>
        <Link href="/dashboard/accounting/coa/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Tambah Akun
          </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-white p-4">
         <CoaTable initialAccounts={accounts || []} />
      </div>
    </div>
  );
}
