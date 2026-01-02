
import { createClient } from '@supabase/supabase-js';
import { waRegisterMember, waCheckStatus } from '@/lib/actions/whatsapp';
import { MemberService } from '@/lib/services/member-service';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('📱 Starting WhatsApp Flow Verification...');

    const memberService = new MemberService(supabase);

    // 1. Get Koperasi ID
    let { data: koperasi } = await supabase.from('koperasi').select('id, code').limit(1).single();

    if (!koperasi) {
        console.log('⚠️ No Koperasi found. Seeding dummy Koperasi...');
        const { data: newKop, error } = await supabase.from('koperasi').insert({
            name: 'Koperasi Demo',
            code: 'DEMO',
            address: 'Jl. Demo No. 1',
            email: 'demo@koperasi.com',
            phone: '08123456789'
        }).select().single();

        if (error) throw new Error(`Failed to seed Koperasi: ${error.message}`);
        koperasi = newKop;
    }

    if (!koperasi) throw new Error('Failed to retrieve Koperasi ID');
    console.log(`✅ Koperasi Found: ${koperasi.code} (${koperasi.id})`);

    // Cleanup test data
    const testNik = '8888888888888888';
    const testWa = '628999999999';
    await supabase.from('member').delete().eq('nik', testNik);
    console.log('🧹 Cleaned up old test data');

    // 2. Test WA Register
    console.log('\n--- TEST 1: WA Registration (Action) ---');
    const regResult = await waRegisterMember({
        koperasiId: koperasi.id,
        nama: 'Budi Santoso',
        nik: testNik,
        waNumber: testWa
    });

    if (!regResult.success) throw new Error(`Registration failed: ${regResult.error}`);
    console.log('✅ Registration Result:', regResult.data);
    console.log('💬 Message to User:\n', regResult.data?.message_to_user);

    if (regResult.data?.status !== 'pending') throw new Error('Status must be PENDING');

    // 3. Test Check Status (Pending)
    console.log('\n--- TEST 2: Check Status (Pending) ---');
    const pendingStatus = await waCheckStatus(testWa, koperasi.id);
    console.log('✅ Pending Status Result:', pendingStatus.data);
    console.log('💬 Message to User:\n', pendingStatus.data?.message_to_user);

    // 4. Test Duplicate Register
    console.log('\n--- TEST 3: Duplicate Registration ---');
    const dupResult = await waRegisterMember({
        koperasiId: koperasi.id,
        nama: 'Budi Duplicate',
        nik: testNik,
        waNumber: testWa
    });
    console.log('✅ Duplicate Handling:', !dupResult.success ? 'Success (Blocked)' : 'Failed (Allowed)');
    console.log('💬 Message to User:\n', dupResult.message_to_user);

    // 5. Test Approve & Check Status (Active)
    console.log('\n--- TEST 4: Approve & Check Status (Active) ---');
    // Use dummy admin
    const { data: user } = await supabase.auth.admin.listUsers();
    const adminId = user.users[0]?.id || '00000000-0000-0000-0000-000000000000';

    await memberService.approve(regResult.data?.memberId!, adminId);
    console.log('✅ Approved via Service');

    const activeStatus = await waCheckStatus(testWa, koperasi.id);
    console.log('✅ Active Status Result:', activeStatus.data);
    console.log('💬 Message to User:\n', activeStatus.data?.message_to_user);

    if (!activeStatus.data?.nomor_anggota) throw new Error('Nomor Anggota missing in Active status');

    console.log('\n🎉 ALL WA UX TESTS PASSED');
}

main().catch(err => {
    console.error('❌ Test Failed:', err);
    process.exit(1);
});
