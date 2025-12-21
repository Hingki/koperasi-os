import { createClient } from '@/lib/supabase/client';
import { Koperasi } from '@/lib/types/koperasi';
import { SupabaseClient } from '@supabase/supabase-js';

export const koperasiService = {
  async getKoperasi(koperasiId?: string, client?: SupabaseClient): Promise<Koperasi | null> {
    const supabase = client || createClient();
    
    let query = supabase
      .from('koperasi')
      .select('*');

    if (koperasiId) {
        query = query.eq('id', koperasiId);
    }

    const { data, error } = await query
      .limit(1)
      .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        console.error('Error fetching koperasi:', error);
        return null;
    }
    
    return data as Koperasi;
  },

  async updateKoperasi(id: string, data: Partial<Koperasi>) {
    const supabase = createClient();
    const { error } = await supabase
      .from('koperasi')
      .update(data)
      .eq('id', id);

    if (error) throw error;
  },

  async createKoperasi(data: Omit<Koperasi, 'id' | 'created_at' | 'updated_at' | 'is_active' | 'version'>) {
    const supabase = createClient();
    const { data: newKoperasi, error } = await supabase
      .from('koperasi')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return newKoperasi;
  }
};
