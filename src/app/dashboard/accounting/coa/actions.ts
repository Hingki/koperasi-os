'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { AccountType, NormalBalance } from '@/types/accounting';
import { z } from 'zod';

// Zod Schema for Validation
const createAccountSchema = z.object({
  code: z.string().min(1, 'Kode akun wajib diisi'),
  name: z.string().min(3, 'Nama akun minimal 3 karakter'),
  type: z.enum(['asset', 'liability', 'equity', 'income', 'expense']),
  normal_balance: z.enum(['DEBIT', 'CREDIT']),
  parent_id: z.string().optional().nullable(),
  description: z.string().optional(),
});

const updateAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3, 'Nama akun minimal 3 karakter'),
  is_active: z.boolean(),
  description: z.string().optional(),
});

export type CreateAccountState = {
  errors?: {
    code?: string[];
    name?: string[];
    type?: string[];
    normal_balance?: string[];
    _form?: string[];
  };
  message?: string;
};

export async function createAccount(prevState: CreateAccountState, formData: FormData): Promise<CreateAccountState> {
  const supabase = await createClient();

  // 1. Auth & Role Check (Admin Only)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { message: 'Unauthorized' };

  // Check role
  const { data: roles } = await supabase
    .from('user_role')
    .select('role, koperasi_id')
    .eq('user_id', user.id)
    .in('role', ['admin', 'bendahara']); // Admin & Bendahara allowed

  if (!roles || roles.length === 0) {
    return { message: 'Anda tidak memiliki akses untuk mengelola COA.' };
  }

  const koperasiId = roles[0].koperasi_id;

  // 2. Validate Input
  const validatedFields = createAccountSchema.safeParse({
    code: formData.get('code'),
    name: formData.get('name'),
    type: formData.get('type'),
    normal_balance: formData.get('normal_balance'),
    parent_id: formData.get('parent_id') === 'null' ? null : formData.get('parent_id'),
    description: formData.get('description'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Gagal membuat akun. Periksa input Anda.',
    };
  }

  const { code, name, type, normal_balance, parent_id, description } = validatedFields.data;

  // 3. Insert to DB
  try {
    const { error } = await supabase.from('accounts').insert({
      koperasi_id: koperasiId,
      code,
      name,
      type: type as AccountType,
      normal_balance: normal_balance as NormalBalance,
      parent_id,
      description,
      is_active: true,
    });

    if (error) {
      if (error.code === '23505') { // Unique violation
        return { errors: { code: ['Kode akun sudah digunakan.'] } };
      }
      throw error;
    }
  } catch (error) {
    return { message: 'Database Error: Gagal menyimpan akun.' };
  }

  revalidatePath('/dashboard/accounting/coa');
  return { message: 'Akun berhasil dibuat.' };
}

export async function updateAccount(prevState: CreateAccountState, formData: FormData): Promise<CreateAccountState> {
  const supabase = await createClient();

  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { message: 'Unauthorized' };

  // 2. Validate Input (Strict Update: Only Name, Active, Description)
  const validatedFields = updateAccountSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    is_active: formData.get('is_active') === 'true',
    description: formData.get('description'),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors, message: 'Input tidak valid.' };
  }

  const { id, name, is_active, description } = validatedFields.data;

  // 3. Update DB
  try {
    const { error } = await supabase
      .from('accounts')
      .update({ name, is_active, description, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    return { message: 'Gagal mengupdate akun.' };
  }

  revalidatePath('/dashboard/accounting/coa');
  return { message: 'Akun berhasil diperbarui.' };
}

export async function seedDefaultAccounts(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Get Koperasi ID
  const { data: userRoles } = await supabase
    .from('user_role')
    .select('koperasi_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const activeRole = userRoles?.find(r => ['admin', 'bendahara'].includes(r.role)) || userRoles?.[0];

  if (!activeRole) return;
  const koperasiId = activeRole.koperasi_id;

  // SAK-EP Mandatory Accounts
  const seeds = [
    // EKUITAS (3-0000)
    { code: '3-0000', name: 'EKUITAS', type: 'equity', normal_balance: 'CREDIT', parent_code: null },
    { code: '3-1000', name: 'Simpanan Pokok', type: 'equity', normal_balance: 'CREDIT', parent_code: '3-0000' },
    { code: '3-1100', name: 'Simpanan Wajib', type: 'equity', normal_balance: 'CREDIT', parent_code: '3-0000' },
    { code: '3-1200', name: 'Simpanan Sukarela', type: 'equity', normal_balance: 'CREDIT', parent_code: '3-0000' }, // Kadang Liability, tapi di Koperasi sering di Equity/Kewajiban Jangka Panjang
    { code: '3-2000', name: 'Dana Cadangan', type: 'equity', normal_balance: 'CREDIT', parent_code: '3-0000' },
    { code: '3-3000', name: 'SHU Tahun Berjalan', type: 'equity', normal_balance: 'CREDIT', parent_code: '3-0000' },
    { code: '3-3100', name: 'SHU Belum Dibagi', type: 'equity', normal_balance: 'CREDIT', parent_code: '3-0000' },

    // ASET (1-0000)
    { code: '1-0000', name: 'ASET', type: 'asset', normal_balance: 'DEBIT', parent_code: null },
    { code: '1-1000', name: 'Kas & Bank', type: 'asset', normal_balance: 'DEBIT', parent_code: '1-0000' },
    { code: '1-1100', name: 'Kas Kantor', type: 'asset', normal_balance: 'DEBIT', parent_code: '1-1000' },

    // KEWAJIBAN (2-0000)
    { code: '2-0000', name: 'KEWAJIBAN', type: 'liability', normal_balance: 'CREDIT', parent_code: null },

    // PENDAPATAN (4-0000)
    { code: '4-0000', name: 'PENDAPATAN', type: 'income', normal_balance: 'CREDIT', parent_code: null },

    // BEBAN (5-0000)
    { code: '5-0000', name: 'BEBAN', type: 'expense', normal_balance: 'DEBIT', parent_code: null },
  ];

  try {
    // Insert Parents first
    for (const seed of seeds.filter(s => !s.parent_code)) {
      await supabase.from('accounts').upsert({
        koperasi_id: koperasiId,
        code: seed.code,
        name: seed.name,
        type: seed.type as AccountType,
        normal_balance: seed.normal_balance as NormalBalance,
        is_active: true
      }, { onConflict: 'koperasi_id, code' });
    }

    // Insert Children
    // Need to fetch IDs of parents first
    const { data: accounts } = await supabase.from('accounts').select('id, code').eq('koperasi_id', koperasiId);
    const accountMap = new Map(accounts?.map(a => [a.code, a.id]));

    for (const seed of seeds.filter(s => s.parent_code)) {
      const parentId = accountMap.get(seed.parent_code!);
      if (parentId) {
        await supabase.from('accounts').upsert({
          koperasi_id: koperasiId,
          code: seed.code,
          name: seed.name,
          type: seed.type as AccountType,
          normal_balance: seed.normal_balance as NormalBalance,
          parent_id: parentId,
          is_active: true
        }, { onConflict: 'koperasi_id, code' });
      }
    }

    revalidatePath('/dashboard/accounting/coa');
  } catch (error) {
    console.error('Seeding Error:', error);
    // swallow error for action type; consider surface via UI toast later
  }
}
