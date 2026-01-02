'use server';

import { createClient } from '@/lib/supabase/server';
import { MarketplaceService, MarketplaceTransaction } from '@/lib/services/marketplace-service';
import { getUserRoles } from '@/lib/auth/roles';

export async function getStuckTransactions(minutes: number = 30) {
  const supabase = await createClient();
  const service = new MarketplaceService(supabase);

  // Check permission (Only admin/accountant)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // View access is more permissive, but let's at least ensure they are staff/pengurus
  const roles = await getUserRoles();
  const hasAccess = roles.length > 0; // Any active role
  if (!hasAccess) throw new Error('Unauthorized: No active role found');

  return service.listStuckTransactions(minutes);
}

export async function runAutoReconciliation(minutes: number = 30) {
  const supabase = await createClient();

  // Check permission
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // STRICT Role Check for Financial Actions
  const roles = await getUserRoles();
  const allowedRoles = ['admin', 'bendahara', 'ketua'];
  const hasPermission = roles.some(r => allowedRoles.includes(r.role));

  if (!hasPermission) {
    throw new Error('Access Denied: Only Admin, Bendahara, or Ketua can perform reconciliation.');
  }

  const service = new MarketplaceService(supabase);
  return service.reconcileStuckTransactions(minutes);
}
