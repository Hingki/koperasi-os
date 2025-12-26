'use server'

import { createClient } from '@/lib/supabase/server';
import { PpobService, PpobTransactionData } from '@/lib/services/ppob-service';
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

  const service = new PpobService(supabase);

  try {
    const result = await service.purchaseProduct({
      member_id: member.id,
      koperasi_id: member.koperasi_id,
      account_id: accountId,
      product_code: productCode,
      customer_number: customerNumber
    });

    revalidatePath('/member/ppob');
    return { success: true, transaction: result.transaction };
  } catch (err: any) {
    return { error: err.message };
  }
}
