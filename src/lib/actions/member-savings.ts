'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const withdrawalRequestSchema = z.object({
  account_id: z.string().uuid("Invalid Account ID"),
  amount: z.coerce.number().min(10000, "Minimal penarikan Rp 10.000"),
  bank_name: z.string().min(1, "Nama Bank wajib diisi"),
  account_number: z.string().min(1, "Nomor Rekening wajib diisi"),
  account_holder: z.string().min(1, "Nama Pemilik Rekening wajib diisi"),
});

export async function requestWithdrawal(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Parse and validate
  const rawData = {
    account_id: formData.get('account_id'),
    amount: formData.get('amount'),
    bank_name: formData.get('bank_name'),
    account_number: formData.get('account_number'),
    account_holder: formData.get('account_holder'),
  };

  const validatedFields = withdrawalRequestSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { account_id, amount, bank_name, account_number, account_holder } = validatedFields.data;

  // Get Member Info
  const { data: member } = await supabase
    .from('member')
    .select('id, koperasi_id')
    .eq('user_id', user.id)
    .single();

  if (!member) {
    return { error: 'Data anggota tidak ditemukan.' };
  }

  // Verify Account Ownership and Balance
  const { data: account } = await supabase
    .from('savings_accounts')
    .select('balance, product:savings_products(min_balance, is_withdrawal_allowed)')
    .eq('id', account_id)
    .eq('member_id', member.id)
    .single();

  if (!account) {
    return { error: 'Rekening tidak ditemukan atau bukan milik anda.' };
  }

  // Check if withdrawal allowed
  // Note: savings_products might return an array if not careful, but .single() handles it or returns null if joined 1:1?
  // Actually Supabase join returns object if 1:1 relation is detected or array.
  // Let's assume correct relationship.
  const product = account.product as any;
  
  if (product && product.is_withdrawal_allowed === false) {
      return { error: 'Jenis simpanan ini tidak dapat ditarik.' };
  }

  const minBalance = product?.min_balance || 0;
  if (account.balance - amount < minBalance) {
    return { error: `Saldo tidak mencukupi. Sisa saldo minimal harus Rp ${minBalance.toLocaleString('id-ID')}` };
  }

  // Insert Request
  const { error } = await supabase
    .from('savings_withdrawal_requests')
    .insert({
      koperasi_id: member.koperasi_id,
      member_id: member.id,
      account_id,
      amount,
      bank_name,
      account_number,
      account_holder,
      status: 'pending'
    });

  if (error) {
    console.error('Withdrawal Request Error:', error);
    return { error: 'Gagal mengajukan penarikan. Silakan coba lagi.' };
  }

  revalidatePath('/member/simpanan');
  return { success: true };
}
