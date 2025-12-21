'use server';

import { createClient } from '@/lib/supabase/server';
import { LoanService } from '@/lib/services/loan-service';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Helper to get authorized service
async function getLoanService() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  
  return {
    service: new LoanService(supabase),
    user
  };
}

export async function applyForLoan(data: {
  loan_type_id: string;
  amount: number;
  purpose: string;
}) {
  try {
    const { service, user } = await getLoanService();
    const koperasiId = user.user_metadata.koperasi_id;
    if (!koperasiId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId)) {
        throw new Error('Invalid Koperasi ID in user metadata');
    }
    
    // For MVP, we assume the user IS the member (Member Portal)
    const supabase = await createClient();
    const { data: member } = await supabase
        .from('member') // Fixed table name
        .select('id')
        .eq('user_id', user.id)
        .single();
    
    if (!member) {
        throw new Error('User is not linked to a member record');
    }

    await service.applyForLoan({
        koperasi_id: koperasiId,
        member_id: member.id,
        loan_type_id: data.loan_type_id,
        amount: data.amount,
        purpose: data.purpose,
        created_by: user.id
    });

    revalidatePath('/dashboard/pinjaman/pengajuan');
    revalidatePath('/dashboard/pinjaman');
    return { success: true };
  } catch (error: any) {
    console.error('Create Loan App Error:', error);
    return { success: false, error: error.message };
  }
}

export async function submitMemberLoanApplication(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Unauthorized');

    const productId = formData.get('product_id') as string;
    const amountStr = formData.get('amount') as string;
    const tenorStr = formData.get('tenor_months') as string;
    const purpose = formData.get('purpose') as string;

    if (!productId || !amountStr || !tenorStr) {
      throw new Error('Mohon lengkapi semua field');
    }

    // Get Member ID from Session
    const { data: member } = await supabase
      .from('member')
      .select('id, koperasi_id')
      .eq('user_id', user.id)
      .single();
    
    if (!member) throw new Error('Member profile not found');

    const service = new LoanService(supabase);
    
    await service.applyForLoan({
      koperasi_id: member.koperasi_id,
      member_id: member.id,
      loan_type_id: productId,
      amount: Number(amountStr),
      tenor_months: Number(tenorStr),
      purpose: purpose || 'Pengajuan via Portal Anggota',
      created_by: user.id
    });

    revalidatePath('/member/pinjaman');
    return { success: true };
  } catch (error: any) {
    console.error('Member Loan App Error:', error);
    return { success: false, error: error.message };
  }
}

export async function createLoanApplication(formData: FormData) {
  try {
    const { service, user } = await getLoanService();

    const memberId = formData.get('member_id') as string;
    const productId = formData.get('product_id') as string;
    const amountStr = formData.get('amount') as string;
    const tenorStr = formData.get('tenor_months') as string;
    const purpose = formData.get('purpose') as string;

    if (!memberId || !productId || !amountStr || !tenorStr) {
        throw new Error('Mohon lengkapi semua field');
    }

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(memberId)) throw new Error('Invalid Member ID');
    if (!uuidRegex.test(productId)) throw new Error('Invalid Product ID');

    // Get Koperasi ID from Member
    const supabase = await createClient();
    const { data: member } = await supabase
        .from('member')
        .select('koperasi_id')
        .eq('id', memberId)
        .single();
    
    if (!member) throw new Error('Member tidak ditemukan');

    await service.applyForLoan({
        koperasi_id: member.koperasi_id,
        member_id: memberId,
        loan_type_id: productId,
        amount: Number(amountStr),
        tenor_months: Number(tenorStr),
        purpose: purpose,
        created_by: user.id
    });

  } catch (error: any) {
    console.error('Create Application Error:', error);
    throw error;
  }
  
  revalidatePath('/dashboard/loans/approvals');
  redirect('/dashboard/loans/approvals');
}

export async function applyForLoanMemberAction(formData: FormData) {
  try {
    const { service, user } = await getLoanService();

    const productId = formData.get('product_id') as string;
    const amountStr = formData.get('amount') as string;
    const tenorStr = formData.get('tenor_months') as string;
    const purpose = formData.get('purpose') as string;

    if (!productId || !amountStr || !tenorStr) {
        throw new Error('Mohon lengkapi semua field');
    }

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) throw new Error('Invalid Product ID');

    // Get Member ID linked to Current User (Security Enforced)
    const supabase = await createClient();
    const { data: member } = await supabase
        .from('member')
        .select('id, koperasi_id')
        .eq('user_id', user.id)
        .single();
    
    if (!member) throw new Error('Member data not found for current user');

    await service.applyForLoan({
        koperasi_id: member.koperasi_id,
        member_id: member.id,
        loan_type_id: productId,
        amount: Number(amountStr),
        tenor_months: Number(tenorStr),
        purpose: purpose,
        created_by: user.id
    });

  } catch (error: any) {
    console.error('Member Apply Error:', error);
    // return { error: error.message }; // If used with useFormState
    throw error;
  }
  
  revalidatePath('/member/pinjaman');
  redirect('/member/pinjaman');
}

export async function reviewLoanApplicationAction(formData: FormData) {
  const id = formData.get('application_id') as string;
  const notes = formData.get('notes') as string;
  const action = formData.get('action') as string; // 'approve' | 'reject'

  if (!id || !action) throw new Error('Invalid form data');

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) throw new Error('Invalid Application ID');

  const status = action === 'approve' ? 'approved' : 'rejected';
  const result = await reviewLoanApplication(id, status, notes);

  if (!result.success) {
      throw new Error(result.error || 'Gagal memproses pengajuan');
  }

  redirect('/dashboard/loans/approvals');
}

export async function reviewLoanApplication(id: string, status: 'approved' | 'rejected', notes: string) {
  try {
    const { service, user } = await getLoanService();
    await service.reviewApplication(id, status, notes, user.id);
    revalidatePath('/dashboard/loans/approvals');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function disburseLoan(id: string) {
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        throw new Error('Invalid Application ID');
    }
    const { service, user } = await getLoanService();
    await service.disburseLoan(id, user.id);
    revalidatePath('/dashboard/loans/approvals');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function processRepayment(repaymentId: string, amount: number) {
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(repaymentId)) {
        throw new Error('Invalid Repayment ID');
    }
    const { service, user } = await getLoanService();
    await service.recordRepayment(repaymentId, amount, user.id);
    revalidatePath('/dashboard/loans'); // Refresh dashboard
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
