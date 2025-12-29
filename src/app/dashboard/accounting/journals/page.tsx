import { createClient } from '@/lib/supabase/server';
import { JournalList } from '@/components/accounting/journal-list';
import { getJournalsAction } from '@/lib/actions/journal';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Jurnal Umum (General Ledger) - Koperasi OS',
  description: 'View only journal entries & manual adjustments',
};

export default async function JournalsPage({
  searchParams,
}: {
  searchParams: { page?: string; unit?: string }
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get Koperasi ID & Role Check
  const { data: roles } = await supabase
    .from('user_role')
    .select('koperasi_id, role')
    .eq('user_id', user.id)
    .single();

  if (!roles) {
    return <div className="p-8">Anda tidak memiliki akses koperasi.</div>;
  }

  const isAdmin = ['admin', 'bendahara'].includes(roles.role);

  // Fetch Journals
  const page = Number(searchParams.page) || 1;
  const businessUnit = searchParams.unit;

  const { data: journals, totalPages } = await getJournalsAction({
    page,
    businessUnit,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jurnal Umum</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Core Financial Ledger (Read-Only). Semua transaksi tercatat di sini.
          </p>
        </div>

        {/* Manual Journal Creation Disabled by Constitution */}
        <div className="hidden">
          {/* Legacy Manual Journal Button was here */}
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        <JournalList journals={journals} />
      </div>

      {/* Simple Pagination */}
      <div className="flex justify-center gap-2 mt-4">
        {page > 1 && (
          <Button variant="outline" asChild>
            <a href={`?page=${page - 1}`}>Previous</a>
          </Button>
        )}
        <span className="py-2 text-sm text-muted-foreground">Page {page} of {totalPages}</span>
        {page < totalPages && (
          <Button variant="outline" asChild>
            <a href={`?page=${page + 1}`}>Next</a>
          </Button>
        )}
      </div>
    </div>
  );
}
