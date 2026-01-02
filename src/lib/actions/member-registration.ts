'use server';

import { createClient } from '@/lib/supabase/server';
import { memberRegistrationSchema } from '@/lib/validations/member';
import { MemberService } from '@/lib/services/member-service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function registerCandidateMember(formData: FormData) {
  const supabase = await createClient();
  const memberService = new MemberService(supabase);

  // 1. Auth Check (User must be logged in to register self, OR we create auth user)
  // For this flow, let's assume User is logged in but has no Member profile yet.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Silakan login atau daftar akun terlebih dahulu" };
  }

  // 2. Parse Data
  const rawData = {
    nama_lengkap: formData.get('nama_lengkap'),
    nik: formData.get('nik'),
    phone: formData.get('phone'),
    email: formData.get('email') || user.email,
    alamat_lengkap: formData.get('alamat_lengkap'),
    member_type: 'regular', // Default
  };

  const validated = memberRegistrationSchema.safeParse(rawData);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;

  // 3. Check if already member
  const { data: existing } = await supabase
    .from('member')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (existing) {
    return { error: "Anda sudah terdaftar sebagai anggota" };
  }

  // 4. Register via Service
  try {
    await memberService.register({
      user_id: user.id,
      koperasi_id: user.user_metadata.koperasi_id, // Assuming user is associated with a koperasi context
      nama_lengkap: data.nama_lengkap,
      nik: data.nik,
      phone: data.phone,
      email: data.email,
      alamat_lengkap: data.alamat_lengkap,
      member_type: 'regular',
      status: 'pending',
    });
  } catch (error: any) {
    console.error("Registration Error:", error);
    if (error.message.includes('NIK')) return { error: "NIK sudah terdaftar" };
    return { error: "Gagal mendaftar anggota" };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function registerSMEPartner(formData: FormData) {
  const supabase = await createClient();
  const memberService = new MemberService(supabase);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // SME Registration is similar but maybe different table or member_type 'mitra'
  const rawData = {
    nama_lengkap: formData.get('nama_pemilik'), // Owner Name
    nik: formData.get('nik'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    alamat_lengkap: formData.get('alamat_usaha'),
    member_type: 'mitra_umkm',
  };

  // Extra fields for SME (Business Name, Sector) - assuming metadata or extended table
  const businessName = formData.get('nama_usaha');
  const businessSector = formData.get('bidang_usaha');

  // Reuse member schema for basic fields
  const validated = memberRegistrationSchema.safeParse(rawData);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;

  // Get Koperasi ID (from metadata or fallback to first koperasi)
  let koperasiId = user.user_metadata.koperasi_id;
  if (!koperasiId) {
    const { data: kop } = await supabase.from('koperasi').select('id').limit(1).single();
    koperasiId = kop?.id;

    // Update user metadata if found
    if (koperasiId) {
      await supabase.auth.updateUser({ data: { koperasi_id: koperasiId } });
    }
  }

  if (!koperasiId) {
    return { error: "Koperasi ID not found. Please contact admin." };
  }

  // Register via Service
  try {
    await memberService.register({
      user_id: user.id,
      koperasi_id: koperasiId,
      nama_lengkap: data.nama_lengkap,
      nik: data.nik,
      phone: data.phone,
      email: data.email,
      alamat_lengkap: data.alamat_lengkap,
      member_type: 'mitra_umkm',
      status: 'pending',
      metadata: {
        business_name: businessName,
        business_sector: businessSector
      }
    });
  } catch (error: any) {
    console.error("SME Registration Error:", error);
    if (error.message.includes('NIK')) return { error: "NIK sudah terdaftar" };
    return { error: "Gagal mendaftar mitra UMKM" };
  }

  revalidatePath('/dashboard');
  return { success: true };
}
