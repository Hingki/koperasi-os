import { createClient } from '@/lib/supabase/server';
import { PpobPurchaseForm } from '@/components/ppob/ppob-purchase-form';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default async function PpobCategoryPage(props: { params: Promise<{ category: string }> }) {
  const params = await props.params;
  const categorySlug = params.category;
  
  // Map URL slug to DB category
  const categoryMap: Record<string, string> = {
    'pulsa': 'pulsa',
    'data': 'data',
    'pln': 'listrik',
    'pdam': 'pdam',
    'bpjs': 'bpjs'
  };

  const dbCategory = categoryMap[categorySlug];
  if (!dbCategory) return notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: member } = await supabase
    .from('member')
    .select('id, koperasi_id')
    .eq('user_id', user.id)
    .single();

  if (!member) return <div>Member not found</div>;

  // Fetch Products
  // Note: We use 'code' as ID in form, but DB has 'id' and 'code'. 
  // Migration 20251225000000 has UUID id and text code.
  // Migration 20251224130000 has varchar ID (which acts as code).
  // We need to be careful. Let's assume the schema from 20251225000000 (UUID id, text code) if it exists, 
  // OR the varchar id schema.
  // The safest way is to select everything and map carefully.
  
  // We'll try to select 'id, code, name, ...'. If 'code' column doesn't exist (older migration), we fallback.
  // Actually, let's just select * and handle in code.
  
  const { data: products } = await supabase
    .from('ppob_products')
    .select('*')
    .eq('koperasi_id', member.koperasi_id)
    .eq('category', dbCategory)
    .eq('is_active', true)
    .order('price_sell', { ascending: true });

  // If no products found, it might be because the table uses the other schema (varchar id) 
  // OR no products seeded for this koperasi.
  // Let's assume if products is empty, we show empty state.

  // Normalize products for the form
  const normalizedProducts = (products || []).map((p: any) => ({
    id: p.id,
    code: p.code || p.id, // Fallback to ID if code is missing (varchar id schema)
    name: p.name,
    price_sell: p.price_sell || p.price, // Fallback to price
    provider: p.provider,
    description: p.description
  }));

  // Fetch Savings Accounts (Source of Funds)
  const { data: accounts } = await supabase
    .from('savings_accounts')
    .select(`
      id, 
      account_number, 
      balance,
      product:savings_products(name)
    `)
    .eq('member_id', member.id)
    .eq('status', 'active')
    .gt('balance', 0); // Only accounts with balance

  // Normalize accounts
  const normalizedAccounts = (accounts || []).map((acc: any) => ({
    id: acc.id,
    account_number: acc.account_number,
    balance: acc.balance,
    product: Array.isArray(acc.product) ? acc.product[0] : acc.product
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/member/ppob" className="text-slate-500 hover:text-slate-700">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 capitalize">
          Beli {categorySlug === 'pln' ? 'Token Listrik' : categorySlug}
        </h1>
      </div>

      {!normalizedProducts.length ? (
        <div className="p-12 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
          <p className="text-slate-500">Belum ada produk tersedia untuk kategori ini.</p>
        </div>
      ) : (
        <PpobPurchaseForm 
          category={categorySlug}
          products={normalizedProducts} 
          accounts={normalizedAccounts}
        />
      )}
    </div>
  );
}
