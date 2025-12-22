import { createClient } from '@/lib/supabase/server';
import { CoaTable } from './coa-table';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SettingsCoaPage() {
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .order('account_code');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings">
            <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
            </Button>
        </Link>
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Kode Akun (Chart of Accounts)</h1>
            <p className="text-muted-foreground">
            Kelola daftar akun akuntansi untuk pembukuan.
            </p>
        </div>
      </div>

      <CoaTable initialAccounts={accounts || []} />
    </div>
  );
}
