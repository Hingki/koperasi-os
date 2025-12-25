'use server';

import { createClient } from '@/lib/supabase/server';
import { CapitalService } from '@/lib/services/capital-service';
import { revalidatePath } from 'next/cache';

export async function investInCapitalProduct(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const koperasiId = user.user_metadata.koperasi_id;
  const productId = formData.get('product_id') as string;
  const amount = Number(formData.get('amount'));
  const paymentMethod = formData.get('payment_method') as 'savings' | 'transfer';
  
  // Need to find member_id for this user
  const { data: member } = await supabase.from('member').select('id').eq('user_id', user.id).single();
  if (!member) return { error: 'Member not found' };

  const capitalService = new CapitalService(supabase);
  
  try {
    await capitalService.invest({
      koperasi_id: koperasiId,
      member_id: member.id,
      product_id: productId,
      amount,
      payment_method: paymentMethod
    });
    
    revalidatePath('/dashboard/investments');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
