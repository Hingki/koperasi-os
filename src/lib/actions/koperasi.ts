'use server';

import { createClient } from '@/lib/supabase/server';
import { koperasiSchema } from '@/lib/validations/koperasi';
import { revalidatePath } from 'next/cache';

export async function updateKoperasiSettings(formData: FormData) {
  const supabase = await createClient();
  
  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // 2. Parse Data
  const rawData = {
    nama: formData.get('nama'),
    nomor_badan_hukum: formData.get('nomor_badan_hukum'),
    tanggal_berdiri: formData.get('tanggal_berdiri'),
    alamat: formData.get('alamat'),
    kelurahan: formData.get('kelurahan'),
    kecamatan: formData.get('kecamatan'),
    kota: formData.get('kota'),
    provinsi: formData.get('provinsi'),
    kode_pos: formData.get('kode_pos'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    website: formData.get('website'),
    npwp: formData.get('npwp'),
    siup: formData.get('siup'),
  };

  const validated = koperasiSchema.parse(rawData);

  // 3. Check if exists
  const koperasiId = user.user_metadata?.koperasi_id;
  
  if (koperasiId) {
    const { error } = await supabase
      .from('koperasi')
      .update({
        ...validated,
        updated_by: user.id
      })
      .eq('id', koperasiId);
      
    if (error) throw new Error(error.message);
  } else {
    // If no koperasi_id in metadata, try to find one created by this user or insert new
    // This is a fallback/bootstrap scenario
    const { data: existing } = await supabase.from('koperasi').select('id').eq('created_by', user.id).limit(1).single();
    
    if (existing) {
         const { error } = await supabase
          .from('koperasi')
          .update({
            ...validated,
            updated_by: user.id
          })
          .eq('id', existing.id);
          
        if (error) throw new Error(error.message);
    } else {
        const { data: newKoperasi, error } = await supabase
          .from('koperasi')
          .insert({
            ...validated,
            created_by: user.id,
            updated_by: user.id
          })
          .select('id')
          .single();
          
        if (error) throw new Error(error.message);
        
        // IMPORTANT: Update user metadata with new koperasi_id
        if (newKoperasi) {
             await supabase.auth.updateUser({
                data: { koperasi_id: newKoperasi.id }
             });
        }
    }
  }

  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard'); // Branding might be used elsewhere
}
