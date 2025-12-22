'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateEmailSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const koperasiId = user.user_metadata?.koperasi_id;
  if (!koperasiId) throw new Error('Missing koperasi_id');

  const data = {
    provider: (formData.get('provider') as string) || 'smtp',
    smtp_host: (formData.get('smtp_host') as string) || null,
    smtp_port: Number(formData.get('smtp_port') || 587),
    smtp_username: (formData.get('smtp_username') as string) || null,
    smtp_password: (formData.get('smtp_password') as string) || null,
    from_name: (formData.get('from_name') as string) || null,
    from_email: (formData.get('from_email') as string) || null,
    is_active: formData.get('is_active') === 'on'
  };

  const { data: existing } = await supabase
    .from('email_settings')
    .select('id')
    .eq('koperasi_id', koperasiId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from('email_settings')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('email_settings')
      .insert({
        koperasi_id: koperasiId,
        ...data,
        created_by: user.id
      });
    if (error) throw new Error(error.message);
  }

  revalidatePath('/dashboard/settings/email');
  return { success: true };
}

export async function upsertPaymentSource(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const koperasiId = user.user_metadata?.koperasi_id;
  if (!koperasiId) throw new Error('Missing koperasi_id');

  const id = (formData.get('id') as string) || null;
  const name = formData.get('name') as string;
  const method = formData.get('method') as string;
  const provider = (formData.get('provider') as string) || 'manual';
  const unitUsahaId = (formData.get('unit_usaha_id') as string) || null;
  const accountCode = (formData.get('account_code') as string) || null;
  const isActive = formData.get('is_active') === 'on';

  const payload = {
    koperasi_id: koperasiId,
    unit_usaha_id: unitUsahaId || null,
    name,
    method,
    provider,
    account_code: accountCode,
    is_active: isActive
  };

  if (id) {
    const { error } = await supabase
      .from('payment_sources')
      .update({
        ...payload,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('payment_sources')
      .insert({
        ...payload,
        created_by: user.id
      });
    if (error) throw new Error(error.message);
  }

  revalidatePath('/dashboard/settings/payment-sources');
  return { success: true };
}

export async function deletePaymentSource(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('payment_sources')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/settings/payment-sources');
  return { success: true };
}
