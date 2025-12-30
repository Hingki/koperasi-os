'use server';

import { createClient } from '@/lib/supabase/server';

export type PersonaId = 'PANDU' | 'TUNTUN';

export async function resolvePersona(): Promise<PersonaId | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: roles } = await supabase
    .from('user_role')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const adminRoles = ['admin', 'pengurus', 'ketua', 'bendahara', 'supervisor'];
  const isAdmin = roles?.some(r => adminRoles.includes(r.role)) || false;
  return isAdmin ? 'PANDU' : 'TUNTUN';
}

