
'use server';

import { createClient } from '@/lib/supabase/server';
import { MarketplaceService } from '@/lib/services/marketplace-service';
import { revalidatePath } from 'next/cache';

export interface PPOBProduct {
  id: string;
  category: 'pulsa' | 'data' | 'listrik' | 'pdam';
  provider: string;
  name: string;
  price: number;
  description: string;
  admin_fee?: number;
}

const DEFAULT_PPOB_PRODUCTS: PPOBProduct[] = [
  { id: 'tsel_10', category: 'pulsa', provider: 'Telkomsel', name: 'Pulsa 10.000', price: 12000, description: 'Menambah masa aktif 15 hari' },
  { id: 'tsel_25', category: 'pulsa', provider: 'Telkomsel', name: 'Pulsa 25.000', price: 27000, description: 'Menambah masa aktif 30 hari' },
  { id: 'tsel_50', category: 'pulsa', provider: 'Telkomsel', name: 'Pulsa 50.000', price: 52000, description: 'Menambah masa aktif 45 hari' },
  { id: 'tsel_100', category: 'pulsa', provider: 'Telkomsel', name: 'Pulsa 100.000', price: 102000, description: 'Menambah masa aktif 60 hari' },

  { id: 'isat_10', category: 'pulsa', provider: 'Indosat', name: 'Pulsa 10.000', price: 12000, description: 'Menambah masa aktif 15 hari' },
  { id: 'isat_25', category: 'pulsa', provider: 'Indosat', name: 'Pulsa 25.000', price: 27000, description: 'Menambah masa aktif 30 hari' },

  { id: 'data_tsel_3gb', category: 'data', provider: 'Telkomsel', name: 'Data 3GB / 30 Hari', price: 35000, description: 'Kuota Nasional 3GB' },
  { id: 'data_tsel_10gb', category: 'data', provider: 'Telkomsel', name: 'Data 10GB / 30 Hari', price: 85000, description: 'Kuota Nasional 10GB' },

  { id: 'pln_20', category: 'listrik', provider: 'PLN', name: 'Token PLN 20.000', price: 22500, description: 'Token Listrik Prabayar' },
  { id: 'pln_50', category: 'listrik', provider: 'PLN', name: 'Token PLN 50.000', price: 52500, description: 'Token Listrik Prabayar' },
  { id: 'pln_100', category: 'listrik', provider: 'PLN', name: 'Token PLN 100.000', price: 102500, description: 'Token Listrik Prabayar' },
];

export async function getPPOBProducts() {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('ppob_products')
      .select('*')
      .eq('is_active', true)
      .order('price_sell', { ascending: true });

    if (error || !data || data.length === 0) {
      return DEFAULT_PPOB_PRODUCTS;
    }

    // Map DB fields to PPOBProduct interface
    return data.map((p: any) => ({
      id: p.id,
      category: p.category,
      provider: p.provider,
      name: p.name,
      price: p.price_sell,
      description: p.description,
      admin_fee: p.admin_fee || 0
    })) as PPOBProduct[];

  } catch (err) {
    console.error('Error fetching PPOB products:', err);
    return DEFAULT_PPOB_PRODUCTS;
  }
}

export type PurchaseResult = { success: true; transaction: any; message: string } | { success: false; error: string }; export async function purchasePPOB(formData: FormData): Promise<PurchaseResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const productId = formData.get('productId') as string;
  const customerNumber = formData.get('customerNumber') as string;
  const accountId = formData.get('accountId') as string;

  if (!productId || !customerNumber || !accountId) {
    return { success: false, error: 'Data tidak lengkap' };
  }

  // 1. Get Account to identify Member & Koperasi
  const { data: account, error: accError } = await supabase
    .from('savings_accounts')
    .select('member_id, koperasi_id')
    .eq('id', accountId)
    .single();

  if (accError || !account) return { success: false, error: 'Rekening tidak ditemukan' };

  // 1.5 Verify Account Ownership (Security & Audit)
  // Ensure the authenticated user owns this member profile
  const { data: member } = await supabase
    .from('member')
    .select('id')
    .eq('user_id', user.id)
    .eq('id', account.member_id)
    .single();

  if (!member) {
    return { success: false, error: 'Unauthorized: Rekening ini bukan milik Anda' };
  }

  // 2. Use MarketplaceService for Orchestration
  const marketplaceService = new MarketplaceService(supabase);

  try {
    const result = await marketplaceService.checkoutPpob(
      account.koperasi_id,
      user.id,
      {
        member_id: account.member_id,
        koperasi_id: account.koperasi_id,
        account_id: accountId,
        product_code: productId,
        customer_number: customerNumber
      }
    );

    revalidatePath('/member/ppob');
    return { success: true, transaction: result.transaction, message: 'Pembelian berhasil diproses' };
  } catch (error: any) {
    console.error('PPOB Purchase Failed:', error);
    let friendlyError = error.message;

    if (error.message?.includes('Provider transaction failed')) {
      friendlyError = 'Transaksi gagal di sisi Provider. Silakan coba lagi nanti atau hubungi CS.';
    } else if (error.message?.includes('Insufficient balance')) {
      friendlyError = 'Saldo rekening tidak mencukupi.';
    } else if (error.message?.includes('Product not found')) {
      friendlyError = 'Produk sedang tidak tersedia.';
    }

    return { success: false, error: friendlyError };
  }
}
