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
  console.log('Verifying Balance Sheet implementation...');

  // 1. Get Koperasi ID
  const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
  if (!koperasi) {
    console.error('No Koperasi found');
    process.exit(1);
  }
  console.log('Koperasi ID:', koperasi.id);

  // 2. Test ReportService
  const reportService = new ReportService(supabase);
  try {
    const report = await reportService.getBalanceSheet(koperasi.id, new Date());
    console.log('Balance Sheet generated successfully!');
    console.log('Total Assets      :', new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(report.assets.total));
    console.log('Total Liabilities :', new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(report.liabilities.total));
    console.log('Total Equity      :', new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(report.equity.total));
    console.log('Balanced          :', report.summary.is_balanced);
    
    if (report.summary.is_balanced) {
        console.log('✅ Balance Sheet is balanced.');
    } else {
        console.warn('⚠️ Balance Sheet is NOT balanced. Discrepancy:', report.summary.discrepancy);
    }

  } catch (error: any) {
    console.error('❌ Error generating Balance Sheet:', error.message);
    if (error.message && error.message.includes('function get_ledger_balance_summary') && error.message.includes('does not exist')) {
        console.log('\n⚠️  Migration required!');
        console.log('The RPC function `get_ledger_balance_summary` is missing.');
        console.log('Please apply the migration: supabase/migrations/20251221140000_create_report_rpc.sql');
    }
    process.exit(1);
  }
}

main();
