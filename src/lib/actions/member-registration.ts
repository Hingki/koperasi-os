'use server';

import { createClient } from '@/lib/supabase/server';
import { memberRegistrationSchema } from '@/lib/validations/member';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function registerCandidateMember(formData: FormData) {
  const supabase = await createClient();
  
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

  // 4. Check NIK uniqueness
  const { data: existingNik } = await supabase
    .from('member')
    .select('id')
    .eq('nik', data.nik)
    .single();

  if (existingNik) {
    return { error: "NIK sudah terdaftar" };
  }

  // 5. Insert Member (Pending)
  const { error } = await supabase.from('member').insert({
    user_id: user.id,
    koperasi_id: user.user_metadata.koperasi_id, // Assuming user is associated with a koperasi context
    nama_lengkap: data.nama_lengkap,
    nik: data.nik,
    phone: data.phone,
    email: data.email,
    alamat_lengkap: data.alamat_lengkap,
    member_type: 'regular',
    status: 'pending', // Pending Approval
    tanggal_daftar: new Date().toISOString()
  });

  if (error) {
    console.error("Registration Error:", error);
    return { error: "Gagal mendaftar anggota" };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function registerSMEPartner(formData: FormData) {
    const supabase = await createClient();
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

    // Insert
    const { error } = await supabase.from('member').insert({
        user_id: user.id,
        koperasi_id: user.user_metadata.koperasi_id,
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
        },
        tanggal_daftar: new Date().toISOString()
    });

    if (error) {
        console.error("SME Registration Error:", error);
        return { error: "Gagal mendaftar mitra UMKM" };
    }

    revalidatePath('/dashboard');
    return { success: true };
}
