import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('--- Generating Financial Reports (Balance Sheet & Income Statement) ---');

    // 1. Get Koperasi
    const { data: koperasi } = await supabase.from('koperasi').select('id, nama').limit(1).single();
    if (!koperasi) { console.error('No Koperasi found'); process.exit(1); }
    console.log(`Entity: ${koperasi.nama} (${koperasi.id})`);

    // 2. Fetch Accounts
    const { data: accounts, error: accError } = await supabase
        .from('accounts')
        .select('*')
        .eq('koperasi_id', koperasi.id)
        .order('code');
    
    if (accError) { console.error('Error fetching accounts:', accError); process.exit(1); }

    // 3. Fetch All Journal Lines
    // In production, use aggregation query or RPC. For test script, fetch all.
    const { data: lines, error: lineError } = await supabase
        .from('journal_lines')
        .select('account_id, debit, credit');

    if (lineError) { console.error('Error fetching journal lines:', lineError); process.exit(1); }

    // 4. Aggregate
    const balances = new Map<string, { debit: number; credit: number }>();
    
    lines?.forEach(l => {
        const curr = balances.get(l.account_id) || { debit: 0, credit: 0 };
        curr.debit += l.debit;
        curr.credit += l.credit;
        balances.set(l.account_id, curr);
    });

    // 5. Structure Report
    const report: Record<string, any[]> = {
        'ASSET': [],
        'LIABILITY': [],
        'EQUITY': [],
        'REVENUE': [],
        'EXPENSE': []
    };

    const totals: Record<string, number> = {
        'ASSET': 0,
        'LIABILITY': 0,
        'EQUITY': 0,
        'REVENUE': 0,
        'EXPENSE': 0
    };

    accounts?.forEach(acc => {
        const bal = balances.get(acc.id) || { debit: 0, credit: 0 };
        let net = 0;
        if (acc.normal_balance === 'DEBIT') {
            net = bal.debit - bal.credit;
        } else {
            net = bal.credit - bal.debit;
        }

        if (net !== 0) {
            const type = acc.type.toUpperCase(); // asset, liability, etc.
            if (report[type]) {
                report[type].push({
                    code: acc.code,
                    name: acc.name,
                    balance: net
                });
                totals[type] += net;
            }
        }
    });

    // 6. Print
    console.log('\n--- BALANCE SHEET ---');
    console.log('\nASSETS:');
    report['ASSET'].forEach(a => console.log(`  ${a.code} ${a.name.padEnd(30)} : ${formatCurrency(a.balance)}`));
    console.log(`TOTAL ASSETS                       : ${formatCurrency(totals['ASSET'])}`);

    console.log('\nLIABILITIES:');
    report['LIABILITY'].forEach(a => console.log(`  ${a.code} ${a.name.padEnd(30)} : ${formatCurrency(a.balance)}`));
    console.log(`TOTAL LIABILITIES                  : ${formatCurrency(totals['LIABILITY'])}`);

    console.log('\nEQUITY:');
    report['EQUITY'].forEach(a => console.log(`  ${a.code} ${a.name.padEnd(30)} : ${formatCurrency(a.balance)}`));
    // Net Income Calculation
    const netIncome = totals['REVENUE'] - totals['EXPENSE'];
    console.log(`  3-9999 Current Year Earnings          : ${formatCurrency(netIncome)}`);
    
    const totalEquityAndLiabilities = totals['LIABILITY'] + totals['EQUITY'] + netIncome;
    console.log(`TOTAL LIABILITIES & EQUITY         : ${formatCurrency(totalEquityAndLiabilities)}`);

    console.log('\n-----------------------------------');
    console.log(`BALANCE CHECK: ${totals['ASSET'] === totalEquityAndLiabilities ? 'BALANCED ✅' : 'UNBALANCED ❌'}`);
    if (totals['ASSET'] !== totalEquityAndLiabilities) {
        console.log(`Difference: ${formatCurrency(totals['ASSET'] - totalEquityAndLiabilities)}`);
    }

    console.log('\n\n--- INCOME STATEMENT ---');
    console.log('\nREVENUE:');
    report['REVENUE'].forEach(a => console.log(`  ${a.code} ${a.name.padEnd(30)} : ${formatCurrency(a.balance)}`));
    console.log(`TOTAL REVENUE                      : ${formatCurrency(totals['REVENUE'])}`);

    console.log('\nEXPENSES:');
    report['EXPENSE'].forEach(a => console.log(`  ${a.code} ${a.name.padEnd(30)} : ${formatCurrency(a.balance)}`));
    console.log(`TOTAL EXPENSES                     : ${formatCurrency(totals['EXPENSE'])}`);

    console.log('\nNET INCOME                         : ' + formatCurrency(netIncome));
}

function formatCurrency(num: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num);
}

main().catch(console.error);
