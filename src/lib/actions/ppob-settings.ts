'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { hasAnyRole } from '@/lib/auth/roles';

export async function updatePPOBSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  // Get Koperasi ID
  const { data: member } = await supabase.from('member').select('koperasi_id').eq('user_id', user.id).single();
  if (!member) return { error: 'Member profile not found' };

  // Check Permissions
  const authorized = await hasAnyRole(['admin', 'pengurus', 'ketua', 'bendahara'], member.koperasi_id);
  if (!authorized) return { error: 'Permission denied' };

  const adminFee = Number(formData.get('admin_fee'));
  const depositAccountCode = formData.get('deposit_account_code') as string;
  const revenueAccountCode = formData.get('revenue_account_code') as string;

  if (isNaN(adminFee) || adminFee < 0) {
    return { error: 'Biaya admin tidak valid' };
  }

  // Update or Insert
  const { error } = await supabase
    .from('ppob_settings')
    .upsert({
      koperasi_id: member.koperasi_id,
      admin_fee: adminFee,
      deposit_account_code: depositAccountCode || '1-1501',
      revenue_account_code: revenueAccountCode || '4-1002',
      updated_at: new Date().toISOString()
    }, { onConflict: 'koperasi_id' });

  if (error) {
    console.error('Update PPOB Settings Error:', error);
    return { error: 'Gagal menyimpan pengaturan' };
  }

  revalidatePath('/dashboard/ppob/settings');
  revalidatePath('/member/ppob');
  return { success: true, message: 'Pengaturan berhasil disimpan' };
}
