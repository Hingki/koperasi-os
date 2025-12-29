import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
// Inline helpers to avoid module resolution issues when running ts-node
// Relax types to avoid Postgrest table typing errors in script context
type Supa = any;

async function getAccountIdByCode(supabase: Supa, koperasiId: string, code: string) {
    const { data } = await supabase
        .from('accounts')
        .select('id')
        .eq('koperasi_id', koperasiId)
        .eq('code', code)
        .limit(1)
        .single();
    return data?.id;
}

async function postJournal(
    supabase: Supa,
    payload: {
        koperasi_id: string;
        business_unit: string;
        transaction_date: string;
        description: string;
        reference_id: string | number;
        reference_type: string;
        created_by?: string;
        lines: { account_id: string; debit: number; credit: number; description?: string }[];
    }
) {
    const { data: entry, error: e1 } = await supabase
        .from('journals')
        .insert({
            koperasi_id: payload.koperasi_id,
            business_unit: payload.business_unit,
            transaction_date: payload.transaction_date,
            description: payload.description,
            reference_id: payload.reference_id,
            reference_type: payload.reference_type,
            created_by: payload.created_by
        })
        .select()
        .single();
    if (e1) throw e1;

    const lines = payload.lines.map(l => ({ ...l, journal_id: entry.id }));
    const { error: e2 } = await supabase.from('journal_lines').insert(lines);
    if (e2) throw e2;
}

function mapProductToLiabilityAccount(type: 'sukarela' | 'berjangka' | 'rencana') {
    switch (type) {
        case 'berjangka': return '2-1005';
        case 'rencana': return '2-1004';
        case 'sukarela':
        default: return '2-1001';
    }
}

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase: Supa = createClient(supabaseUrl, supabaseKey) as any;

