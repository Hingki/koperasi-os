import { CoaForm } from '../coa-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewAccountPage() {
  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
        <Link href="/dashboard/settings/coa">
            <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
            </Button>
        </Link>
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Tambah Akun Baru</h1>
            <p className="text-muted-foreground">
            Buat akun baru untuk chart of accounts.
            </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <CoaForm />
      </div>
    </div>
  );
}
