import { createClient } from '@supabase/supabase-js';
import { RetailService } from '../src/lib/services/retail-service';
import dotenv from 'dotenv';
import path from 'path';

// Load .env first
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
// Load .env.local (if exists, but dotenv won't override unless configured)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log('Starting Retail Accounting Integration Test...');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Check for service key first, then anon
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials.');
        console.log('URL:', supabaseUrl ? 'Found' : 'Missing');
        console.log('Key:', supabaseKey ? 'Found' : 'Missing');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const retailService = new RetailService(supabase);

    // 1. Setup Data
    console.log('1. Setting up test data...');
    
    // Get a valid User ID for created_by FK
    let userId;
    // Try admin API if service key
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const { data: { users } } = await supabase.auth.admin.listUsers();
        userId = users?.[0]?.id;
    }
    
    if (!userId) {
        // Fallback if no admin access or no users: Try to find a member linked to user? 
        // Or just use a random UUID and hope FK is not enforced or we can't proceed.
        // Actually, usually created_by references auth.users(id).
        console.warn('Warning: Could not fetch real users. Using a random UUID (might fail FK).');
        userId = '00000000-0000-0000-0000-000000000000'; // Null UUID or random
    }
    console.log('Using User ID:', userId);

    // Get Koperasi
    const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
    if (!koperasi) throw new Error('No Koperasi found');
    console.log('Koperasi ID:', koperasi.id);

    // Get Unit Usaha
    let { data: unitUsaha } = await supabase.from('unit_usaha').select('id').eq('koperasi_id', koperasi.id).limit(1).single();
    if (!unitUsaha) {
        // Create one if missing
        const { data: newUnit, error: unitError } = await supabase.from('unit_usaha').insert({
            koperasi_id: koperasi.id,
            nama_unit: 'Unit Retail Test',
            kode_unit: 'UNIT-RETAIL-TEST',
            jenis_unit: 'sembako'
        }).select().single();
        
        if (unitError) {
            console.error('Failed to create Unit Usaha:', unitError);
            throw unitError;
        }
        unitUsaha = newUnit;
    }

    if (!unitUsaha) throw new Error('Failed to get or create Unit Usaha');
    console.log('Unit Usaha ID:', unitUsaha.id);

    // Create Supplier
    const supplierName = `Test Supplier ${Date.now()}`;
    const supplier = await retailService.createSupplier({
        koperasi_id: koperasi.id,
        name: supplierName
    });
    console.log('Supplier Created:', supplier.name);

    // Create Product
    const productName = `Test Product ${Date.now()}`;
    const product = await retailService.createProduct({
        koperasi_id: koperasi.id,
        unit_usaha_id: unitUsaha.id,
        name: productName,
        product_type: 'regular',
        price_cost: 10000,
        price_sell_public: 15000,
        price_sell_member: 14000,
        stock_quantity: 0,
        unit: 'pcs',
        is_active: true
    });
    console.log('Product Created:', product.name);

    // 2. Test Purchase (Stock In)
    console.log('\n2. Testing Purchase (Stock In)...');
    const purchaseInvoice = `INV-IN-${Date.now()}`;
    const purchase = await retailService.createPurchase({
        koperasi_id: koperasi.id,
        unit_usaha_id: unitUsaha.id,
        supplier_id: supplier.id,
        invoice_number: purchaseInvoice,
        total_amount: 50000, // 5 * 10000
        payment_status: 'paid',
        created_by: userId
    }, [{
        product_id: product.id,
        quantity: 5,
        cost_per_item: 10000,
        subtotal: 50000
    }]);
    console.log('Purchase Created:', purchase.invoice_number);

    // Verify Ledger for Purchase
    const { data: purchaseLedger } = await supabase
        .from('ledger_entry')
        .select('account_debit, account_credit, amount')
        .eq('tx_reference', purchaseInvoice)
        .maybeSingle();
    
    if (!purchaseLedger) {
        console.error('Purchase Ledger Entry Missing!');
    } else {
        console.log('Purchase Ledger Entry Found:', purchaseLedger.amount);
    }

    // 3. Test POS Sale (Stock Out)
    console.log('\n3. Testing POS Sale (Stock Out)...');
    const sale = await retailService.processTransaction({
        koperasi_id: koperasi.id,
        unit_usaha_id: unitUsaha!.id,
        customer_name: 'Test Customer',
        total_amount: 15000, // 1 * 15000
        final_amount: 15000,
        payment_method: 'cash',
        payment_status: 'paid',
        created_by: userId
    }, [{
        product_id: product.id,
        quantity: 1,
        price_at_sale: 15000,
        cost_at_sale: 10000,
        subtotal: 15000
    }]);
    console.log('Sale Created:', sale.invoice_number);

    // Verify Ledger for Sale (Revenue)
    const { data: saleLedgerRev } = await supabase
        .from('ledger_entry')
        .select('*')
        .eq('source_id', sale.id)
        .eq('tx_type', 'retail_sale')
        .eq('description', `Penjualan Retail ${sale.invoice_number}`)
        .maybeSingle();

    console.log('Sale Revenue Ledger:', saleLedgerRev ? 'Found' : 'Missing');

    // Verify Ledger for Sale (COGS)
    const { data: saleLedgerCOGS } = await supabase
        .from('ledger_entry')
        .select('*')
        .eq('source_id', sale.id)
        .eq('description', `HPP Penjualan ${sale.invoice_number}`)
        .maybeSingle();

    console.log('Sale COGS Ledger:', saleLedgerCOGS ? 'Found' : 'Missing');

    if (purchaseLedger && saleLedgerRev && saleLedgerCOGS) {
        console.log('\nSUCCESS: All Accounting Entries Verified!');
    } else {
        console.error('\nFAILURE: Missing Ledger Entries');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Test Failed:', err);
    process.exit(1);
});
