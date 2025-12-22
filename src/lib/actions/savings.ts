'use server';

import { createClient } from '@/lib/supabase/server';
import { SavingsService } from '@/lib/services/savings-service';
import { hasAnyRole } from '@/lib/auth/roles';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { savingsProductSchema } from '@/lib/validations/product';

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

export async function processSavingsTransaction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  const accountId = String(formData.get('account_id') || '');
  const amount = Number(formData.get('amount') || 0);
  const type = String(formData.get('type') || 'deposit') as 'deposit' | 'withdrawal';
  const description = String(formData.get('description') || '');

  if (!accountId) throw new Error('Account ID wajib diisi');
  if (!amount || amount <= 0) throw new Error('Jumlah harus lebih dari 0');
  if (!['deposit', 'withdrawal'].includes(type)) throw new Error('Tipe transaksi tidak valid');

  const { data: account } = await supabase
    .from('savings_accounts')
    .select('koperasi_id')
    .eq('id', accountId)
    .single();

  if (!account) throw new Error('Rekening tidak ditemukan');

  const authorized = await hasAnyRole(['admin', 'pengurus', 'bendahara', 'staff'], account.koperasi_id);
  if (!authorized) throw new Error('Anda tidak memiliki izin');

  const service = new SavingsService(supabase);
  await service.processTransaction(accountId, amount, type, user.id, description);

  revalidatePath('/dashboard/savings');
  redirect('/dashboard/savings');
}

export async function createSavingsProduct(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const rawData = {
    code: formData.get('code'),
    name: formData.get('name'),
    type: formData.get('type'),
    description: formData.get('description'),
    interest_rate: formData.get('interest_rate'),
    min_balance: formData.get('min_balance'),
    min_deposit: formData.get('min_deposit'),
    is_withdrawal_allowed: formData.get('is_withdrawal_allowed') === 'on',
    is_active: formData.get('is_active') === 'on',
  };

  const validatedData = savingsProductSchema.parse(rawData);

  // Get Koperasi ID
  const { data: userRole } = await supabase.from('user_role').select('koperasi_id').eq('user_id', user.id).single();
  let koperasiId = userRole?.koperasi_id;
  if (!koperasiId) {
      const { data: kop } = await supabase.from('koperasi').select('id').limit(1).single();
      koperasiId = kop?.id;
  }
  if (!koperasiId) throw new Error("No Koperasi context found");

  const { error } = await supabase.from('savings_products').insert({
    koperasi_id: koperasiId,
    ...validatedData,
    created_by: user.id
  });

  if (error) {
    console.error("Create Savings Product Error:", error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/savings/products');
  redirect('/dashboard/savings/products');
}
