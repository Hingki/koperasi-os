import fs from 'fs';

console.log('STARTING SCRIPT...');

try { fs.writeFileSync('debug_start.txt', 'Script started ' + new Date().toISOString() + '\n'); } catch (e) { }

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceService } from '@/lib/services/marketplace-service';
import { RetailService } from '@/lib/services/retail-service';
import { PpobService } from '@/lib/services/ppob-service';
import { AccountingService } from '@/lib/services/accounting-service';
import { LedgerIntentService } from '@/lib/services/ledger-intent-service';
import { AccountCode } from '@/lib/types/ledger';
import dotenv from 'dotenv';

import path from 'path';

dotenv.config();

console.log('IMPORTS DONE');

// --- MOCK SUPABASE IMPLEMENTATION ---
const MOCK_DB_FILE = 'uat_db_mock.json';

class MockSupabase {
    private data: Record<string, any[]> = {};

    constructor() {
        this.loadData();
    }

    private loadData() {
        if (fs.existsSync(MOCK_DB_FILE)) {
            this.data = JSON.parse(fs.readFileSync(MOCK_DB_FILE, 'utf-8'));
        } else {
            // Seed initial data
            this.data = {
                koperasi: [{ id: 'k1', name: 'Koperasi Demo' }],
                members: [{ id: 'm1', name: 'Member Test', koperasi_id: 'k1' }],
                accounts: [
                    { id: 'acc_cash', code: '1-1100', name: 'Cash on Hand', koperasi_id: 'k1', normal_balance: 'DEBIT', type: 'ASSET' },
                    { id: 'acc_bank', code: '1-1110', name: 'Bank BCA', koperasi_id: 'k1', normal_balance: 'DEBIT', type: 'ASSET' },
                    { id: 'acc_escrow', code: '2-1300', name: 'Escrow Liability', koperasi_id: 'k1', normal_balance: 'CREDIT', type: 'LIABILITY' },
                    { id: 'acc_savings', code: '2-1100', name: 'Savings Liability', koperasi_id: 'k1', normal_balance: 'CREDIT', type: 'LIABILITY' },
                    { id: 'acc_sales', code: '4-1100', name: 'Retail Sales', koperasi_id: 'k1', normal_balance: 'CREDIT', type: 'REVENUE' },
                    { id: 'acc_cogs', code: '5-1100', name: 'COGS', koperasi_id: 'k1', normal_balance: 'DEBIT', type: 'EXPENSE' },
                    { id: 'acc_inventory', code: '1-1400', name: 'Inventory', koperasi_id: 'k1', normal_balance: 'DEBIT', type: 'ASSET' }
                ],
                ppob_products: [
                    { id: 'PULSA10', code: 'PULSA10', name: 'Pulsa 10k', price: 10000, price_sell: 10500, is_active: true, koperasi_id: 'k1' }
                ],
                inventory_products: [
                    { id: 'PROD1', name: 'Indomie', price_sell_public: 3500, price_cost: 3000, stock: 100, koperasi_id: 'k1' }
                ],
                savings_accounts: [
                    { id: 's1', member_id: 'm1', balance: 1000000, koperasi_id: 'k1' }
                ],
                marketplace_transactions: [],
                journals: [],
                journal_lines: [],
                pos_transactions: [],
                pos_transaction_items: [],
                ppob_transactions: []
            };
            this.saveData();
        }
    }

    private saveData() {
        fs.writeFileSync(MOCK_DB_FILE, JSON.stringify(this.data, null, 2));
    }

    from(table: string) {
        return new QueryBuilder(this, table, this.data);
    }



