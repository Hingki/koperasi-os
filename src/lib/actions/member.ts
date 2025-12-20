'use server';

import { createClient } from '@/lib/supabase/server';
import { createMemberSchema } from '@/lib/validations/member';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createMember(formData: FormData) {
  const supabase = createClient();
  
  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // 2. Parse & Validate
  const rawData = {
    nama_lengkap: formData.get('nama_lengkap'),
    nik: formData.get('nik'),
    phone: formData.get('phone'),
    alamat_lengkap: formData.get('alamat_lengkap'),
    nama_ibu_kandung: formData.get('nama_ibu_kandung'),
    tempat_lahir: formData.get('tempat_lahir'),
    tanggal_lahir: formData.get('tanggal_lahir'),
    pekerjaan: formData.get('pekerjaan'),
  };

  const validatedData = createMemberSchema.parse(rawData);

  // 3. Get Koperasi ID (Assuming User has one, or fetch from context)
  // For MVP, fetch the first koperasi user is admin of, or just ANY koperasi for now if only 1 exists
  const { data: userRole } = await supabase.from('user_role').select('koperasi_id').eq('user_id', user.id).single();
  
  // Fallback if no role found (e.g. Service Role in test or Super Admin), just pick first Koperasi
  let koperasiId = userRole?.koperasi_id;
  if (!koperasiId) {
      const { data: kop } = await supabase.from('koperasi').select('id').limit(1).single();
      koperasiId = kop?.id;
  }
  
  if (!koperasiId) throw new Error("No Koperasi context found");

  // 4. Insert Member
  const { error } = await supabase.from('member').insert({
    koperasi_id: koperasiId,
    ...validatedData,
    nomor_anggota: `M-${Date.now().toString().slice(-6)}`, // Auto-gen simple
    status: 'active',
    tanggal_daftar: new Date().toISOString()
  });

  if (error) {
    console.error("Create Member Error:", error);
    throw new Error(error.message);
  }

  // 5. Revalidate & Redirect
  revalidatePath('/dashboard/members');
  redirect('/dashboard/members');
}
