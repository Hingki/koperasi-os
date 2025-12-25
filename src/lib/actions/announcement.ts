'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { redirect } from 'next/navigation';

const announcementSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter"),
  content: z.string().optional(),
  type: z.enum(['announcement', 'promo']),
  image_url: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export async function getAnnouncementsAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Get Koperasi ID
    const { data: userRole } = await supabase.from('user_role').select('koperasi_id').eq('user_id', user.id).single();
    if (!userRole?.koperasi_id) return { success: false, error: 'Koperasi context not found' };

    try {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .eq('koperasi_id', userRole.koperasi_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getActiveAnnouncementsAction() {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .eq('is_active', true)
            .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getAnnouncementByIdAction(id: string) {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createAnnouncementAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const rawData = {
        title: formData.get('title'),
        content: formData.get('content'),
        type: formData.get('type'),
        image_url: formData.get('image_url') || undefined,
        start_date: formData.get('start_date') || new Date().toISOString(),
        end_date: formData.get('end_date') || null,
        is_active: formData.get('is_active') === 'on',
    };

    const validatedData = announcementSchema.parse(rawData);

    // Get Koperasi ID
    const { data: userRole } = await supabase.from('user_role').select('koperasi_id').eq('user_id', user.id).single();
    if (!userRole?.koperasi_id) throw new Error("No Koperasi context found");

    const { error } = await supabase.from('announcements').insert({
        koperasi_id: userRole.koperasi_id,
        ...validatedData,
        created_by: user.id
    });

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/announcements');
    revalidatePath('/member/dashboard');
    redirect('/dashboard/announcements');
}

export async function updateAnnouncementAction(id: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const rawData = {
        title: formData.get('title'),
        content: formData.get('content'),
        type: formData.get('type'),
        image_url: formData.get('image_url') || undefined,
        start_date: formData.get('start_date'),
        end_date: formData.get('end_date') || null,
        is_active: formData.get('is_active') === 'on',
    };

    const validatedData = announcementSchema.parse(rawData);

    const { error } = await supabase
        .from('announcements')
        .update(validatedData)
        .eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/announcements');
    revalidatePath('/member/dashboard');
    redirect('/dashboard/announcements');
}

export async function deleteAnnouncementAction(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    
    revalidatePath('/dashboard/announcements');
    revalidatePath('/member/dashboard');
    return { success: true };
}
