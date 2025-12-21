
import { createClient } from '@supabase/supabase-js';
import { ReportService } from '../src/lib/services/report-service';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function verifyIncomeStatementDateRange() {
  console.log('Verifying Income Statement Date Range Logic...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const reportService = new ReportService(supabase);

  // 1. Get Koperasi ID
  const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
  if (!koperasi) {
    console.error('No Koperasi found');
    process.exit(1);
  }
  const koperasiId = koperasi.id;
  console.log(`Koperasi ID: ${koperasiId}`);

  // 2. Define two different ranges
  // Range A: Full Month (Expected to have data)
  const rangeA_Start = new Date('2025-12-01');
  const rangeA_End = new Date('2025-12-31');

  // Range B: Very old range (Expected to have NO data or different data)
  const rangeB_Start = new Date('2020-01-01');
  const rangeB_End = new Date('2020-01-31');

  console.log(`\nFetching Report A: ${rangeA_Start.toISOString().split('T')[0]} to ${rangeA_End.toISOString().split('T')[0]}`);
  const reportA = await reportService.getIncomeStatement(koperasiId, rangeA_Start, rangeA_End);
  console.log(`Report A Net Income: ${reportA.summary.net_income}`);

  console.log(`\nFetching Report B: ${rangeB_Start.toISOString().split('T')[0]} to ${rangeB_End.toISOString().split('T')[0]}`);
  const reportB = await reportService.getIncomeStatement(koperasiId, rangeB_Start, rangeB_End);
  console.log(`Report B Net Income: ${reportB.summary.net_income}`);

  if (reportA.summary.net_income !== reportB.summary.net_income) {
      console.log('\n✅ Date Range filtering is WORKING (Results differ between periods)');
  } else {
      console.log('\n⚠️ Results are identical. This might be correct if no data exists, but verifying logic...');
      if (reportB.summary.net_income === 0 && reportA.summary.net_income !== 0) {
          console.log('✅ Logic validated: Empty period returns 0, Active period returns data.');
      } else if (reportA.summary.net_income === 0 && reportB.summary.net_income === 0) {
          console.log('⚠️ Both periods have 0 income. Cannot definitively prove filtering without data.');
      }
  }
}

verifyIncomeStatementDateRange().catch(console.error);
