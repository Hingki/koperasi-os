'use server';

import { createClient } from '@/lib/supabase/server';

export async function getMemberPointsAction(memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('loyalty_accounts')
    .select('balance')
    .eq('member_id', memberId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching points:', error);
    return 0;
  }

  return data?.balance || 0;
}

export async function validateVoucherAction(code: string, purchaseAmount: number, koperasiId: string) {
  const supabase = await createClient();
  
  const { data: voucher, error } = await supabase
    .from('vouchers')
    .select('*')
    .eq('koperasi_id', koperasiId)
    .eq('code', code)
    .eq('is_active', true)
    .single();

  if (error || !voucher) {
    return { valid: false, message: 'Voucher tidak ditemukan atau tidak aktif' };
  }

  // Check dates
  const now = new Date();
  if (voucher.start_date && new Date(voucher.start_date) > now) {
    return { valid: false, message: 'Voucher belum berlaku' };
  }
  if (voucher.end_date && new Date(voucher.end_date) < now) {
    return { valid: false, message: 'Voucher sudah kadaluarsa' };
  }

  // Check usage limit
  if (voucher.usage_limit && voucher.usage_count >= voucher.usage_limit) {
    return { valid: false, message: 'Kuota voucher habis' };
  }

  // Check min purchase
  if (voucher.min_purchase && purchaseAmount < voucher.min_purchase) {
    return { valid: false, message: `Minimal pembelian Rp ${voucher.min_purchase.toLocaleString('id-ID')}` };
  }

  // Calculate discount
  let discount = 0;
  if (voucher.discount_type === 'percentage') {
    discount = purchaseAmount * (voucher.discount_value / 100);
    if (voucher.max_discount && discount > voucher.max_discount) {
      discount = voucher.max_discount;
    }
  } else {
    discount = voucher.discount_value;
  }

  return { 
    valid: true, 
    discountAmount: discount, 
    voucherId: voucher.id,
    message: 'Voucher berhasil dipasang' 
  };
}
