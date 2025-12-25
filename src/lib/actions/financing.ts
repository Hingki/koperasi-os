'use server';

import { createClient } from '@/lib/supabase/server';
import { FinancingService, FinancingApplicationData } from '@/lib/services/financing-service';
import { revalidatePath } from 'next/cache';
import { loanProductSchema } from '@/lib/validations/product';
import { redirect } from 'next/navigation';

export async function getFinancingProductsAction() {
    const supabase = await createClient();
    const service = new FinancingService(supabase);
    try {
        const products = await service.getFinancingProducts();
        return { success: true, data: products };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getSuppliersAction() {
    const supabase = await createClient();
    const service = new FinancingService(supabase);
    try {
        const suppliers = await service.getSuppliers();
        return { success: true, data: suppliers };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function submitFinancingApplicationAction(data: Omit<FinancingApplicationData, 'created_by' | 'member_id' | 'koperasi_id'>) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { success: false, error: 'Unauthorized' };

    // Get Member ID
    const { data: member } = await supabase
        .from('member')
        .select('id, koperasi_id')
        .eq('user_id', user.id)
        .single();
    
    if (!member) return { success: false, error: 'Member not found' };

    const service = new FinancingService(supabase);
    try {
        const result = await service.applyForFinancing({
            ...data,
            member_id: member.id,
            koperasi_id: member.koperasi_id,
            created_by: user.id
        });
        revalidatePath('/member/financing');
        return { success: true, data: result };
    } catch (error: any) {
        console.error('Financing Application Error:', error);
        return { success: false, error: error.message };
    }
}

export async function getMemberFinancingAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    // Get Member ID
    const { data: member } = await supabase
        .from('member')
        .select('id')
        .eq('user_id', user.id)
        .single();
    
    if (!member) return { success: false, error: 'Member not found' };

    const financingService = new FinancingService(supabase);
    try {
        const result = await financingService.getMemberFinancing(member.id);

        return {
            success: true,
            data: result
        };
    } catch (error: any) {
        console.error('Error fetching member financing:', error);
        return { success: false, error: error.message };
    }
}

export async function getAdminFinancingApplicationsAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const { data, error } = await supabase
            .from('loan_applications')
            .select(`
                *,
                member:member(nama_lengkap, nomor_anggota),
                product:loan_products(name, interest_rate, interest_type),
                financing_object:financing_objects!inner(*)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data };
    } catch (error: any) {
        console.error('Error fetching admin financing:', error);
        return { success: false, error: error.message };
    }
}

export async function createFinancingProductAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
  
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
      is_financing: true,
      financing_category: formData.get('financing_category') || undefined,
    };
  
    const validatedData = loanProductSchema.parse(rawData);
  
    // Get Koperasi ID
    const { data: userRole } = await supabase.from('user_role').select('koperasi_id').eq('user_id', user.id).single();
    let koperasiId = userRole?.koperasi_id;
    if (!koperasiId) {
        const { data: kop } = await supabase.from('koperasi').select('id').limit(1).single();
        koperasiId = kop?.id;
    }
    if (!koperasiId) throw new Error("No Koperasi context found");
  
    const { error } = await supabase.from('loan_products').insert({
      koperasi_id: koperasiId,
      ...validatedData,
      created_by: user.id
    });
  
    if (error) throw new Error(error.message);
  
    revalidatePath('/dashboard/financing/products');
    redirect('/dashboard/financing/products');
}

export async function updateFinancingProductAction(id: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
  
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
      is_financing: true,
      financing_category: formData.get('financing_category') || undefined,
    };
  
    const validatedData = loanProductSchema.parse(rawData);
  
    const { error } = await supabase
      .from('loan_products')
      .update(validatedData)
      .eq('id', id);
  
    if (error) throw new Error(error.message);
  
    revalidatePath('/dashboard/financing/products');
    redirect('/dashboard/financing/products');
}
