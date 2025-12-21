import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import POSInterface from '@/components/retail/pos-interface';

export default async function POSPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const koperasiId = user.user_metadata.koperasi_id;
  const retailService = new RetailService(supabase);

  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);
  
  // Fetch initial data
  const products = isValidUUID ? await retailService.getProducts(koperasiId) : [];
  
  // Also need members for "Pay with Savings"
  const { data: members } = isValidUUID ? await supabase
    .from('member')
    .select('id, nama_lengkap, nomor_anggota')
    .eq('koperasi_id', koperasiId)
    .eq('status', 'active')
    .order('nama_lengkap') : { data: [] };

  // Map to interface expected by POSInterface
  const mappedMembers = members?.map(m => ({
    id: m.id,
    name: m.nama_lengkap,
    member_no: m.nomor_anggota
  })) || [];

  return (
    <div className="h-[calc(100vh-6rem)] -m-4 md:-m-8 overflow-hidden">
        <POSInterface 
            initialProducts={products} 
            members={mappedMembers}
            user={user}
        />
    </div>
  );
}
