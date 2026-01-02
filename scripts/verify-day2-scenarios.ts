import { createClient } from '@supabase/supabase-js';
import { RetailService } from '@/lib/services/retail-service';
import { MarketplaceService } from '@/lib/services/marketplace-service';
import { PaymentService } from '@/lib/services/payment-service';
import { SavingsService } from '@/lib/services/savings-service';
import dotenv from 'dotenv';
import { AccountCode } from '@/lib/types/ledger';

dotenv.config({ path: '.env.local' });
// Always try to load .env as fallback for missing keys (like SERVICE_ROLE_KEY)
dotenv.config({ path: '.env' });

console.log('DEBUG: NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('DEBUG: SUPABASE_SERVICE_ROLE_KEY present?', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

try {
    const token = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (token) {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        console.log('DEBUG: Token Role:', payload.role);
        if (payload.role !== 'service_role') {
            console.warn('⚠️ WARNING: The provided SUPABASE_SERVICE_ROLE_KEY does not have "service_role" claim. It has "' + payload.role + '". Tests requiring admin privileges will fail.');
        }
    } else {
        console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY is missing. Please check your .env or .env.local file.');
        process.exit(1);
    }
} catch (e) {
    console.log('DEBUG: Failed to decode token', e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role to bypass RLS for testing
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function runVerification() {
    console.log('🚀 Starting Day 2 Verification Scenarios...\n');

    const retailService = new RetailService(supabase);
    const marketplaceService = new MarketplaceService(supabase);
    const paymentService = new PaymentService(supabase);
    const savingsService = new SavingsService(supabase);

    // --- SETUP ---
    console.log('1. Setting up test data...');
    // 1. Get or Create Koperasi
    const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
    const koperasiId = koperasi?.id;
    if (!koperasiId) throw new Error('No Koperasi found');

    // 2. Get or Create Unit Usaha
    let { data: unitUsaha } = await supabase.from('unit_usaha').select('id').eq('koperasi_id', koperasiId).eq('jenis_unit', 'sembako').limit(1).single();
    if (!unitUsaha) {
        const { data: newUnit, error } = await supabase.from('unit_usaha').insert({
            koperasi_id: koperasiId,
            nama_unit: 'Test Mart',
            kode_unit: 'TEST-MART',
            jenis_unit: 'sembako',
            is_active: true
        }).select().single();
        if (error) console.error('Insert unit error:', error);
        unitUsaha = newUnit;
    }
    if (!unitUsaha) throw new Error('Failed to create/find unit usaha');
    const unitUsahaId = unitUsaha.id;

    // 3. Create a Test Product
    const { data: product } = await supabase.from('inventory_products').insert({
        koperasi_id: koperasiId,
        unit_usaha_id: unitUsahaId,
        name: 'Test Product Day 2',
        sku: `TP-D2-${Date.now()}`,
        price_cost: 5000,
        price_sell_public: 10000,
        price_sell_member: 9000,
        stock_quantity: 100
    }).select().single();

    if (!product) throw new Error('Failed to create test product');

    // 4. Get or Create a Test Member
    let member;
    let memberNo;
    let authUser; // Define here for scope availability

    const { data: existingMember } = await supabase.from('member').select('*').eq('koperasi_id', koperasiId).eq('status', 'active').limit(1).single();

    if (existingMember) {
        console.log(`   ✅ Found existing member: ${existingMember.nama_lengkap}`);
        member = existingMember;
        memberNo = member.nomor_anggota;
    } else {
        console.log('   ℹ️ No existing active member found, creating one...');
        memberNo = `M-${Date.now()}`;

        // Try to create auth user first to satisfy RLS or triggers
        const email = `test.member.${Date.now()}@example.com`;
        const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password: 'password123',
            email_confirm: true
        });
        authUser = newUser; // Assign to outer variable

        if (authError) {
            console.error('   ⚠️ Auth user creation failed:', authError.message);
        } else {
            console.log('   ✅ Auth user created:', authUser?.user?.id);
        }

        let { data: newMember, error: memberError } = await supabase.from('member').insert({
            koperasi_id: koperasiId,
            nama_lengkap: 'Budi Test Day 2',
            nomor_anggota: memberNo,
            nik: `NIK-${Date.now()}`,
            phone: '081234567890',
            alamat_lengkap: 'Jl. Test No. 123',
            status: 'active',
            user_id: authUser?.user?.id // Link to auth user
        }).select().single();

        if (memberError) {
            console.error('Member insert error:', memberError);
            if (memberError.code === '42501' && memberError.message.includes('schema public')) {
                console.error('\n🔴 CRITICAL DATABASE PERMISSION ERROR');
                console.error('The database trigger "generate_nomor_anggota" tries to CREATE a sequence dynamically.');
                console.error('The current user role does not have CREATE permission on schema "public".');
                console.error('Please run the following SQL in your Supabase Dashboard SQL Editor to fix this:');
                console.error(`
CREATE OR REPLACE FUNCTION generate_nomor_anggota()
RETURNS TRIGGER 
SECURITY DEFINER
AS $$     DECLARE
    today_date TEXT := to_char(NOW(), 'YYYYMMDD');
    sequence_name TEXT := 'member_nomor_anggota_seq_' || today_date;
    nomor_urut TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = sequence_name) THEN
        EXECUTE format('CREATE SEQUENCE %s START 1', sequence_name);
    END IF;
    EXECUTE format('SELECT nextval(%L)', sequence_name) INTO nomor_urut;
    nomor_urut := LPAD(nomor_urut, 5, '0');
    NEW.nomor_anggota := 'ANGGTA-' || today_date || '-' || nomor_urut;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
              `);
            }

            // Try to fetch if exists (redundant but safe)
            const { data: existing } = await supabase.from('member').select('*').eq('nomor_anggota', memberNo).single();
            if (existing) {
                console.log('Found existing member, using it.');
                member = existing;
                memberNo = member.nomor_anggota;
            }
        } else {
            member = newMember;
        }
    }

    if (!member) {
        console.error('⚠️ Failed to get or create test member. Skipping Member-related scenarios.');
    }

    // 5. Setup Savings Account for Member
    let savingsAccount;
    let savingsProduct;

    if (member) {
        // Ensure 'Simpanan Sukarela' product exists
        let { data: sp } = await supabase.from('savings_products').select('id').eq('type', 'sukarela').limit(1).single();
        savingsProduct = sp;
        if (!savingsProduct) {
            console.log('   ℹ️ Savings Product not found, creating...');
            // Create if not exists (simplified)
            const { data: newSp, error: spError } = await supabase.from('savings_products').insert({
                koperasi_id: koperasiId,
                name: 'Simpanan Sukarela',
                type: 'sukarela',
                interest_rate: 0,
                code: 'SP-SUKARELA-' + Date.now() // Add unique code
            }).select().single();

            if (spError) {
                console.error('   ❌ Failed to create savings product:', spError);
            } else {
                savingsProduct = newSp;
                console.log('   ✅ Savings Product created');
            }
        } else {
            console.log('   ✅ Found existing Savings Product');
        }

        if (savingsProduct) {
            // Create Savings Account
            const { data: sa, error: saError } = await supabase.from('savings_accounts').insert({
                koperasi_id: koperasiId,
                member_id: member.id,
                product_id: savingsProduct.id,
                account_number: `SA-${Date.now()}`,
                balance: 50000, // Initial balance
                status: 'active'
            }).select().single();

            if (saError) {
                console.error('   ❌ Failed to create savings account:', saError);
            } else {
                console.log('   ✅ Savings account created:', sa.id);
                savingsAccount = sa;
            }
        }
    }

    console.log('✅ Setup Complete (Partial if member failed).\n');

    // --- SCENARIO 1: Non-Member Cash Payment ---
    console.log('📝 Scenario 1: Non-Member Cash Payment');
    try {
        const result = await marketplaceService.checkoutRetail(
            koperasiId,
            member?.user_id || authUser?.user?.id || '00000000-0000-0000-0000-000000000000',
            {
                koperasi_id: koperasiId,
                unit_usaha_id: unitUsahaId,
                member_id: undefined, // Non-member
                customer_name: 'General Customer',
                total_amount: 10000,
                discount_amount: 0,
                tax_amount: 0,
                final_amount: 10000,
                payment_status: 'paid',
                created_by: member?.user_id || authUser?.user?.id || '00000000-0000-0000-0000-000000000000'
            }, [{
                product_id: product.id,
                quantity: 1,
                price_at_sale: 10000,
                cost_at_sale: 5000,
                subtotal: 10000
            }],
            [{ method: 'cash', amount: 10000 }]
        );

        console.log(`   Transaction ID: ${result.transaction.id}`);

        // Verify Ledger (Journals)
        const { data: journal } = await supabase.from('journals')
            .select('*, journal_lines(*)')
            .eq('id', result.transaction.journal_id)
            .single();

        if (journal) {
            console.log(`   Journal Found: ${journal.description}`);
            console.log(`   Ledger Lines: ${journal.journal_lines.length}`);
            console.log('   ✅ Ledger Entries Verified');
        } else {
            console.error('   ❌ Ledger Entries Missing');
        }

    } catch (e: any) {
        console.error('   ❌ Failed:', e.message);
    }
    console.log('');


    // --- SCENARIO 2: Member Search (Simulation) ---
    if (member && memberNo) {
        console.log('📝 Scenario 2: Member Search');
        // We simulate the query used in the API
        const { data: searchResults } = await supabase
            .from('member')
            .select('id, nomor_anggota, nama_lengkap')
            .or(`nomor_anggota.ilike.%${memberNo}%,nama_lengkap.ilike.%Budi%`)
            .eq('status', 'active')
            .limit(5);

        if (searchResults && searchResults.length > 0) {
            console.log(`   ✅ Found member: ${searchResults[0].nama_lengkap} (${searchResults[0].nomor_anggota})`);
        } else {
            console.error('   ❌ Member search failed');
        }
        console.log('');
    } else {
        console.log('📝 Scenario 2: Member Search - SKIPPED (No Member)');
    }


    // --- SCENARIO 3: Member Savings Payment ---
    if (member && savingsAccount) {
        console.log('📝 Scenario 3: Member Savings Payment');

        // Case A: Insufficient Balance
        console.log('   Case A: Insufficient Balance (Buying 10 items @ 9000 = 90000, Balance 50000)');
        try {
            await marketplaceService.checkoutRetail(
                koperasiId,
                member.id,
                {
                    koperasi_id: koperasiId,
                    unit_usaha_id: unitUsahaId,
                    member_id: member.id,
                    customer_name: member.nama_lengkap,
                    total_amount: 90000,
                    discount_amount: 0,
                    tax_amount: 0,
                    final_amount: 90000,
                    payment_status: 'paid',
                    created_by: member.id
                },
                [{
                    product_id: product.id,
                    quantity: 10,
                    price_at_sale: 9000,
                    cost_at_sale: 5000,
                    subtotal: 90000
                }],
                [{ method: 'savings_balance', amount: 90000, account_id: savingsAccount.id }]
            );
            console.error('   ❌ Failed: Should have thrown insufficient balance error');
        } catch (e: any) {
            if (e.message.includes('Saldo simpanan') || e.message.includes('balance') || e.message.includes('mencukupi')) {
                console.log('   ✅ Correctly rejected: Saldo tidak mencukupi');
            } else {
                console.error('   ❌ Unexpected error:', e.message);
            }
        }

        // Case B: Sufficient Balance
        console.log('   Case B: Sufficient Balance (Buying 1 item @ 9000, Balance 50000)');
        try {
            const result = await marketplaceService.checkoutRetail(
                koperasiId,
                member.id,
                {
                    koperasi_id: koperasiId,
                    unit_usaha_id: unitUsahaId,
                    member_id: member.id,
                    customer_name: member.nama_lengkap,
                    total_amount: 9000,
                    discount_amount: 0,
                    tax_amount: 0,
                    final_amount: 9000,
                    payment_status: 'paid',
                    created_by: member.id
                },
                [{
                    product_id: product.id,
                    quantity: 1,
                    price_at_sale: 9000,
                    cost_at_sale: 5000,
                    subtotal: 9000
                }],
                [{ method: 'savings_balance', amount: 9000, account_id: savingsAccount.id }]
            );
            console.log(`   Transaction ID: ${result.transaction.id}`);
            console.log('   ✅ Success');
        } catch (e: any) {
            console.error('   ❌ Failed:', e.message);
        }
    } else {
        console.log('📝 Scenario 3: Member Savings Payment - SKIPPED');
    }
    console.log('');

    // --- SCENARIO 4: Member QRIS Payment ---
    console.log('📝 Scenario 4: Member QRIS Payment');
    if (member) {
        try {
            // 1. Prepare Data (Get Totals)
            const prepared = await retailService.prepareTransactionData({
                koperasi_id: koperasiId,
                unit_usaha_id: unitUsahaId,
                member_id: member.id,
                customer_name: member.nama_lengkap,
                total_amount: 50000,
                discount_amount: 0,
                tax_amount: 0,
                final_amount: 50000,
                payment_status: 'pending',
                created_by: member.id
            }, [{
                product_id: product.id,
                quantity: 1,
                price_at_sale: 50000,
                cost_at_sale: 25000,
                subtotal: 50000
            }]);

            // 2. Initiate Marketplace Transaction (State: Initiated)
            // We use a manual orchestration here because QRIS is async (Pending)
            const trx = await marketplaceService.createTransaction(
                koperasiId,
                'retail',
                prepared.finalAmount,
                member.id
            );

            // 3. Generate QRIS (Payment Service)
            const paymentTrx = await paymentService.createQRISPayment(
                koperasiId,
                trx.id, // Use Marketplace Trx ID as reference
                'retail_sale',
                prepared.finalAmount,
                'Retail Sale QRIS',
                member.id
            );

            if (paymentTrx.qr_code_url && paymentTrx.id) {
                console.log(`   ✅ QRIS Generated: ${paymentTrx.qr_code_url}`);

                // Check Payment Status (Mock)
                const status = await paymentService.getProvider().checkStatus(paymentTrx.id);
                console.log(`   Payment Status: ${status}`);
            } else {
                console.error('   ❌ QR Code URL missing');
            }
        } catch (e: any) {
            console.error('   ❌ Failed:', e.message);
        }
    } else {
        console.log('📝 Scenario 4: Member QRIS Payment - SKIPPED');
    }

}

runVerification().catch(console.error);

async function getAccountId(supabase: any, koperasiId: string, code: string): Promise<string | undefined> {
    const { data } = await supabase.from('chart_of_accounts').select('id').eq('koperasi_id', koperasiId).eq('account_code', code).single();
    return data?.id;
}
