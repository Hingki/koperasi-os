'use server';

import { createClient } from '@/lib/supabase/server';
import { MarketplaceService, MarketplaceTransaction } from '@/lib/services/marketplace-service';

export async function getStuckTransactions(minutes: number = 30) {
  const supabase = await createClient();
  const service = new MarketplaceService(supabase);
  
  // Check permission (Only admin/accountant)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  
  // In a real app, check role here.
  
  return service.listStuckTransactions(minutes);
}

export async function runAutoReconciliation(minutes: number = 30) {
  const supabase = await createClient();
  const service = new MarketplaceService(supabase);
  
  // Check permission
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  return service.reconcileStuckTransactions(minutes);
}
