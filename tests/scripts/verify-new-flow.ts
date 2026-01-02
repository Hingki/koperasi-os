
import { createClient } from '@supabase/supabase-js';
import { MemberService } from '@/lib/services/member-service';
import { WhatsappFlowService } from '@/lib/services/whatsapp-flow-service';
import { WhatsappService } from '@/lib/services/whatsapp-service';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('🚀 Starting New Member Flow Verification...');

    const memberService = new MemberService(supabase);
    const waService = new WhatsappService({ provider: 'mock', apiKey: 'test' });
    const waFlowService = new WhatsappFlowService(supabase, waService);

    // 1. Get Koperasi ID
    const { data: koperasi } = await supabase.from('koperasi').select('id, code').limit(1).single();
    if (!koperasi) throw new Error('No Koperasi found');
    console.log(`✅ Koperasi Found: ${koperasi.code} (${koperasi.id})`);

    // Cleanup test data
    const testNik = '9999999999999999';
    const testPhone = '081234567890';
    await supabase.from('member').delete().eq('nik', testNik);
    console.log('🧹 Cleaned up old test data');

    // 2. Test WA Registration
    console.log('\n--- TEST 1: WA Registration ---');
    const waResponse = await waFlowService.waRegisterMember({
        koperasiId: koperasi.id,
        name: 'Test User Via WA',
        nik: testNik,
        phone: testPhone
    });
    console.log('WA Response:', waResponse);
    if (!waResponse.includes('BERHASIL')) throw new Error('WA Registration failed');

    // Verify in DB
    const member = await memberService.findMember(testNik, koperasi.id);
    if (!member) throw new Error('Member not found in DB');
    if (member.status !== 'pending') throw new Error('Member status should be pending');
    if (member.nomor_anggota) throw new Error('Member number should be null');
    console.log('✅ WA Registration Verified in DB (Pending, No Number)');

    // 3. Test WA Check Status (Pending)
    console.log('\n--- TEST 2: WA Check Status (Pending) ---');
    const statusMsg = await waFlowService.waCheckStatus(testNik, koperasi.id);
    console.log('WA Status Msg:', statusMsg);
    if (!statusMsg.includes('MENUNGGU VERIFIKASI')) throw new Error('Status check failed');
    console.log('✅ WA Status Check (Pending) Verified');

    // 4. Test Approval & Number Generation
    console.log('\n--- TEST 3: Approval & Number Generation ---');
    // Get an admin ID (or use a fake one if constraints allow)
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const adminId = users[0]?.id || '00000000-0000-0000-0000-000000000000';

    try {
        const approvedMember = await memberService.approve(member.id, adminId);
        console.log(`✅ Approved. Status: ${approvedMember.status}`);
        console.log(`✅ Member Number: ${approvedMember.nomor_anggota}`);

        if (approvedMember.status !== 'active') throw new Error('Status should be active');
        if (!approvedMember.nomor_anggota) throw new Error('Nomor Anggota missing');

        // Verify Format: [CODE]-A-[YEAR]-[SEQ]
        // Example: KOP-A-2025-000001
        const year = new Date().getFullYear();
        const expectedPrefix = `${koperasi.code || 'KOP'}-A-${year}-`;
        if (!approvedMember.nomor_anggota.startsWith(expectedPrefix)) {
            throw new Error(`Invalid Format. Expected starts with ${expectedPrefix}, got ${approvedMember.nomor_anggota}`);
        }
        console.log('✅ Member Number Format Valid');

    } catch (e: any) {
        if (e.message.includes('violates foreign key constraint')) {
            console.warn('⚠️  Skipping Approval FK check (No valid admin user found in test env)');
        } else {
            throw e;
        }
    }

    // 5. Test WA Check Status (Active)
    console.log('\n--- TEST 4: WA Check Status (Active) ---');
    const activeStatusMsg = await waFlowService.waCheckStatus(testNik, koperasi.id);
    console.log('WA Status Msg:', activeStatusMsg);
    if (!activeStatusMsg.includes('AKTIF') && !activeStatusMsg.includes('ACTIVE')) throw new Error('Status check failed for active member');
    console.log('✅ WA Status Check (Active) Verified');
}

main().catch(err => {
    console.error('❌ Test Failed:', err);
    process.exit(1);
});
