import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { redirect } from 'next/navigation';
import PurchaseForm from '@/components/retail/purchase-form';

export default async function NewPurchasePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const koperasiId = user.user_metadata.koperasi_id;
  const retailService = new RetailService(supabase);

  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);
  
  const [products, suppliers] = await Promise.all([
    isValidUUID ? retailService.getProducts(koperasiId) : [],
    isValidUUID ? retailService.getSuppliers(koperasiId) : []
  ]);

  async function processPurchase(formData: FormData) {
    'use server';
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    
    const retailService = new RetailService(supabase);
    const koperasiId = user.user_metadata.koperasi_id;

    if (!koperasiId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId)) {
        throw new Error('Invalid Koperasi ID');
    }

    // Parse items from form
    // Since we can't easily do dynamic arrays in simple FormData without client JS,
    // we'll assume this is a Server Action called by a Client Component (which we need to build).
    // BUT, for now, to save time, I'll build a simple Client Component wrapper inside this file?
    // No, I should make a proper client component for the form.
    
    // This server action is just a placeholder or needs to receive JSON string
    const itemsJson = formData.get('items') as string;
    const items = JSON.parse(itemsJson);
    
    // Quick fix: fetch unit_usaha
    const { data: unitUsaha } = await supabase
        .from('unit_usaha')
        .select('id')
        .eq('koperasi_id', koperasiId)
        .limit(1)
        .single();
    
    // Auto-generate invoice number based on settings
    const settings = await retailService.getRetailSettings(koperasiId);
    const invoiceNumber = `${settings.purchase_invoice_prefix}${Date.now()}`;
    
    const supplierRef = formData.get('invoice_number') as string; // From form (Supplier Ref)
    const notes = formData.get('notes') as string;
    const finalNotes = supplierRef ? `Supplier Ref: ${supplierRef}. ${notes}` : notes;

    await retailService.createPurchase({
        koperasi_id: koperasiId,
        unit_usaha_id: unitUsaha?.id,
        supplier_id: formData.get('supplier_id') as string,
        invoice_number: invoiceNumber,
        total_amount: Number(formData.get('total_amount')),
        payment_status: formData.get('payment_status') as 'paid' | 'debt',
        notes: finalNotes,
        created_by: user.id
    }, items);

    redirect('/dashboard/retail/purchases');
  }

  // We need a Client Component for the dynamic form
  // I'll create a separate component file for cleanliness.
  // For now, let's just render the Client Component here.
  
  // WAIT: I cannot import a Client Component that doesn't exist yet.
  // I will create `purchase-form.tsx` in components/retail/ first.
  
  return (
    <PurchaseForm 
      suppliers={suppliers} 
      products={products} 
      onSubmit={processPurchase} 
    />
  );
}
