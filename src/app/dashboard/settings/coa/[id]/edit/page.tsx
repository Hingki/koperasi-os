import { createClient } from '@/lib/supabase/server';
import { CoaForm } from '../../coa-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function EditAccountPage({ params }: PageProps) {
  const supabase = await createClient();
  const { id } = params;

  const { data: account } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('id', id)
    .single();

  if (!account) {
    notFound();
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
        <Link href="/dashboard/settings/coa">
            <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
            </Button>
        </Link>
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Akun</h1>
            <p className="text-muted-foreground">
            Ubah detail akun {account.account_code}.
            </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <CoaForm initialData={account} />
      </div>
    </div>
  );
}
