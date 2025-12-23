import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- Setting up UAT Data ---');

  // 1. Get Koperasi
  const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
  if (!koperasi) throw new Error('No Koperasi found');
  console.log('Koperasi ID:', koperasi.id);

  // 2. Get Member (Create if needed)
  let { data: member } = await supabase.from('member').select('id, user_id').limit(1).single();
  if (!member) {
      console.log('No member found, creating dummy member...');
      // Need a user_id for member... complicated without auth.
      // Let's assume there is at least one member.
      throw new Error('Please create a member via the UI first (Register).');
  }
  console.log('Member ID:', member.id);

  // 3. Get Savings Account
  let { data: savings } = await supabase.from('savings_accounts').select('id').eq('member_id', member.id).limit(1).single();
  if (!savings) {
    console.log('Creating Savings Account...');
    // Get Product
    const { data: product } = await supabase.from('savings_products').select('id').limit(1).single();
    if (!product) throw new Error('No Savings Product found. Run migrations.');
    
    const { data: newSavings, error } = await supabase.from('savings_accounts').insert({
        koperasi_id: koperasi.id,
        member_id: member.id,
        product_id: product.id,
        account_number: 'SAV-' + Date.now(),
        balance: 0,
        status: 'active'
    }).select().single();
    if (error) throw error;
    savings = newSavings;
  }
  console.log('Savings ID:', savings.id);

  // 4. Get Payment Source
  const { data: sources } = await supabase.from('payment_sources').select('*');
  console.log('Available Sources:', sources?.map(s => `${s.name} (${s.provider})`));

  const { data: source } = await supabase.from('payment_sources').select('id, name').eq('provider', 'manual').limit(1).single();
  if (!source) throw new Error('No Manual Payment Source found. Run migrations.');
  console.log('Payment Source:', source.name);

  // 5. Create PENDING Transaction (Scenario 1)
  console.log('Creating Pending Savings Deposit...');
  const { data: tx1, error: err1 } = await supabase.from('payment_transactions').insert({
    koperasi_id: koperasi.id,
    transaction_type: 'savings_deposit',
    reference_id: savings.id,
    amount: 50000,
    payment_method: 'transfer',
    payment_provider: 'manual',
    payment_source_id: source.id,
    payment_status: 'pending',
    proof_of_payment: 'UAT-AUTO-DEP-001',
    metadata: {
        member_id: member.id,
        sender_note: 'Uji Coba Otomatis'
    },
    created_by: member.user_id // Simulate Member
  }).select().single();
  
  if (err1) console.error('Error creating TX1:', err1);
  else console.log('TX1 Created:', tx1.id);

  // 6. Create PENDING Transaction (Scenario 2 - if loan exists)
   let { data: loan } = await supabase.from('loans').select('id').eq('member_id', member.id).limit(1).single();
   if (loan) {
     console.log('Creating Pending Loan Payment...');
     const { data: tx2, error: err2 } = await supabase.from('payment_transactions').insert({
        koperasi_id: koperasi.id,
        transaction_type: 'loan_payment',
        reference_id: loan.id,
        amount: 100000,
        payment_method: 'transfer',
        payment_provider: 'manual',
        payment_source_id: source.id,
        payment_status: 'pending',
        proof_of_payment: 'UAT-AUTO-LOAN-001',
        metadata: {
            member_id: member.id,
            sender_note: 'Uji Coba Angsuran'
        },
        created_by: member.user_id
      }).select().single();
      if (err2) console.error('Error creating TX2:', err2);
      else console.log('TX2 Created:', tx2.id);
   } else {
       console.log('Skipping Loan Payment (No Loan Found)');
   }

   console.log('\n--- DONE ---');
   console.log('Please check Dashboard > Payments to Approve/Reject these transactions.');
}

run().catch(console.error);
