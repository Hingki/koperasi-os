'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createPatientAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const koperasiId: string | undefined = user.user_metadata?.koperasi_id;
  const unitUsahaId: string | undefined = user.user_metadata?.unit_usaha_id;
  if (!koperasiId) throw new Error('Invalid Koperasi ID');

  const name = (formData.get('name') as string) || '';
  const phone = (formData.get('phone') as string) || '';
  const email = (formData.get('email') as string) || null;
  const address = (formData.get('address') as string) || null;
  const nik = (formData.get('nik') as string) || null;
  const birthDate = (formData.get('birth_date') as string) || null;
  const gender = (formData.get('gender') as string) || null;
  const notes = (formData.get('notes') as string) || null;

  if (!name || !phone) {
    throw new Error('Nama dan nomor telepon wajib diisi');
  }

  const { data, error } = await supabase
    .from('retail_customers')
    .insert({
      koperasi_id: koperasiId,
      unit_usaha_id: unitUsahaId,
      name,
      phone,
      email,
      address,
      customer_type: 'patient',
      is_active: true,
      metadata: {
        nik,
        birth_date: birthDate,
        gender,
        notes,
        source: 'clinic'
      },
      created_by: user.id
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/clinic/patients');
  return { success: true, data };
}

export async function updatePatientAction(id: string, data: {
  name?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  nik?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  notes?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const updatePayload: any = {
    name: data.name,
    phone: data.phone,
    email: data.email,
    address: data.address,
  };

  const meta: any = {};
  if (data.nik !== undefined) meta.nik = data.nik;
  if (data.birth_date !== undefined) meta.birth_date = data.birth_date;
  if (data.gender !== undefined) meta.gender = data.gender;
  if (data.notes !== undefined) meta.notes = data.notes;

  if (Object.keys(meta).length > 0) {
    updatePayload.metadata = meta;
  }

  const { error } = await supabase
    .from('retail_customers')
    .update(updatePayload)
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/clinic/patients');
  return { success: true };
}

export async function searchPatientByPhone(phone: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const koperasiId: string | undefined = user.user_metadata?.koperasi_id;
  if (!koperasiId) throw new Error('Invalid Koperasi ID');

  const { data, error } = await supabase
    .from('retail_customers')
    .select('*')
    .eq('koperasi_id', koperasiId)
    .eq('customer_type', 'patient')
    .ilike('phone', `%${phone}%`)
    .limit(10);

  if (error) throw new Error(error.message);
  return { success: true, data: data || [] };
}
