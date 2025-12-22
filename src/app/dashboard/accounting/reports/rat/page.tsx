import { createClient } from '@/lib/supabase/server';
import { RatView } from './rat-view';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function RatArchivePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <div>Unauthorized</div>;

  // Try to fetch documents
  // If table doesn't exist, this will return an error, which we handle by showing empty list
  const { data: documents, error } = await supabase
    .from('rat_documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error && error.code !== '42P01') { // 42P01 is "undefined_table"
      console.error("Error fetching RAT documents:", error);
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
            <Link href="/dashboard/accounting/reports">
                <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Arsip Dokumen RAT</h1>
                <p className="text-muted-foreground">
                    Penyimpanan Laporan Pertanggungjawaban & Notulen
                </p>
            </div>
        </div>
      </div>

      <RatView documents={documents || []} />
    </div>
  );
}
