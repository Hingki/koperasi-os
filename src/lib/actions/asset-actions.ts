'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const assetSchema = z.object({
  asset_code: z.string().min(1, "Kode aset wajib diisi"),
  name: z.string().min(1, "Nama aset wajib diisi"),
  category: z.string().optional(),
  purchase_date: z.string().optional(), // HTML date input returns string YYYY-MM-DD
  purchase_cost: z.coerce.number().min(0),
  useful_life_months: z.coerce.number().min(0).optional(),
  residual_value: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

export async function createAsset(prevState: any, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { success: false, error: 'Unauthorized' };
    
    const koperasi_id = user.user_metadata?.koperasi_id;
    if (!koperasi_id) return { success: false, error: 'Koperasi ID not found' };

    const rawData = Object.fromEntries(formData.entries());
    const validation = assetSchema.safeParse(rawData);

    if (!validation.success) {
        return { success: false, error: validation.error.errors[0].message };
    }

    const { error } = await supabase.from('fixed_assets').insert({
        ...validation.data,
        koperasi_id,
        created_by: user.id,
        purchase_date: validation.data.purchase_date || null, // Handle empty string
    });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/settings/assets');
    return { success: true };
}

export async function updateAsset(id: string, prevState: any, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { success: false, error: 'Unauthorized' };

    const rawData = Object.fromEntries(formData.entries());
    const validation = assetSchema.safeParse(rawData);

    if (!validation.success) {
        return { success: false, error: validation.error.errors[0].message };
    }

    const { error } = await supabase.from('fixed_assets').update({
        ...validation.data,
        updated_at: new Date().toISOString(),
        purchase_date: validation.data.purchase_date || null,
    }).eq('id', id);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/settings/assets');
    return { success: true };
}

export async function deleteAsset(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('fixed_assets').update({ is_active: false }).eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
}
