'use server';

import { createClient } from '@/lib/supabase/server';

export async function createDefaultSavingsProducts() {
  const supabase = await createClient();

  // 1. Auth Check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("Auth Error:", authError);
    throw new Error("Unauthorized: Silakan login ulang.");
  }

  // 2. Get Koperasi Context
  const { data: userRole } = await supabase.from('user_role').select('koperasi_id').eq('user_id', user.id).single();
  let koperasiId = userRole?.koperasi_id;

  // Fallback for MVP if no role
  if (!koperasiId) {
      const { data: kop } = await supabase.from('koperasi').select('id').limit(1).single();
      koperasiId = kop?.id;
  }

  if (!koperasiId) throw new Error("No Koperasi context found");

  // 3. Define Default Products
  const defaults = [
    {
        koperasi_id: koperasiId,
        code: 'SP-01',
        name: 'Simpanan Pokok',
        type: 'pokok',
        description: 'Simpanan awal saat mendaftar menjadi anggota. Tidak dapat diambil selama menjadi anggota.',
        interest_rate: 0,
        min_deposit: 100000,
        min_balance: 100000,
        is_withdrawal_allowed: false,
        created_by: user.id
    },
    {
        koperasi_id: koperasiId,
        code: 'SW-01',
        name: 'Simpanan Wajib',
        type: 'wajib',
        description: 'Simpanan rutin bulanan anggota. Dapat diambil saat berhenti keanggotaan.',
        interest_rate: 0,
        min_deposit: 50000,
        min_balance: 50000,
        is_withdrawal_allowed: false,
        created_by: user.id
    },
    {
        koperasi_id: koperasiId,
        code: 'SSR-01',
        name: 'Simpanan Sukarela',
        type: 'sukarela',
        description: 'Simpanan sukarela dengan bunga menarik. Dapat disetor dan ditarik kapan saja.',
        interest_rate: 3.5, // 3.5% per annum
        min_deposit: 10000,
        min_balance: 10000,
        is_withdrawal_allowed: true,
        created_by: user.id
    }
  ];

  // 4. Insert (Upsert based on code)
  const { error } = await supabase
    .from('savings_products')
    .upsert(defaults, { onConflict: 'koperasi_id, code' });

  if (error) {
      console.error('Error creating default products:', error);
      throw new Error(error.message);
  }

  return { success: true, count: defaults.length };
}
