
'use server';

import { createClient } from '@/lib/supabase/server';
import { SavingsService } from '@/lib/services/savings-service';
import { LedgerService } from '@/lib/services/ledger-service';
import { AccountCode } from '@/lib/types/ledger';
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

export async function purchasePPOB(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const productId = formData.get('productId') as string;
  const customerNumber = formData.get('customerNumber') as string;
  const accountId = formData.get('accountId') as string;

  if (!productId || !customerNumber || !accountId) {
    return { error: 'Data tidak lengkap' };
  }

  let product = await supabase
    .from('ppob_products')
    .select('*')
    .eq('id', productId)
    .single()
    .then(({ data }) => data);

  if (!product) {
     product = DEFAULT_PPOB_PRODUCTS.find(p => p.id === productId);
  }

  if (!product) {
    return { error: 'Produk tidak ditemukan' };
  }

  const service = new SavingsService(supabase);

  try {
    // Check if account belongs to user
    const { data: account, error: accError } = await supabase
        .from('savings_accounts')
        .select('member_id, koperasi_id, product:savings_products(type)')
        .eq('id', accountId)
        .single();
    
    if (accError || !account) return { error: 'Rekening tidak ditemukan' };

    // Helper to map savings type to account code
    const getSavingsLiabilityAccount = (type: string) => {
      switch (type) {
          case 'pokok': return AccountCode.SAVINGS_PRINCIPAL;
          case 'wajib': return AccountCode.SAVINGS_MANDATORY;
          case 'sukarela': return AccountCode.SAVINGS_VOLUNTARY;
          default: return AccountCode.SAVINGS_VOLUNTARY;
      }
    };

    const productData = account.product as any;
    const productType = Array.isArray(productData) ? productData[0]?.type : productData?.type;
    const savingsAccountCode = getSavingsLiabilityAccount(productType || 'sukarela');

    // Get PPOB Settings
    const { data: settings } = await supabase
      .from('ppob_settings')
      .select('admin_fee')
      .eq('koperasi_id', account.koperasi_id)
      .maybeSingle();
    
    const globalAdminFee = Number(settings?.admin_fee || 0);
    const productAdminFee = Number(product.admin_fee || 0);
    const productPrice = Number(product.price_sell || product.price);
    
    const totalAdminFee = globalAdminFee + productAdminFee;
    const totalAmount = productPrice + totalAdminFee;

    // Determine Ledger Accounts (Defaults)
    // TODO: Make these configurable in settings
    const depositAccount = AccountCode.CASH_ON_HAND; // Temporary: Assume paid from cash/deposit
    const revenueAccount = AccountCode.OTHER_INCOME; 

    const { transaction } = await service.processTransaction(
      accountId,
      totalAmount,
      'withdrawal',
      user.id,
      `PPOB: ${product.name} - ${customerNumber}`,
      true // Skip default ledger
    );

    // Record Ledger Entries (Smart Accounting)
    const ledgerService = new LedgerService(supabase);
    
    // 1. Payment for Product (Reduces Savings, Reduces Asset/Increases Revenue)
    // Here we simplify:
    // Debit: Savings Liability (Member pays) -> Done by processTransaction logic (we handle the other side)
    // But processTransaction with skipLedger=true means we must handle BOTH sides or at least the contra.
    // Actually processTransaction returns the transaction record, but DOES NOT create ledger entries if skipLedger=true.
    
    // Debit: Member Savings (Liability Decrease)
    // Credit: PPOB Revenue/Sales (Income Increase) -> For the full amount (Simple model)
    // OR Split: Credit Deposit (Asset Decrease) for COGS, Credit Profit for Margin.
    
    // Simple Model for MVP:
    // Debit: Savings Liability (AccountCode derived above)
    // Credit: PPOB Revenue (or Cash if we treat it as pass-through)
    
    await ledgerService.recordTransaction({
        koperasi_id: account.koperasi_id,
        tx_type: 'retail_sale', 
        tx_reference: transaction.id,
        account_debit: savingsAccountCode,
        account_credit: AccountCode.OTHER_INCOME, // Todo: Use specific PPOB Income account
        amount: totalAmount,
        description: `Pembelian PPOB ${product.name} - ${customerNumber}`,
        source_table: 'savings_transactions',
        source_id: transaction.id,
        created_by: user.id
    });

    // Log PPOB Transaction
    const { error: logError } = await supabase
      .from('ppob_transactions')
      .insert({
        koperasi_id: account.koperasi_id,
        member_id: account.member_id,
        account_id: accountId,
        category: product.category,
        provider: product.provider,
        product_id: product.id,
        product_name: product.name,
        customer_number: customerNumber,
        price: productPrice,
        admin_fee: totalAdminFee,
        total_amount: totalAmount,
        status: 'success',
        metadata: {
            price_base: product.price_base || 0,
            global_fee: globalAdminFee,
            product_fee: productAdminFee
        },
        created_by: user.id
      });
    if (logError) {
      // Non-blocking
      console.error('Failed to log PPOB transaction', logError);
    }

    revalidatePath('/member/simpanan');
    revalidatePath('/member/ppob');
    return { success: true, message: `Pembelian ${product.name} berhasil!` };

  } catch (error: any) {
    return { error: error.message || 'Transaksi Gagal' };
  }
}
