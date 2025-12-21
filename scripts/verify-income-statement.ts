import { createClient } from '@supabase/supabase-js';
import { ReportService } from '@/lib/services/report-service';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('Verifying Income Statement implementation...');

  // 1. Get Koperasi ID
  const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
  if (!koperasi) {
    console.error('No Koperasi found');
    process.exit(1);
  }
  console.log('Koperasi ID:', koperasi.id);

  // 2. Test ReportService
  const reportService = new ReportService(supabase);
  
  // Set range: Start of Month to End of Month (assuming data is recent)
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  try {
    const report = await reportService.getIncomeStatement(koperasi.id, startDate, endDate);
    console.log('Income Statement generated successfully!');
    console.log(`Period: ${report.start_date} to ${report.end_date}`);
    
    console.log('\n--- REVENUE ---');
    console.log('Total Revenue     :', new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(report.revenue.total));
    
    console.log('\n--- EXPENSES ---');
    console.log('Total Expenses    :', new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(report.expenses.total));
    
    console.log('\n--- SUMMARY ---');
    console.log('Net Income        :', new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(report.summary.net_income));

    // Verify calculation
    const calculatedNet = report.revenue.total - report.expenses.total;
    if (Math.abs(calculatedNet - report.summary.net_income) < 1) {
        console.log('✅ Calculation Verified (Revenue - Expense = Net Income)');
    } else {
        console.warn('⚠️ Calculation Mismatch!');
        console.log('Calculated:', calculatedNet);
        console.log('Reported:', report.summary.net_income);
    }

  } catch (error: any) {
    console.error('❌ Error generating Income Statement:', error.message);
    process.exit(1);
  }
}

main();
