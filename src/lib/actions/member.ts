'use server';

import { createClient } from '@/lib/supabase/server';
import { createMemberSchema } from '@/lib/validations/member';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

export async function createMember(formData: FormData) {
  const supabase = await createClient();
  
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

  // 3. Get Koperasi ID
  const { data: userRole } = await supabase.from('user_role').select('koperasi_id').eq('user_id', user.id).single();
  
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
    nomor_anggota: `M-${Date.now().toString().slice(-6)}`,
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

const updateProfileSchema = z.object({
  phone: z.string().min(10, "Nomor telepon minimal 10 digit"),
  email: z.string().email("Email tidak valid").optional().or(z.literal('')),
  alamat_lengkap: z.string().min(10, "Alamat minimal 10 karakter"),
});

export async function updateMemberProfile(formData: FormData) {
  const supabase = await createClient();

  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // 2. Validate Input
  const rawData = {
    phone: formData.get('phone'),
    email: formData.get('email'),
    alamat_lengkap: formData.get('alamat_lengkap'),
  };

  const result = updateProfileSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  // 3. Update Member
  const { error } = await supabase
    .from('member')
    .update({
      phone: result.data.phone,
      email: result.data.email || null,
      alamat_lengkap: result.data.alamat_lengkap,
    })
    .eq('user_id', user.id);

  if (error) {
    console.error('Update Profile Error:', error);
    return { success: false, error: 'Gagal memperbarui profil' };
  }

  revalidatePath('/member/profil');
  return { success: true };
}

const completeRegistrationSchema = z.object({
  nama_lengkap: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  nik: z.string().min(16, "NIK harus 16 digit").max(16),
  phone: z.string().min(10, "Nomor telepon minimal 10 digit"),
  alamat_lengkap: z.string().min(10, "Alamat minimal 10 karakter"),
});

export async function completeMemberRegistration(formData: FormData) {
  const supabase = await createClient();

  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // 2. Validate Input
  const rawData = {
    nama_lengkap: formData.get('nama_lengkap'),
    nik: formData.get('nik'),
    phone: formData.get('phone'),
    alamat_lengkap: formData.get('alamat_lengkap'),
  };

  const result = completeRegistrationSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  // 3. Get Koperasi ID
  let koperasiId = user.user_metadata?.koperasi_id;
  if (!koperasiId) {
    // Fallback to first available koperasi
    const { data: kop } = await supabase.from('koperasi').select('id').limit(1).single();
    koperasiId = kop?.id;
  }

  if (!koperasiId) return { success: false, error: 'Sistem error: Koperasi tidak ditemukan' };

  // 4. Create Member
  const { data: member, error } = await supabase.from('member').insert({
    koperasi_id: koperasiId,
    user_id: user.id,
    nama_lengkap: result.data.nama_lengkap,
    nik: result.data.nik,
    phone: result.data.phone,
    alamat_lengkap: result.data.alamat_lengkap,
    email: user.email,
    nomor_anggota: `M-${Date.now().toString().slice(-6)}`,
    status: 'active',
    tanggal_daftar: new Date().toISOString()
  }).select().single();

  if (error) {
    console.error('Complete Registration Error:', error);
    if (error.code === '23505') { // Unique violation
        return { success: false, error: 'NIK atau Data sudah terdaftar' };
    }
    return { success: false, error: 'Gagal membuat profil anggota' };
  }

  // 5. Ensure User Role exists
  const { error: roleError } = await supabase.from('user_role').insert({
    user_id: user.id,
    koperasi_id: koperasiId,
    role: 'anggota',
    member_id: member.id
  });
  
  // Ignore role error if it already exists (though unlikely for new member)
  if (roleError && roleError.code !== '23505') {
      console.error("Role creation error", roleError);
  }

  // 6. Update User Metadata
  await supabase.auth.updateUser({
    data: {
      koperasi_id: koperasiId,
      nama_lengkap: result.data.nama_lengkap
    }
  });

  revalidatePath('/member/profil');
  revalidatePath('/dashboard');
  return { success: true };
}
