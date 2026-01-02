'use server';

import { createClient } from '@/lib/supabase/server';
import { createMemberSchema } from '@/lib/validations/member';
import { MemberService } from '@/lib/services/member-service';
import { hasAnyRole } from '@/lib/auth/roles';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

export async function approveMember(memberId: string) {
  const supabase = await createClient();
  const memberService = new MemberService(supabase);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized' };

  // Get Member to find Koperasi ID
  const { data: member } = await supabase.from('member').select('koperasi_id').eq('id', memberId).single();
  if (!member) return { success: false, error: 'Member not found' };

  // Check Permissions
  // "Pendaftaran & pengesahan anggota: hanya admin, ketua, bendahara, pengurus"
  const authorized = await hasAnyRole(['admin', 'ketua', 'bendahara', 'pengurus'], member.koperasi_id);
  if (!authorized) return { success: false, error: 'Permission denied' };

  try {
    await memberService.approve(memberId, user.id);
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/members');
  return { success: true };
}

export async function createMember(formData: FormData) {
  const supabase = await createClient();
  const memberService = new MemberService(supabase);

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
  const { data: userRoles } = await supabase.from('user_role').select('koperasi_id, role').eq('user_id', user.id).eq('is_active', true);

  const activeRole = userRoles?.find(r => ['admin', 'bendahara', 'staff'].includes(r.role)) || userRoles?.[0];
  let koperasiId = activeRole?.koperasi_id;
  if (!koperasiId) {
    const { data: kop } = await supabase.from('koperasi').select('id').limit(1).single();
    koperasiId = kop?.id;
  }

  if (!koperasiId) throw new Error("No Koperasi context found");

  // 4. Create Member via Service (Enforce Number Generation)
  try {
    // 4a. Register as Pending first (No Number)
    const newMember = await memberService.register({
      koperasi_id: koperasiId,
      nama_lengkap: validatedData.nama_lengkap,
      nik: validatedData.nik,
      phone: validatedData.phone,
      alamat_lengkap: validatedData.alamat_lengkap,
      member_type: 'regular',
      status: 'pending',
      metadata: {
        nama_ibu_kandung: validatedData.nama_ibu_kandung,
        tempat_lahir: validatedData.tempat_lahir,
        tanggal_lahir: validatedData.tanggal_lahir,
        pekerjaan: validatedData.pekerjaan,
        created_by: user.id
      }
    });

    // 4b. Immediately Approve to Generate Number & Activate
    // Admin action implies immediate activation
    await memberService.approve(newMember.id, user.id);

  } catch (error: any) {
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
  const memberService = new MemberService(supabase);

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

  // 4. Create Member via Service (Pending)
  let member;
  try {
    member = await memberService.register({
      user_id: user.id,
      koperasi_id: koperasiId,
      nama_lengkap: result.data.nama_lengkap,
      nik: result.data.nik,
      phone: result.data.phone,
      alamat_lengkap: result.data.alamat_lengkap,
      email: user.email,
      member_type: 'regular',
      status: 'pending', // Self-registration requires approval
    });
  } catch (error: any) {
    console.error('Complete Registration Error:', error);
    if (error.message.includes('NIK')) {
      return { success: false, error: 'NIK sudah terdaftar' };
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