    async rpc(func: string, args: any) {
        // Simulate async
        await new Promise(r => setTimeout(r, 10));

        if (func === 'post_journal_entry') {
            const { p_lines, ...rest } = args;
            const entryId = `j_${Date.now()}`;

            // Insert Entry
            if (!this.data.journals) this.data.journals = [];
            this.data.journals.push({
                id: entryId,
                koperasi_id: args.p_koperasi_id,
                business_unit: args.p_business_unit,
                transaction_date: args.p_transaction_date,
                description: args.p_description,
                reference_id: args.p_reference_id,
                reference_type: args.p_reference_type,
                created_by: args.p_created_by,
                created_at: new Date().toISOString()
            });

            // Insert Lines
            if (!this.data.journal_lines) this.data.journal_lines = [];
            console.log(`   [MockDB] RPC post_journal_entry: Inserting ${p_lines.length} lines for journal ${entryId}`);
            for (const line of p_lines) {
                this.data.journal_lines.push({
                    ...line,
                    journal_entry_id: entryId,
                    id: `l_${Date.now()}_${Math.random()}`
                });
            }

            this.saveData(); // Ensure persistence
            // console.log(`   [MockDB] RPC post_journal_entry: Created ${entryId}`);
            return { data: entryId, error: null };
        }

        return { data: null, error: { message: `RPC ${func} not mocked` } };
    }

    auth = {
        getUser: async () => ({ data: { user: { id: 'm1' } }, error: null }),
        admin: {
            listUsers: async () => ({ data: { users: [{ id: 'm1' }] }, error: null })
        }
    };
}

class QueryBuilder {
    private filters: any[] = [];
    private _select: string = '*';
    private _single: boolean = false;
    private _maybeSingle: boolean = false;
    private _limit: number = -1;
    private _order: { col: string, asc: boolean } | null = null;
    private _insertData: any = null;
    private _updateData: any = null;
    private _delete: boolean = false;

    private db: any;
    private table: string;
    private data: any;

    constructor(db: any, table: string, data: any) {
        this.db = db;
        this.table = table;
        this.data = data;
    }

    select(cols: string = '*') {
        this._select = cols;
        return this;
    }

    insert(data: any) {
        this._insertData = data;
        return this;
    }

    update(data: any) {
        this._updateData = data;
        return this;
    }

    delete() {
        this._delete = true;
        return this;
    }

    eq(col: string, val: any) {
        this.filters.push({ type: 'eq', col, val });
        return this;
    }

    lt(col: string, val: any) {
        this.filters.push({ type: 'lt', col, val });
        return this;
    }

    gt(col: string, val: any) {
        this.filters.push({ type: 'gt', col, val });
        return this;
    }

    lte(col: string, val: any) {
        this.filters.push({ type: 'lte', col, val });
        return this;
    }

    gte(col: string, val: any) {
        this.filters.push({ type: 'gte', col, val });
        return this;
    }

    in(col: string, vals: any[]) {
        this.filters.push({ type: 'in', col, val: vals });
        return this;
    }

    or(cond: string) {
        // Simple OR implementation for "code.eq.X,id.eq.Y"
        this.filters.push({ type: 'or', raw: cond });
        return this;
    }

    limit(n: number) {
        this._limit = n;
        return this;
    }

    single() {
        this._single = true;
        return this;
    }

    maybeSingle() {
        this._single = true;
        this._maybeSingle = true;
        return this;
    }

    order(col: string, opts?: { ascending?: boolean }) {
        this._order = { col, asc: opts?.ascending ?? true };
        return this;
    }

