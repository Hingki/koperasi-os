'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function grantAdminAccess(formData?: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    // 1. Get member record (Try singular 'member' first, then plural 'members')
    // Use maybeSingle() to avoid throwing error if not found
    let targetMember = null;
    
    const { data: member, error: memberError } = await supabase
      .from('member')
      .select('id, koperasi_id')
      .eq('user_id', user.id)
      .maybeSingle();
      
    if (member) {
      targetMember = member;
    } else {
      // Fallback to plural 'members' table
      const { data: membersMember } = await supabase
          .from('members')
          .select('id, koperasi_id')
          .eq('user_id', user.id)
          .maybeSingle();
      targetMember = membersMember;
    }

    if (!targetMember) {
      console.error('Member lookup failed for user:', user.id);
      throw new Error('Profil anggota tidak ditemukan. Pastikan Anda sudah terdaftar sebagai anggota.');
    }

    // 2. Check if role already exists
    const { data: existingRole } = await supabase
      .from('user_role')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (existingRole) {
      return { success: true, message: 'Already admin' };
    }

    // 3. Insert admin role
    const { error: insertError } = await supabase.from('user_role').insert({
      user_id: user.id,
      member_id: targetMember.id,
      koperasi_id: targetMember.koperasi_id,
      role: 'admin',
      is_active: true
    });

    if (insertError) {
      console.error('Grant admin insert error:', insertError);
      throw new Error('Gagal memberikan akses admin: ' + insertError.message);
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Grant admin unexpected error:', error);
    // Re-throw with a clean message that client can display
    throw new Error(error.message || 'Terjadi kesalahan sistem saat memproses permintaan.');
  }
}
