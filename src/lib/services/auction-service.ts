import { SupabaseClient } from '@supabase/supabase-js';

export interface Auction {
  id: string;
  koperasi_id: string;
  unit_usaha_id?: string;
  title: string;
  description?: string;
  product_name: string;
  image_url?: string;
  start_price: number;
  min_increment: number;
  buy_now_price?: number;
  current_price: number;
  start_time: string;
  end_time: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  winner_id?: string;
  final_price?: number;
  created_at: string;
  created_by: string;
}

export interface AuctionBid {
  id: string;
  auction_id: string;
  user_id: string;
  amount: number;
  created_at: string;
  user?: {
    email: string;
    user_metadata: {
      nama_lengkap: string;
    }
  }
}

export class AuctionService {
  constructor(private supabase: SupabaseClient) {}

  async getAuctions(koperasiId: string, status?: string) {
    let query = this.supabase
      .from('auctions')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .order('end_time', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getAuctionById(id: string) {
    const { data, error } = await this.supabase
      .from('auctions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async createAuction(auction: Partial<Auction>) {
    const { data, error } = await this.supabase
      .from('auctions')
      .insert({
        ...auction,
        current_price: auction.start_price
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateAuction(id: string, updates: Partial<Auction>) {
    const { data, error } = await this.supabase
      .from('auctions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getBids(auctionId: string) {
    const { data, error } = await this.supabase
      .from('auction_bids')
      .select(`
        *,
        user:user_id (
           email,
           user_metadata
        )
      `) // Note: This join might fail if user_id is in auth.users and we don't have public access. 
         // Usually we join with a public profile table. 
         // For now, assuming we can't easily join auth.users directly via standard client if RLS restricts.
         // We might need to fetch user details separately or use a view.
         // Let's assume there is a 'members' or 'profiles' table or we just show masked ID.
         // Actually, `retail_customers` or `members` table is better.
         // But `winner_id` refs `auth.users`.
         // Let's try to join with `cooperatives_members` if possible, but that's complex.
         // Simpler: Just return bids and let the UI handle user display (or use a server component to fetch user data).
      .eq('auction_id', auctionId)
      .order('amount', { ascending: false });

    if (error) throw error;
    return data;
  }

  async placeBid(auctionId: string, userId: string, amount: number) {
    // 1. Get Auction
    const { data: auction, error: auctionError } = await this.supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single();
    
    if (auctionError || !auction) throw new Error('Auction not found');
    
    // 2. Validate Bid
    if (new Date() > new Date(auction.end_time)) throw new Error('Auction ended');
    if (new Date() < new Date(auction.start_time)) throw new Error('Auction not started');
    if (amount <= auction.current_price) throw new Error('Bid must be higher than current price');
    if (amount < auction.current_price + auction.min_increment) throw new Error(`Minimum increment is ${auction.min_increment}`);

    // 3. Insert Bid
    const { data: bid, error: bidError } = await this.supabase
      .from('auction_bids')
      .insert({
        auction_id: auctionId,
        user_id: userId,
        amount: amount
      })
      .select()
      .single();
    
    if (bidError) throw bidError;

    // 4. Update Auction Current Price
    await this.supabase
      .from('auctions')
      .update({ current_price: amount })
      .eq('id', auctionId);
    
    return bid;
  }

  async finalizeAuction(auctionId: string) {
      // Find highest bidder
      const { data: highestBid } = await this.supabase
        .from('auction_bids')
        .select('*')
        .eq('auction_id', auctionId)
        .order('amount', { ascending: false })
        .limit(1)
        .single();
      
      const updates: any = { status: 'completed' };
      if (highestBid) {
          updates.winner_id = highestBid.user_id;
          updates.final_price = highestBid.amount;
      }

      const { data, error } = await this.supabase
        .from('auctions')
        .update(updates)
        .eq('id', auctionId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
  }
}
