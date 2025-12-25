import { SupabaseClient } from '@supabase/supabase-js';

export class LoyaltyService {
  constructor(private supabase: SupabaseClient) {}

  async getBalance(memberId: string, koperasiId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('loyalty_accounts')
      .select('balance')
      .eq('member_id', memberId)
      .eq('koperasi_id', koperasiId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching loyalty balance:', error);
      return 0;
    }

    return data?.balance || 0;
  }

  async addPoints(koperasiId: string, memberId: string, points: number, description: string, referenceId?: string) {
    if (points <= 0) return;

    // 1. Get or Create Account
    let { data: account } = await this.supabase
      .from('loyalty_accounts')
      .select('id, balance, total_earned')
      .eq('member_id', memberId)
      .eq('koperasi_id', koperasiId)
      .single();

    if (!account) {
      const { data: newAccount, error } = await this.supabase
        .from('loyalty_accounts')
        .insert({
          koperasi_id: koperasiId,
          member_id: memberId,
          balance: 0,
          total_earned: 0
        })
        .select()
        .single();
      if (error) throw error;
      account = newAccount;
    }
    
    if (!account) throw new Error('Failed to initialize loyalty account');

    // 2. Update Balance
    await this.supabase
      .from('loyalty_accounts')
      .update({
        balance: (account.balance || 0) + points,
        total_earned: (account.total_earned || 0) + points,
        updated_at: new Date().toISOString()
      })
      .eq('id', account.id);

    // 3. Record Transaction
    await this.supabase.from('loyalty_transactions').insert({
      account_id: account.id,
      transaction_type: 'earn',
      points: points,
      reference_id: referenceId,
      description: description
    });
  }

  async redeemPoints(koperasiId: string, memberId: string, points: number, description: string, referenceId?: string) {
    if (points <= 0) return;

    const { data: account } = await this.supabase
      .from('loyalty_accounts')
      .select('id, balance, total_redeemed')
      .eq('member_id', memberId)
      .eq('koperasi_id', koperasiId)
      .single();

    if (!account || account.balance < points) {
      throw new Error('Poin tidak mencukupi');
    }

    // Update Balance
    await this.supabase
      .from('loyalty_accounts')
      .update({
        balance: account.balance - points,
        total_redeemed: (account.total_redeemed || 0) + points,
        updated_at: new Date().toISOString()
      })
      .eq('id', account.id);

    // Record Transaction
    await this.supabase.from('loyalty_transactions').insert({
      account_id: account.id,
      transaction_type: 'redeem',
      points: -points, // Negative for redeem
      reference_id: referenceId,
      description: description
    });
  }
}
