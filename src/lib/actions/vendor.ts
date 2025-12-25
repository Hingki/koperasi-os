'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const vendorSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter"),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email tidak valid").optional().or(z.literal('')),
  address: z.string().optional(),
  is_active: z.coerce.boolean().default(true),
});

export async function getVendorsAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Get Koperasi ID
    const { data: userRole } = await supabase.from('user_role').select('koperasi_id').eq('user_id', user.id).single();
    let koperasiId = userRole?.koperasi_id;
    if (!koperasiId) {
         // Fallback for dev/testing
        const { data: kop } = await supabase.from('koperasi').select('id').limit(1).single();
        koperasiId = kop?.id;
    }

    const { data, error } = await supabase
        .from('inventory_suppliers')
        .select('*')
        .eq('koperasi_id', koperasiId)
        .order('name');

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

export async function createVendorAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const rawData = {
        name: formData.get('name'),
        contact_person: formData.get('contact_person'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        address: formData.get('address'),
        is_active: formData.get('is_active') === 'on',
    };

    const validatedData = vendorSchema.parse(rawData);

    // Get Koperasi ID
    const { data: userRole } = await supabase.from('user_role').select('koperasi_id').eq('user_id', user.id).single();
    let koperasiId = userRole?.koperasi_id;
    if (!koperasiId) {
        const { data: kop } = await supabase.from('koperasi').select('id').limit(1).single();
        koperasiId = kop?.id;
    }

    const { error } = await supabase.from('inventory_suppliers').insert({
        koperasi_id: koperasiId,
        ...validatedData
    });

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/financing/vendors');
    redirect('/dashboard/financing/vendors');
}

export async function updateVendorAction(id: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const rawData = {
        name: formData.get('name'),
        contact_person: formData.get('contact_person'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        address: formData.get('address'),
        is_active: formData.get('is_active') === 'on',
    };

    const validatedData = vendorSchema.parse(rawData);

    const { error } = await supabase
        .from('inventory_suppliers')
        .update(validatedData)
        .eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/financing/vendors');
    redirect('/dashboard/financing/vendors');
}

export async function deleteVendorAction(id: string) {
    const supabase = await createClient();
    
    // Check usage first? For now just try delete or soft delete
    // Soft delete is safer
    const { error } = await supabase
        .from('inventory_suppliers')
        .update({ is_active: false }) // Soft delete by deactivating
        .eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/financing/vendors');
}