    async then(resolve: any, reject: any) {
        try {
            // Simulate async
            await new Promise(r => setTimeout(r, 10));

            let rows = this.data[this.table] || [];

            // Apply filters
            rows = rows.filter((row: any) => {
                for (const f of this.filters) {
                    if (f.type === 'eq') {
                        if (row[f.col] !== f.val) return false;
                    } else if (f.type === 'lt') {
                        if (!(row[f.col] < f.val)) return false;
                    } else if (f.type === 'gt') {
                        if (!(row[f.col] > f.val)) return false;
                    } else if (f.type === 'lte') {
                        if (!(row[f.col] <= f.val)) return false;
                    } else if (f.type === 'gte') {
                        if (!(row[f.col] >= f.val)) return false;
                    } else if (f.type === 'in') {
                        if (!f.val.includes(row[f.col])) return false;
                    } else if (f.type === 'or') {
                        // Hack for Stuck Transactions Query
                        if (f.raw.startsWith('and(')) {
                            // Raw: and(status.eq.journal_locked,created_at.lt.X),and(status.eq.fulfilled,fulfilled_at.lt.X)
                            // We can manually check the conditions here for the mock
                            const timeMatch = f.raw.match(/lt\.([^)]+)/);
                            const threshold = timeMatch ? timeMatch[1] : new Date().toISOString();

                            const cond1 = row.status === 'journal_locked' && row.created_at < threshold;
                            const cond2 = row.status === 'fulfilled' && row.fulfilled_at < threshold;

                            if (!(cond1 || cond2)) return false;
                        } else {
                            // Simple OR implementation for "col.eq.val,col2.eq.val2"
                            const parts = f.raw.split(',');
                            let match = false;
                            for (const p of parts) {
                                const [c, op, v] = p.split('.');
                                if (op === 'eq' && row[c] == v) match = true;
                                // handle is.null
                                if (op === 'is' && v === 'null' && (row[c] === null || row[c] === undefined)) match = true;
                            }
                            if (!match) return false;
                        }
                    }
                }
                return true;
            });

            // Apply Order
            if (this._order) {
                rows.sort((a: any, b: any) => {
                    if (a[this._order!.col] < b[this._order!.col]) return this._order!.asc ? -1 : 1;
                    if (a[this._order!.col] > b[this._order!.col]) return this._order!.asc ? 1 : -1;
                    return 0;
                });
            }

            // Apply Limit
            if (this._limit > -1) {
                rows = rows.slice(0, this._limit);
            }

            // Execute Mutation
            if (this._insertData) {
                // Normalize to array
                const items = Array.isArray(this._insertData) ? this._insertData : [this._insertData];
                const results: any[] = [];

                if (!this.data[this.table]) this.data[this.table] = [];

                for (const item of items) {
                    // Idempotency Check (Unique Constraint)
                    if (item.idempotency_key) {
                        const exists = this.data[this.table].find((r: any) => r.idempotency_key === item.idempotency_key);
                        if (exists) {
                            // console.log(`   [MockDB] Duplicate idempotency key: ${item.idempotency_key}`);
                            // If batch, usually fails whole batch or ignores. For simplicty, return error immediately
                            return resolve({ data: null, error: { message: 'duplicate key value violates unique constraint', code: '23505' } });
                        }
                    }

                    const newItem = {
                        created_at: new Date().toISOString(),
                        ...item,
                        id: item.id || `mock_${Date.now()}_${Math.random()}`
                    };
                    this.data[this.table].push(newItem);
                    results.push(newItem);
                }

                this.db.saveData();
                return resolve({ data: this._single ? results[0] : results, error: null });
            }

            if (this._updateData) {
                // Update matched rows in the DB
                const updatedRows: any[] = [];
                const allRows = this.data[this.table];
                for (let i = 0; i < allRows.length; i++) {
                    const row = allRows[i];
                    // Check if this row is in our filtered set
                    if (rows.find((r: any) => r.id === row.id)) {
                        allRows[i] = { ...row, ...this._updateData };
                        updatedRows.push(allRows[i]);
                    }
                }
                this.db.saveData();
                return resolve({ data: this._single ? updatedRows[0] : updatedRows, error: null });
            }

            if (this._delete) {
                const allRows = this.data[this.table];
                const newRows = allRows.filter((row: any) => !rows.find((r: any) => r.id === row.id));
                this.data[this.table] = newRows;
                this.db.saveData();
                return resolve({ data: rows, error: null });
            }

            // Handle Joins (Mock)
            if (this._select.includes('journal_lines') && this.table === 'journals') {
                // console.log(`   [MockDB] Joining journal_lines for ${rows.length} journals`);
                const allLines = this.data.journal_lines || [];
                rows = rows.map((r: any) => {
                    const lines = allLines.filter((l: any) => l.journal_entry_id === r.id);
                    // console.log(`       Journal ${r.id} has ${lines.length} lines`);
                    return { ...r, journal_lines: lines };
                });
            }

            // Return Select
            if (this._single) {
                if (rows.length === 0) {
                    if (this._maybeSingle) return resolve({ data: null, error: null });
                    return resolve({ data: null, error: { message: 'Row not found', code: 'PGRST116' } });
                }
                return resolve({ data: rows[0], error: null });
            }

            return resolve({ data: rows, error: null });

        } catch (e) {
            return reject(e);
        }
    }
}

