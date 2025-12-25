import { createClient } from '@/lib/supabase/server';
import { RentalService } from '@/lib/services/rental-service';
import { RentalTransactionForm } from '../rental-transaction-form';

export default async function NewRentalTransactionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const koperasiId = user.user_metadata.koperasi_id;
  const rentalService = new RentalService(supabase);
  
  // Safe check
  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);
  
  if (!isValidUUID) return <div>Invalid Koperasi ID</div>;

  // Fetch Data in Parallel
  const [items, customers, membersResult] = await Promise.all([
    rentalService.getRentalItems(koperasiId, 'available'),
    rentalService.getRentalCustomers(koperasiId),
    supabase
      .from('member') // Assuming table name is 'member' based on previous checks
      .select('id, nama_lengkap, nomor_anggota')
      .eq('koperasi_id', koperasiId)
      .eq('status', 'active')
      .order('nama_lengkap')
  ]);

  const members = membersResult.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Buat Transaksi Sewa</h1>
        <p className="text-sm text-slate-500">
          Formulir penyewaan unit baru
        </p>
      </div>

      <RentalTransactionForm 
        items={items as any} 
        customers={customers as any} 
        members={members as any} 
      />
    </div>
  );
}
