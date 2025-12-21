import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { RetailService } from '@/lib/services/retail-service';
import { PaymentService } from '@/lib/services/payment-service';

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    // Use Service Role Key to bypass RLS for seeding/testing
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; 
    const supabase = createClient(supabaseUrl, supabaseKey);

    const retailService = new RetailService(supabase);
    const paymentService = new PaymentService(supabase, 'mock');

    // 1. Fetch or Seed Koperasi
    let { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
    
    if (!koperasi) {
        // Auto-seed Koperasi
        const { data: newKoperasi, error: createError } = await supabase
        .from('koperasi')
        .insert({
           nama: 'Koperasi Test',
           nomor_badan_hukum: 'BH-TEST-' + Date.now(),
           tanggal_berdiri: new Date().toISOString(),
           alamat: 'Jl. Test No. 1',
           kelurahan: 'Test',
           kecamatan: 'Test',
           kota: 'Jakarta',
           provinsi: 'DKI Jakarta',
           email: 'test@koperasi.id',
           phone: '08123456789'
        })
        .select('id')
        .single();
        
        if (createError) throw new Error("Failed to seed Koperasi: " + createError.message);
        koperasi = newKoperasi;
    }
    const koperasiId = koperasi!.id;

    // 2. Fetch or Seed Unit Usaha
    let { data: unit } = await supabase
        .from('unit_usaha')
        .select('id')
        .eq('koperasi_id', koperasiId)
        .limit(1)
        .single();
        
    if (!unit) {
        // Auto-seed Unit Usaha
        const { data: newUnit, error: createUnitError } = await supabase
        .from('unit_usaha')
        .insert({
           koperasi_id: koperasiId,
           kode_unit: 'UNIT-TEST',
           nama_unit: 'Unit Test Retail',
           jenis_unit: 'sembako',
           alamat: 'Jl. Unit Test'
        })
        .select('id')
        .single();
        
        if (createUnitError) throw new Error("Failed to seed Unit Usaha: " + createUnitError.message);
        unit = newUnit;
    }
    const unitId = unit!.id;

    // 3. Mock Data
    const mockTx = {
      koperasi_id: koperasiId,
      unit_usaha_id: unitId,
      transaction_date: new Date().toISOString(),
      total_amount: 10000,
      final_amount: 10000,
      payment_method: 'cash', // Test Cash Flow
      payment_status: 'paid',
      created_by: crypto.randomUUID() // Mock user ID
    };

    // 3. Process
    console.log("Starting POS Integration Test...");
    const result = await retailService.processTransaction(mockTx, []);
    
    // 4. Verify Payment Transaction was created (via RetailService -> PaymentService)
    // We can query payment_transactions to see if one was created with this reference_id
    const { data: paymentTx } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('reference_id', result.id)
        .single();

    return NextResponse.json({
      success: true,
      pos_transaction: result,
      payment_transaction: paymentTx,
      message: paymentTx ? 'Payment Transaction linked successfully' : 'Payment Transaction MISSING'
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
