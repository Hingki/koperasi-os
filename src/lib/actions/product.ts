'use server';

import { createClient } from '@/lib/supabase/server';
import { loanProductSchema } from '@/lib/validations/product';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createLoanProduct(formData: FormData) {
  const supabase = createClient();

  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // 2. Parse & Validate
  const rawData = {
    code: formData.get('code'),
    name: formData.get('name'),
    description: formData.get('description'),
    interest_rate: formData.get('interest_rate'),
    interest_type: formData.get('interest_type'),
    max_tenor_months: formData.get('max_tenor_months'),
    min_amount: formData.get('min_amount'),
    max_amount: formData.get('max_amount'),
    admin_fee: formData.get('admin_fee'),
    provision_fee: formData.get('provision_fee'),
    penalty_late_daily: formData.get('penalty_late_daily'),
    is_active: formData.get('is_active') === 'on',
  };

  const validatedData = loanProductSchema.parse(rawData);

  // 3. Get Koperasi ID
  // For MVP, just pick first Koperasi if multiple, or assume 1
  // Real world: context/session should hold current koperasi_id
  const { data: userRole } = await supabase.from('user_role').select('koperasi_id').eq('user_id', user.id).single();
  let koperasiId = userRole?.koperasi_id;
  if (!koperasiId) {
      const { data: kop } = await supabase.from('koperasi').select('id').limit(1).single();
      koperasiId = kop?.id;
  }
  if (!koperasiId) throw new Error("No Koperasi context found");

  // 4. Insert
  const { error } = await supabase.from('loan_products').insert({
    koperasi_id: koperasiId,
    ...validatedData,
    created_by: user.id
  });

  if (error) {
    console.error("Create Product Error:", error);
    throw new Error(error.message);
  }

  // 5. Redirect
  revalidatePath('/dashboard/loans/products');
  redirect('/dashboard/loans/products');
}
