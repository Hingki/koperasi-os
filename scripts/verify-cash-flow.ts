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
  console.log('Verifying Cash Flow Statement implementation...');

  // 1. Get Koperasi ID
  const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
  if (!koperasi) {
    console.error('No Koperasi found');
    process.exit(1);
  }
  console.log('Koperasi ID:', koperasi.id);

  // 2. Test ReportService
  const reportService = new ReportService(supabase);
  
  // Set range: Start of Month to End of Month
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  try {
    const report = await reportService.getCashFlowStatement(koperasi.id, startDate, endDate);
    console.log('Cash Flow Statement generated successfully!');
    console.log(`Period: ${report.start_date} to ${report.end_date}`);
    
    console.log('\n--- OPERATING ACTIVITIES ---');
    report.operating_activities.items.forEach(item => {
        console.log(`${item.name.padEnd(40)}: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.amount)}`);
    });
    console.log(`TOTAL OPERATING                         : ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(report.operating_activities.total)}`);
    
    console.log('\n--- INVESTING ACTIVITIES ---');
    report.investing_activities.items.forEach(item => {
        console.log(`${item.name.padEnd(40)}: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.amount)}`);
    });
    console.log(`TOTAL INVESTING                         : ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(report.investing_activities.total)}`);

    console.log('\n--- FINANCING ACTIVITIES ---');
    report.financing_activities.items.forEach(item => {
        console.log(`${item.name.padEnd(40)}: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.amount)}`);
    });
    console.log(`TOTAL FINANCING                         : ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(report.financing_activities.total)}`);
    
    console.log('\n--- SUMMARY ---');
    console.log(`Net Change in Cash                      : ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(report.summary.net_change_in_cash)}`);
    console.log(`Beginning Cash Balance                  : ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(report.summary.beginning_cash_balance)}`);
    console.log(`Ending Cash Balance                     : ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(report.summary.ending_cash_balance)}`);

    // Verify calculation
    const calculatedNet = report.operating_activities.total + report.investing_activities.total + report.financing_activities.total;
    if (Math.abs(calculatedNet - report.summary.net_change_in_cash) < 1) {
        console.log('✅ Calculation Verified (Sum of Activities = Net Change)');
    } else {
        console.warn('⚠️ Calculation Mismatch!');
        console.log('Calculated Sum:', calculatedNet);
        console.log('Reported Net:', report.summary.net_change_in_cash);
    }

  } catch (error: any) {
    console.error('❌ Error generating Cash Flow Statement:', error.message);
    process.exit(1);
  }
}

main();
