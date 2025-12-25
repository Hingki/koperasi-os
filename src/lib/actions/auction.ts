'use server';

import { createClient } from '@/lib/supabase/server';
import { AuctionService } from '@/lib/services/auction-service';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createAuctionAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const koperasiId = user.user_metadata.koperasi_id;
  const unitUsahaId = user.user_metadata.unit_usaha_id;

  if (!koperasiId) throw new Error('Invalid Koperasi ID');

  const auctionService = new AuctionService(supabase);
  
  await auctionService.createAuction({
    koperasi_id: koperasiId,
    unit_usaha_id: unitUsahaId,
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    product_name: formData.get('product_name') as string,
    start_price: Number(formData.get('start_price')),
    min_increment: Number(formData.get('min_increment')),
    buy_now_price: formData.get('buy_now_price') ? Number(formData.get('buy_now_price')) : undefined,
    start_time: formData.get('start_time') as string,
    end_time: formData.get('end_time') as string,
    created_by: user.id,
    status: 'active' // Auto start for now
  });

  revalidatePath('/dashboard/auction');
  return { success: true };
}

export async function placeBidAction(auctionId: string, amount: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const auctionService = new AuctionService(supabase);
  
  try {
      await auctionService.placeBid(auctionId, user.id, amount);
      revalidatePath(`/dashboard/auction/${auctionId}`);
      return { success: true };
  } catch (error: any) {
      return { success: false, error: error.message };
  }
}

export async function getAuctionsAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');
  
    const koperasiId = user.user_metadata.koperasi_id;
    const auctionService = new AuctionService(supabase);
    return await auctionService.getAuctions(koperasiId);
}
