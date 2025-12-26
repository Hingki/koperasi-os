'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function grantAdminAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // 1. Get member record (singular 'member' table based on route.ts)
  const { data: member } = await supabase
    .from('member')
    .select('id, koperasi_id')
    .eq('user_id', user.id)
    .single();

  if (!member) {
    // Try plural 'members' just in case, though route.ts suggests singular
    const { data: membersMember } = await supabase
        .from('members')
        .select('id, koperasi_id')
        .eq('user_id', user.id)
        .single();
    
    if (!membersMember) {
         throw new Error('Member profile not found. Please register first.');
    }
    // If found in plural table, use it
    // But we proceed with the assumption it's singular if not caught here
  }

  // 2. Check if role already exists
  const { data: existingRole } = await supabase
    .from('user_role')
    .select('id')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single();

  if (existingRole) {
    return { success: true, message: 'Already admin' };
  }

  // 3. Insert admin role
  // We use the member found. If singular fetch failed but plural worked, we'd need that variable.
  // Let's make it robust.
  let targetMember = member;
  if (!targetMember) {
      const { data: m2 } = await supabase.from('members').select('id, koperasi_id').eq('user_id', user.id).single();
      targetMember = m2;
  }
  
  if (!targetMember) throw new Error("Member not found");

  const { error } = await supabase.from('user_role').insert({
    user_id: user.id,
    member_id: targetMember.id,
    koperasi_id: targetMember.koperasi_id, // Ensure we link to the same koperasi
    role: 'admin',
    is_active: true
  });

  if (error) {
    console.error('Grant admin error:', error);
    throw new Error('Failed to grant admin access: ' + error.message);
  }

  revalidatePath('/dashboard');
  return { success: true };
}
