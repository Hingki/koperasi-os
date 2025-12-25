'use server';

import { createClient } from '@/lib/supabase/server';
import { PaymentService } from '@/lib/services/payment-service';
import { revalidatePath } from 'next/cache';

export async function createDigitalPaymentAction(
  type: 'savings_deposit' | 'loan_payment',
  referenceId: string,
  amount: number,
  method: 'qris' | 'va',
  description?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Get Koperasi ID from user metadata or related record
  // For member, we might need to look up their koperasi_id from member table
  const { data: memberData } = await supabase
    .from('member')
    .select('koperasi_id')
    .eq('user_id', user.id)
    .single();

  if (!memberData?.koperasi_id) {
    throw new Error('Member data not found');
  }

  const paymentService = new PaymentService(supabase, 'mock'); // Force mock for now

  try {
    let result;
    if (method === 'qris') {
      result = await paymentService.createQRISPayment(
        memberData.koperasi_id,
        referenceId,
        type,
        amount,
        description || `Payment for ${type}`,
        user.id
      );
      
      // Update metadata with member_id
      await supabase.from('payment_transactions').update({
          metadata: { member_id: user.id }
      }).eq('id', result.id);
    } else {
        // TODO: Implement VA
        throw new Error('Metode VA belum tersedia saat ini (Gunakan QRIS)');
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Payment Action Error:', error);
    return { success: false, error: error.message };
  }
}

export async function checkPaymentStatusAction(paymentId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('payment_transactions')
        .select('status, updated_at')
        .eq('id', paymentId)
        .single();
    
    return data;
}

export async function simulatePaymentSuccessAction(paymentId: string) {
    const supabase = await createClient();
    const paymentService = new PaymentService(supabase, 'mock');
    
    // In a real scenario, this would be triggered by a Webhook from Xendit/Midtrans
    // Here we simulate it manually for demo purposes
    
    const { data: tx } = await supabase
        .from('payment_transactions')
        .select('external_id, amount')
        .eq('id', paymentId)
        .single();

    if (!tx) throw new Error('Transaction not found');

    const payload = {
        external_id: tx.external_id,
        status: 'success',
        amount: tx.amount
    };

    await paymentService.processWebhook(payload);
    
    revalidatePath('/member/simpanan');
    revalidatePath('/member/pinjaman');
    
    return { success: true };
}
