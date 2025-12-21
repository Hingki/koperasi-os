
import { createClient } from '@supabase/supabase-js';
import { ReportService } from '../src/lib/services/report-service';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function checkIncomeDetails() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const reportService = new ReportService(supabase);

  const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();

  if (!koperasi) {
      console.error('Koperasi not found');
      return;
  }
  console.log('Koperasi found:', koperasi.id);

  const koperasiId = koperasi.id;

  const startDate = new Date('2025-12-01');
  const endDate = new Date('2025-12-31');

  console.log(`Checking Income Statement for ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  
  const report = await reportService.getIncomeStatement(koperasiId, startDate, endDate);

  console.log('--- REVENUE (PENDAPATAN) ---');
  report.revenue.items.forEach(item => {
      console.log(`${item.account_name}: ${item.balance}`);
  });
  console.log(`TOTAL REVENUE: ${report.revenue.total}`);

  console.log('\n--- EXPENSES (BEBAN) ---');
  report.expenses.items.forEach(item => {
      console.log(`${item.account_name}: ${item.balance}`);
  });
  console.log(`TOTAL EXPENSES (BEBAN USAHA): ${report.expenses.total}`);

  console.log(`\nNET INCOME: ${report.summary.net_income}`);
}

checkIncomeDetails().catch(console.error);
