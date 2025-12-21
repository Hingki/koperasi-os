'use server';

import { createClient } from '@/lib/supabase/server';

export async function getUserRoleRedirectPath() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return '/login';
  }

  // Check user_role
  const { data: roles } = await supabase
    .from('user_role')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true);

  // If has admin or pengurus role, go to dashboard
  const adminRoles = ['admin', 'pengurus', 'ketua', 'bendahara', 'staff'];
  const hasAdminRole = roles?.some(r => adminRoles.includes(r.role));

  if (hasAdminRole) {
    return '/dashboard';
  }

  // Check if is member
  const { data: member } = await supabase
    .from('member')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (member) {
    return '/member/dashboard';
  }
  
  // Also check if role is 'anggota' explicitly
  const isMemberRole = roles?.some(r => r.role === 'anggota');
  if (isMemberRole) {
      return '/member/dashboard';
  }

  // Default fallback (maybe new user without role)
  // Check metadata for legacy/bootstrap
  if (user.user_metadata?.koperasi_id) {
      return '/dashboard'; // Assume creator is admin
  }

  return '/dashboard'; // Default to dashboard for now, let middleware handle access
}