async function main() {
    console.log('--- Testing Savings Interest Distribution ---');

    // 1. Get Koperasi
    const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
    if (!koperasi) throw new Error('No Koperasi found');
    const koperasiId = koperasi.id;

    // 2. Get User (Admin)
    const { data: user } = await supabase.auth.admin.listUsers();
    const userId = user.users[0]?.id;
    if (!userId) {
        console.warn('No user found in auth.users, using placeholder UUID');
    }
    const finalUserId = userId || '00000000-0000-0000-0000-000000000000';

    // 3. Ensure we have an active voluntary savings account with balance
    // Get Product
    const { data: product } = await supabase
        .from('savings_products')
        .select('id, name')
        .eq('koperasi_id', koperasiId)
        .eq('type', 'sukarela')
        .single();

    if (!product) throw new Error('No voluntary savings product found');

    // Get or Create Member
    let memberId;
    const { data: member } = await supabase.from('member').select('id').limit(1).single();
    if (member) {
        memberId = member.id;
    } else {
        // Create dummy member if needed
        console.log('No member found, please seed member first');
        process.exit(1);
    }

    // Get or Create Account
    let accountId;
    const { data: account } = await supabase
        .from('savings_accounts')
        .select('id, balance')
        .eq('member_id', memberId)
        .eq('product_id', product.id)
        .single();

    if (account) {
        accountId = account.id;
        console.log(`Found account ${accountId} with balance ${account.balance}`);

        // Ensure balance is sufficient for interest (e.g. > 1,000,000)
        // If balance is small, interest might be 0. 5% of 1M / 12 = ~4166
        if (account.balance < 1000000) {
            console.log('Topping up balance for test...');
            const newBalance = (account.balance || 0) + 1000000;
            try {
                const isDemoMode = process.env.NEXT_PUBLIC_APP_MODE === 'demo';
                await supabase.from('savings_transactions').insert({
                    koperasi_id: koperasiId,
                    account_id: accountId,
                    member_id: memberId,
                    type: 'deposit',
                    amount: 1000000,
                    balance_after: newBalance,
                    description: 'Test Topup',
                    created_by: finalUserId,
                    is_test_transaction: isDemoMode
                });
            } catch (err: any) {
                if (String(err?.message || '').includes('column "is_test_transaction"')) {
                    await supabase.from('savings_transactions').insert({
                        koperasi_id: koperasiId,
                        account_id: accountId,
                        member_id: memberId,
                        type: 'deposit',
                        amount: 1000000,
                        balance_after: newBalance,
                        description: 'Test Topup',
                        created_by: finalUserId
                    });
                } else {
                    throw err;
                }
            }
            const { error: updErr } = await supabase
                .from('savings_accounts')
                .update({
                    balance: newBalance,
                    last_transaction_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', accountId);
            if (updErr) throw updErr;
        }
    } else {
        // Create account
        const { data: newAcc, error } = await supabase.from('savings_accounts').insert({
            koperasi_id: koperasiId,
            member_id: memberId,
            product_id: product.id,
            account_number: `SAV-${Date.now()}`,
            balance: 1000000,
            status: 'active',
            created_by: finalUserId
        }).select().single();
        if (error) throw error;
        accountId = newAcc.id;
        console.log(`Created account ${accountId} with balance 1,000,000`);
    }

    // 4. Run Distribution
    console.log('Running Interest Distribution (5% p.a.)...');
    // 4. Verify Ledger Tables
    {
        const { error: jErr } = await supabase.from('journals').select('id').limit(1);
        if (jErr && String(jErr.message || '').includes("Could not find the table")) {
            console.error(jErr);
            console.error('Ledger tables missing. Aborting distribution to preserve Ledger-First principle.');
            process.exit(1);
        }
    }

    // 5. Run Distribution (inline)
    console.log('Running Interest Distribution (5% p.a.)...');
    const { data: accounts } = await supabase
        .from('savings_accounts')
        .select('id, member_id, balance, account_number')
        .eq('product_id', product.id)
        .eq('status', 'active')
        .gt('balance', 0);

    let processed = 0;
    let totalInterest = 0;
    const transactionDate = new Date().toISOString().split('T')[0];
    const debitCode = '5-1001'; // INTEREST_EXPENSE_SAVINGS
    const creditCode = mapProductToLiabilityAccount('sukarela');
    const debitAccId = await getAccountIdByCode(supabase, koperasiId, debitCode);
    const creditAccId = await getAccountIdByCode(supabase, koperasiId, creditCode);

    for (const acc of accounts || []) {
        const interestAmount = Math.floor(acc.balance * (5 / 100) / 12);
        if (interestAmount <= 0) continue;

        const newBalance = (acc.balance || 0) + interestAmount;

        // Journal FIRST (Ledger-First)
        if (debitAccId && creditAccId) {
            await postJournal(supabase, {
                koperasi_id: koperasiId,
                business_unit: 'SIMPAN_PINJAM',
                transaction_date: transactionDate,
                description: `Bunga Simpanan ${product.name} - ${acc.account_number}`,
                reference_id: `INTEREST-${acc.id}-${Date.now()}`,
                reference_type: 'SAVINGS_INTEREST',
                created_by: finalUserId,
                lines: [
                    { account_id: debitAccId, debit: interestAmount, credit: 0 },
                    { account_id: creditAccId, debit: 0, credit: interestAmount }
                ]
            });
        }

        // Record savings transaction AFTER successful journal
        try {
            const isDemoMode = process.env.NEXT_PUBLIC_APP_MODE === 'demo';
            await supabase.from('savings_transactions').insert({
                koperasi_id: koperasiId,
                account_id: acc.id,
                member_id: acc.member_id,
                type: 'deposit',
                amount: interestAmount,
                balance_after: newBalance,
                description: `Bunga Simpanan ${product.name}`,
                created_by: finalUserId,
                is_test_transaction: isDemoMode
            });
        } catch (err: any) {
            if (String(err?.message || '').includes('column "is_test_transaction"')) {
                await supabase.from('savings_transactions').insert({
                    koperasi_id: koperasiId,
                    account_id: acc.id,
                    member_id: acc.member_id,
                    type: 'deposit',
                    amount: interestAmount,
                    balance_after: newBalance,
                    description: `Bunga Simpanan ${product.name}`,
                    created_by: finalUserId
                });
            } else {
                throw err;
            }
        }

        const { error: updErr2 } = await supabase
            .from('savings_accounts')
            .update({
                balance: newBalance,
                last_transaction_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', acc.id);
        if (updErr2) throw updErr2;

        processed++;
        totalInterest += interestAmount;
    }

    console.log('Result:', { processed, totalInterest });

    // 5. Verify Ledger
    // Check for recent journal entries
    const { data: journals } = await supabase
        .from('journals')
        .select('*, lines:journal_lines(*)')
        .eq('reference_type', 'SAVINGS_INTEREST')
        .order('created_at', { ascending: false })
        .limit(1);

    if (journals && journals.length > 0) {
        console.log('Found Journal Entry:', journals[0].description);
        journals[0].lines.forEach((l: any) => {
            console.log(`  Line: Acc ${l.account_id} | Dr ${l.debit} | Cr ${l.credit}`);
        });
    } else {
        console.error('No Journal Entry found!');
    }
}

main().catch(console.error);
