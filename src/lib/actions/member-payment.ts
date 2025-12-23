'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const PaymentSchema = z.object({
  type: z.enum(['savings_deposit', 'loan_payment']),
  referenceId: z.string().uuid(),
  amount: z.coerce.number().min(1000),
  paymentSourceId: z.string().uuid(),
  senderInfo: z.string().min(3),
  notes: z.string().optional(),
});

export async function createMemberPayment(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Get Member ID
  const { data: member } = await supabase
    .from('member')
    .select('id, koperasi_id')
    .eq('user_id', user.id)
    .single();

  if (!member) {
    return { success: false, error: 'Member not found' };
  }

  const rawData = {
    type: formData.get('type'),
    referenceId: formData.get('referenceId'),
    amount: formData.get('amount'),
    paymentSourceId: formData.get('paymentSourceId'),
    senderInfo: formData.get('senderInfo'),
    notes: formData.get('notes'),
  };

  const result = PaymentSchema.safeParse(rawData);

  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const { type, referenceId, amount, paymentSourceId, senderInfo, notes } = result.data;

  // Get Payment Source details for metadata
  const { data: source } = await supabase
    .from('payment_sources')
    .select('*')
    .eq('id', paymentSourceId)
    .single();

  if (!source) {
    return { success: false, error: 'Invalid payment source' };
  }

  const { error } = await supabase
    .from('payment_transactions')
    .insert({
      koperasi_id: member.koperasi_id,
      transaction_type: type,
      reference_id: referenceId,
      amount: amount,
      payment_method: source.method,
      payment_provider: source.provider,
      payment_source_id: source.id,
      payment_status: 'pending',
      proof_of_payment: senderInfo, // Using this for sender info/ref number for now
      metadata: {
        payment_source_id: source.id,
        bank_name: source.bank_name,
        account_number: source.account_number,
        sender_note: notes,
        member_id: member.id // Store member_id for easier querying
      },
      created_by: user.id
    });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/member/pembayaran');
  return { success: true };
}
