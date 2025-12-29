import { createClient } from '@/lib/supabase/server';
import { CoaList } from '@/components/accounting/coa-list';
import { Button } from '@/components/ui/button';
import { seedDefaultAccounts } from './actions';
import { AlertCircle, Download, Plus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Chart of Accounts (COA) - Koperasi OS',
  description: 'Kelola bagan akun standar SAK-EP',
};

export default async function CoaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get Koperasi ID & Role Check
  const { data: userRoles } = await supabase
    .from('user_role')
    .select('koperasi_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true);

  // Prioritize admin/bendahara role if multiple exist
  const activeRole = userRoles?.find(r => ['admin', 'bendahara'].includes(r.role)) || userRoles?.[0];

  if (!activeRole || !activeRole.koperasi_id) {
    return <div className="p-8">Anda tidak memiliki akses koperasi atau Koperasi ID tidak valid.</div>;
  }

  const isAdmin = ['admin', 'bendahara'].includes(activeRole.role);

  // Fetch Accounts
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('koperasi_id', activeRole.koperasi_id)
    .order('code', { ascending: true });

  if (error) {
    console.error('Error fetching accounts:', error);
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Gagal memuat data akun: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasAccounts = accounts && accounts.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chart of Accounts (COA)</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Struktur akun standar SAK-EP (Entitas Privat).
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {!hasAccounts && isAdmin && (
            <form action={seedDefaultAccounts}>
              <Button variant="default" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Seed Default SAK-EP
              </Button>
            </form>
          )}
          {/* Note: Manual Add is handled inside the list via sub-account buttons or a global add if needed */}
        </div>
      </div>

      {!isAdmin && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Akses Terbatas</AlertTitle>
          <AlertDescription>
            Anda dalam mode Read-Only. Hanya Admin & Bendahara yang dapat mengubah struktur COA.
          </AlertDescription>
        </Alert>
      )}

      {/* COA List Component */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <CoaList accounts={accounts || []} />
      </div>
    </div>
  );
}
