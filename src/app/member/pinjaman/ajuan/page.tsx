import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MemberLoanApplicationForm } from './form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MemberLoanApplicationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Get member info
  const { data: member } = await supabase
    .from('member')
    .select('id, koperasi_id')
    .eq('user_id', user.id)
    .single();

  if (!member) redirect('/login');

  // Fetch available loan products
  const { data: products } = await supabase
    .from('loan_products')
    .select('*')
    .eq('koperasi_id', member.koperasi_id)
    .eq('is_active', true);

  // Check for active loans or pending applications to potentially block new ones
  // (Business logic: maybe allow multiple, maybe not. For now, allow.)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ajukan Pinjaman Baru</h1>
        <p className="text-slate-500">Pilih produk pinjaman dan isi formulir pengajuan.</p>
      </div>

      <Alert className="bg-blue-50 text-blue-800 border-blue-200">
        <Info className="h-4 w-4" />
        <AlertTitle>Informasi</AlertTitle>
        <AlertDescription>
          Pengajuan pinjaman akan ditinjau oleh pengurus koperasi. Pastikan data yang Anda masukkan benar.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Formulir Pengajuan</CardTitle>
        </CardHeader>
        <CardContent>
          <MemberLoanApplicationForm products={products || []} />
        </CardContent>
      </Card>
    </div>
  );
}
