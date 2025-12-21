import { createClient } from '@/lib/supabase/server';
import { ReportService } from '@/lib/services/report-service';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const koperasiIdParam = searchParams.get('koperasiId');
    
    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let targetKoperasiId = koperasiIdParam || user.user_metadata?.koperasi_id;
    
    if (!targetKoperasiId) {
        // Fallback for development/MVP: Get the first koperasi
        const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
        targetKoperasiId = koperasi?.id;
    }
    
    if (!targetKoperasiId) {
        return NextResponse.json({ error: 'Koperasi not found' }, { status: 404 });
    }

    const reportService = new ReportService(supabase);
    const report = await reportService.getIncomeStatement(targetKoperasiId, startDate, endDate);

    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Error generating income statement:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