// --- MAIN SCRIPT ---

// Use Mock Client
console.log('⚠️ RUNNING IN SIMULATION MODE (Mock Database)');
const supabase = new MockSupabase() as unknown as SupabaseClient;

// Initialize Services
const marketplaceService = new MarketplaceService(supabase);

// Override Clients for Simulation
AccountingService._getClient = () => supabase;
LedgerIntentService._getClient = async () => supabase;

async function seedAccounts(koperasiId: string) {
    const codes = [
        { code: AccountCode.ESCROW_LIABILITY, name: 'Escrow Liability', type: 'liability', normal_balance: 'CREDIT' },
        { code: AccountCode.CASH_ON_HAND, name: 'Cash', type: 'asset', normal_balance: 'DEBIT' },
        { code: AccountCode.SALES_REVENUE, name: 'Sales Revenue', type: 'revenue', normal_balance: 'CREDIT' },
        { code: AccountCode.BANK_BCA, name: 'Bank BCA', type: 'asset', normal_balance: 'DEBIT' },
        { code: AccountCode.SAVINGS_VOLUNTARY, name: 'Savings Voluntary', type: 'liability', normal_balance: 'CREDIT' },
        { code: AccountCode.COGS, name: 'COGS', type: 'expense', normal_balance: 'DEBIT' },
        { code: AccountCode.INVENTORY_MERCHANDISE, name: 'Inventory', type: 'asset', normal_balance: 'DEBIT' },
        { code: AccountCode.CONSIGNMENT_PAYABLE, name: 'Consignment Payable', type: 'liability', normal_balance: 'CREDIT' },
        { code: AccountCode.ACCOUNTS_PAYABLE, name: 'Accounts Payable', type: 'liability', normal_balance: 'CREDIT' },
        { code: AccountCode.ACCOUNTS_RECEIVABLE, name: 'Accounts Receivable', type: 'asset', normal_balance: 'DEBIT' },
        { code: AccountCode.VAT_OUT, name: 'VAT Out', type: 'liability', normal_balance: 'CREDIT' },
        { code: AccountCode.VAT_IN, name: 'VAT In', type: 'asset', normal_balance: 'DEBIT' },
        { code: AccountCode.PPOB_REVENUE, name: 'PPOB Revenue', type: 'revenue', normal_balance: 'CREDIT' },
        { code: AccountCode.INVENTORY_ADJUSTMENT, name: 'Inventory Adjustment', type: 'expense', normal_balance: 'DEBIT' },
        { code: AccountCode.PPOB_DEPOSIT, name: 'PPOB Deposit', type: 'asset', normal_balance: 'DEBIT' },
    ];

    for (const acc of codes) {
        const { data } = await supabase.from('accounts').select('id').eq('code', acc.code).eq('koperasi_id', koperasiId).maybeSingle();
        if (!data) {
            await supabase.from('accounts').insert({
                koperasi_id: koperasiId,
                ...acc,
                id: `acc_${acc.code.replace(/[-\.]/g, '_')}`,
                is_active: true
            });
        }
    }
}

// --- UTILS ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getTestContext() {
    const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
    const { data: { users } } = await supabase.auth.admin.listUsers();
    return { koperasiId: koperasi?.id, userId: users?.[0]?.id };
}

