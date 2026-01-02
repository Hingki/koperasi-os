'use server'

import { createClient } from '@/lib/supabase/server';
import { MarketplaceService } from '@/lib/services/marketplace-service';
import { revalidatePath } from 'next/cache';

export async function purchasePpobProduct(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const productCode = formData.get('productCode') as string;
  const customerNumber = formData.get('customerNumber') as string;
  const accountId = formData.get('accountId') as string;

  if (!productCode || !customerNumber || !accountId) {
    return { error: 'Missing required fields' };
  }

  // Get Member Info
  const { data: member } = await supabase
    .from('member')
    .select('id, koperasi_id')
    .eq('user_id', user.id)
    .single();

  if (!member) {
    return { error: 'Member not found' };
  }

  const marketplaceService = new MarketplaceService(supabase);

  try {
    const result = await marketplaceService.checkoutPpob(
      member.koperasi_id,
      user.id,
      {
        member_id: member.id,
        koperasi_id: member.koperasi_id,
        account_id: accountId,
        product_code: productCode,
        customer_number: customerNumber
      }
    );

    revalidatePath('/member/ppob');
    return { success: true, transaction: result.transaction };
  } catch (err: any) {
    return { error: err.message };
  }
}
