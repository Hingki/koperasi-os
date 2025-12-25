'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getPPOBProductsAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const koperasiId = user.user_metadata.koperasi_id;

  const { data, error } = await supabase
    .from('ppob_products')
    .select('*')
    .eq('koperasi_id', koperasiId)
    .order('category', { ascending: true })
    .order('price_sell', { ascending: true });

  if (error) throw new Error(error.message);
  return { data };
}

export async function createPPOBProductAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  
  const koperasiId = user.user_metadata.koperasi_id;

  const rawData = {
    koperasi_id: koperasiId,
    code: formData.get('code') as string,
    name: formData.get('name') as string,
    category: formData.get('category') as string,
    provider: formData.get('provider') as string,
    description: formData.get('description') as string,
    price_base: Number(formData.get('price_base')),
    price_sell: Number(formData.get('price_sell')),
    admin_fee: Number(formData.get('admin_fee')),
    is_active: true
  };

  const { error } = await supabase.from('ppob_products').insert(rawData);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/ppob/products');
  return { success: true };
}

export async function updatePPOBProductAction(id: string, formData: FormData) {
  const supabase = await createClient();
  
  const rawData = {
    code: formData.get('code') as string,
    name: formData.get('name') as string,
    category: formData.get('category') as string,
    provider: formData.get('provider') as string,
    description: formData.get('description') as string,
    price_base: Number(formData.get('price_base')),
    price_sell: Number(formData.get('price_sell')),
    admin_fee: Number(formData.get('admin_fee')),
    is_active: formData.get('is_active') === 'true'
  };

  const { error } = await supabase
    .from('ppob_products')
    .update(rawData)
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/ppob/products');
  return { success: true };
}

export async function deletePPOBProductAction(id: string, formData: FormData) {
    const supabase = await createClient();
    const { error } = await supabase.from('ppob_products').delete().eq('id', id);
    if (error) {
        console.error('Error deleting PPOB product:', error);
        throw new Error(error.message);
    }
    revalidatePath('/dashboard/ppob/products');
}

export async function getPPOBSettings() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    const koperasiId = user.user_metadata.koperasi_id;

    const { data, error } = await supabase
        .from('ppob_settings')
        .select('*')
        .eq('koperasi_id', koperasiId)
        .single();
    
    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return { data };
}

export async function updatePPOBSettingsAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    const koperasiId = user.user_metadata.koperasi_id;

    const rawData = {
        koperasi_id: koperasiId,
        admin_fee: Number(formData.get('admin_fee')),
        is_active: formData.get('is_active') === 'on'
    };

    // Check if exists
    const { data: existing } = await supabase.from('ppob_settings').select('id').eq('koperasi_id', koperasiId).single();

    let error;
    if (existing) {
        const res = await supabase.from('ppob_settings').update(rawData).eq('id', existing.id);
        error = res.error;
    } else {
        const res = await supabase.from('ppob_settings').insert(rawData);
        error = res.error;
    }

    if (error) return { error: error.message };
    revalidatePath('/dashboard/ppob/settings');
    return { success: true };
}

export async function getPPOBTransactionsAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    const koperasiId = user.user_metadata.koperasi_id;

    const { data, error } = await supabase
        .from('ppob_transactions')
        .select('*, member:member_id(nama_lengkap)')
        .eq('koperasi_id', koperasiId)
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) throw new Error(error.message);
    return { data };
}