async function assertLedgerBalanceIntegrity(koperasiId: string) {
    console.log('\n🔍 [AUDIT] Checking Ledger Balance Integrity...');

    // Need to ensure Escrow Account exists in Mock
    const { data: accounts } = await supabase.from('accounts').select('*');
    let escrow = accounts?.find((a: any) => a.code === AccountCode.ESCROW_LIABILITY);

    if (!escrow) {
        // Create it if missing (Mock only)
        await supabase.from('accounts').insert({
            koperasi_id: koperasiId,
            code: AccountCode.ESCROW_LIABILITY,
            name: 'Escrow Liability',
            type: 'liability',
            normal_balance: 'CREDIT'
        });
        escrow = (await supabase.from('accounts').select('*').eq('code', AccountCode.ESCROW_LIABILITY).single()).data;
    }

    // console.log('   [Debug] Escrow Account ID:', escrow.id);
    const { data: balanceLines } = await supabase.from('journal_lines').select('credit, debit').eq('account_id', escrow.id);

    let ledgerBalance = 0;
    balanceLines?.forEach((l: any) => {
        ledgerBalance += (l.credit - l.debit);
    });

    const { data: activeTrx } = await supabase.from('marketplace_transactions')
        .select('amount, status')
        .in('status', ['journal_locked', 'fulfilled']);

    let expectedBalance = 0;
    activeTrx?.forEach((t: any) => expectedBalance += t.amount);

    console.log(`   Expected (Transactions): ${expectedBalance}`);
    console.log(`   Actual (Ledger):         ${ledgerBalance}`);

    if (Math.abs(ledgerBalance - expectedBalance) > 1) {
        console.error('❌ INTEGRITY FAILURE: Ledger does not match Active Transactions!');
        return false;
    } else {
        console.log('✅ INTEGRITY PASS: Ledger matches Active Transactions.');
        return true;
    }
}

async function runScenarios() {
    const { koperasiId, userId } = await getTestContext();
    if (!koperasiId) {
        console.error('Context missing');
        return;
    }

    // Seed Accounts
    await seedAccounts(koperasiId);

    // Also seed accounting period
    const today = new Date().toISOString().split('T')[0];
    const { data: period } = await supabase.from('accounting_period').select('id').eq('koperasi_id', koperasiId).gte('end_date', today).maybeSingle();
    if (!period) {
        await supabase.from('accounting_period').insert({
            koperasi_id: koperasiId,
            start_date: today,
            end_date: today,
            status: 'open',
            id: 'period_mock'
        });
    }

    console.log(`\nCONTEXT: Koperasi=${koperasiId}, User=${userId}\n`);

    await assertLedgerBalanceIntegrity(koperasiId);

    // SCENARIO 1: PPOB Crash
    console.log('\n🧪 [SCENARIO 1] PPOB Crash After Journal Lock');
    try {
        console.log('   Action: Checkout PPOB with FAIL_ME');
        // We need to ensure account has balance first? Mock handles it?
        // We should seed/update mock savings.
        const { data: savings } = await supabase.from('savings_accounts').select('*').single();
        if (savings) await supabase.from('savings_accounts').update({ balance: 1000000 }).eq('id', savings.id);

        await marketplaceService.checkoutPpob(
            koperasiId,
            userId,
            {
                koperasi_id: koperasiId,
                member_id: userId,
                account_id: savings?.id || 's1',
                product_code: 'PULSA10',
                customer_number: 'FAIL_ME'
            }
        );
        console.error('   ❌ FAILED: Should have thrown');
    } catch (error: any) {
        console.log(`   Caught Expected Error: ${error.message}`);

        // Recovery
        console.log('   Verifying Recovery...');
        // Get the latest transaction created by this user
        const { data: latest } = await supabase.from('marketplace_transactions')
            .select('*')
            .eq('created_by', userId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (latest && latest.length > 0) {
            const trx = latest[0];
            console.log(`   Found latest transaction: ${trx.id}, status: ${trx.status}`);
            if (trx.status === 'reversed') {
                console.log('   ✅ SCENARIO 1 PASS: Transaction automatically reversed');
            } else {
                console.error(`   ❌ SCENARIO 1 FAIL: Status is ${trx.status}, expected reversed`);
            }
        } else {
            console.log('   ⚠️ No transaction found (maybe fail before insert?)');
            const { data: allTrx } = await supabase.from('marketplace_transactions').select('*');
            console.log('   [Debug] All Transactions Count:', allTrx?.length);
            if (allTrx && allTrx.length > 0) {
                console.log('   [Debug] First 3 Trx:', allTrx.slice(0, 3).map((t: any) => ({ id: t.id, created_by: t.created_by, created_at: t.created_at })));
            }
        }
    }

    // SCENARIO 2: Double Submit
    console.log('\n🧪 [SCENARIO 2] Double Submit Checkout');
    try {
        const { data: inv } = await supabase.from('inventory_products').select('*').single();
        const items = [{ product_id: inv.id, quantity: 1, price_at_sale: inv.price_sell_public, cost_at_sale: inv.price_cost, subtotal: inv.price_sell_public }];
        const payment = [{ method: 'cash', amount: inv.price_sell_public }];
        const trxData = { total_amount: inv.price_sell_public, final_amount: inv.price_sell_public, payment_method: 'cash', payment_status: 'paid' };

        const idempotencyKey = `dup_${Date.now()}`;
        const p1 = marketplaceService.checkoutRetail(koperasiId, userId, trxData as any, items as any, payment as any, idempotencyKey);
        const p2 = marketplaceService.checkoutRetail(koperasiId, userId, trxData as any, items as any, payment as any, idempotencyKey);

        const results = await Promise.allSettled([p1, p2]);
        const successes = results.filter(r => r.status === 'fulfilled').length;
        console.log(`   Successes: ${successes}`);

        if (successes === 2) console.warn('   ⚠️ Double Submit Allowed (Needs Idempotency)');
        else console.log('   ✅ Double Submit Prevented');
    } catch (e) { console.error(e); }

    // SCENARIO 3: Server Crash
    console.log('\n🧪 [SCENARIO 3] Server Crash Simulation');
    try {
        let trx = await marketplaceService.createTransaction(koperasiId, 'retail', 5000, userId);
        trx = await marketplaceService.lockJournal(trx.id, 'CRASH-TEST', [{ method: 'cash' as any, amount: 5000 }]);
        console.log(`   Transaction ${trx.id} locked.`);
        console.log('   💥 CRASHING...');

        // Simulate crash by "forgetting" in memory? No, persistence handles it.
        // We just stop flow here.

        // RESTART
        console.log('   🔄 RESTARTING (Reloading from DB)...');
        // Reconcile
        const recovered: any[] = await marketplaceService.reconcileStuckTransactions(0);
        const recTrx = recovered.find(r => r.id === trx.id);
        if (recTrx && recTrx.status === 'recovered_reversed') {
            console.log('   ✅ SCENARIO 3 PASS: Auto-reversed on restart');
        } else {
            console.error(`   ❌ SCENARIO 3 FAIL: Status ${recTrx?.status}`);
        }
    } catch (e: any) { console.error(e); }

    // SCENARIO 4: Double Settlement
    console.log('\n🧪 [SCENARIO 4] Double Settlement');
    try {
        // Create a settled transaction
        const settledTrxId = 'settled_trx_1';
        await supabase.from('marketplace_transactions').insert({
            id: settledTrxId,
            koperasi_id: koperasiId,
            type: 'retail',
            status: 'settled',
            amount: 10000,
            created_at: new Date().toISOString(),
            created_by: userId,
            journal_id: 'j1',
            settled_at: new Date().toISOString()
        });

        // Inject Journal for Settled Transaction (Required for Idempotency check if it fetches journal, though it returns early)
        // If settleTransaction returns early, we don't need this, but good for consistency.
        await supabase.from('journals').insert({
            id: 'j1',
            koperasi_id: koperasiId,
            business_unit: 'retail',
            transaction_date: new Date().toISOString(),
            description: 'Settled Journal',
            created_at: new Date().toISOString(),
            created_by: userId
        });

        console.log('   Action: Attempting to settle an already settled transaction...');
        const res = await marketplaceService.settleTransaction(settledTrxId);

        if (res && res.status === 'settled') {
            console.log('   ✅ SCENARIO 4 PASS: Idempotent - Returns settled transaction without error');
        } else {
            console.error(`   ❌ SCENARIO 4 FAIL: Unexpected result`, res);
        }
    } catch (error: any) {
        console.error(`   ❌ SCENARIO 4 FAIL: Unexpected error: ${error.message}`);
    }

    // SCENARIO 5: Day End with Stuck Transactions
    console.log('\n🧪 [SCENARIO 5] Day End Stuck Transactions');
    try {
        const oldDate = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago

        // 1. Stuck Locked (Should be Reversed)
        const stuckLockedId = 'stuck_locked_1';
        await supabase.from('marketplace_transactions').insert({
            id: stuckLockedId,
            koperasi_id: koperasiId,
            type: 'retail',
            status: 'journal_locked',
            entity_id: 'pending',
            amount: 50000,
            created_at: oldDate,
            updated_at: oldDate,
            created_by: userId,
            journal_id: 'j_stuck_1'
        });

        // Inject Journal for Stuck Locked
        const accCash = (await AccountingService.getAccountIdByCode(koperasiId, AccountCode.CASH_ON_HAND))!;
        const accEscrow = (await AccountingService.getAccountIdByCode(koperasiId, AccountCode.ESCROW_LIABILITY))!;

        await supabase.from('journals').insert({
            id: 'j_stuck_1',
            koperasi_id: koperasiId,
            business_unit: 'retail',
            transaction_date: oldDate,
            description: 'Stuck Locked Journal',
            created_at: oldDate,
            created_by: userId
        });
        await supabase.from('journal_lines').insert([
            { id: 'l_stuck_1a', journal_entry_id: 'j_stuck_1', account_id: accCash, debit: 50000, credit: 0 },
            { id: 'l_stuck_1b', journal_entry_id: 'j_stuck_1', account_id: accEscrow, debit: 0, credit: 50000 }
        ]);

        // 2. Stuck Fulfilled (Should be Settled)
        const stuckFulfilledId = 'stuck_fulfilled_1';
        // Need pos_transactions for settlement logic if type is retail
        // Let's use ppob to simplify or mock pos_transaction
        // Using PPOB for simplicity in settlement logic mocking
        await supabase.from('marketplace_transactions').insert({
            id: stuckFulfilledId,
            koperasi_id: koperasiId,
            type: 'ppob',
            status: 'fulfilled',
            entity_id: 'ppob_stuck_1',
            amount: 20000,
            created_at: oldDate,
            updated_at: oldDate,
            fulfilled_at: oldDate,
            created_by: userId,
            journal_id: 'j_stuck_2'
        });

        // Inject Journal for Stuck Fulfilled
        await supabase.from('journals').insert({
            id: 'j_stuck_2',
            koperasi_id: koperasiId,
            business_unit: 'ppob',
            transaction_date: oldDate,
            description: 'Stuck Fulfilled Journal',
            created_at: oldDate,
            created_by: userId
        });
        await supabase.from('journal_lines').insert([
            { id: 'l_stuck_2a', journal_entry_id: 'j_stuck_2', account_id: accCash, debit: 20000, credit: 0 },
            { id: 'l_stuck_2b', journal_entry_id: 'j_stuck_2', account_id: accEscrow, debit: 0, credit: 20000 }
        ]);
        // Mock PPOB Transaction
        await supabase.from('ppob_transactions').insert({
            id: 'ppob_stuck_1',
            koperasi_id: koperasiId,
            product_code: 'PULSA10',
            customer_number: '08123456789',
            amount: 20000,
            status: 'success',
            transaction_id: stuckFulfilledId
        });

        console.log('   Action: Reconciling Stuck Transactions...');
        const results: any[] = await marketplaceService.reconcileStuckTransactions(30); // > 30 mins

        const resLocked = results.find(r => r.id === stuckLockedId);
        const resFulfilled = results.find(r => r.id === stuckFulfilledId);

        if (resLocked?.status === 'recovered_reversed' && resFulfilled?.status === 'recovered_settled') {
            console.log('   ✅ SCENARIO 5 PASS: All stuck transactions recovered correctly');
            console.log(`      - Locked -> Reversed`);
            console.log(`      - Fulfilled -> Settled`);
        } else {
            console.error('   ❌ SCENARIO 5 FAIL: Recovery mismatch');
            console.log('      Results:', results);
        }

    } catch (error: any) {
        console.error(`   ❌ SCENARIO 5 FAIL: ${error.message}`);
    }

    await assertLedgerBalanceIntegrity(koperasiId);
    console.log('\n🏁 UAT Completed.');
}

runScenarios().catch(console.error);
