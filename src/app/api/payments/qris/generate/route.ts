import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/services/payment-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reference_id, transaction_type, amount, description } = body;

    // Validate required fields
    if (!reference_id || !transaction_type || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(reference_id)) {
        return NextResponse.json({ error: 'Invalid Reference ID format' }, { status: 400 });
    }

    // Get Koperasi ID from User
    // For MVP, if not in metadata, try to find from member or user_role
    let koperasiId = user.user_metadata?.koperasi_id;
    if (!koperasiId) {
        // Fallback lookup
        const { data: role } = await supabase
            .from('user_role')
            .select('koperasi_id')
            .eq('user_id', user.id)
            .maybeSingle();
        koperasiId = role?.koperasi_id;
    }
    
    if (!koperasiId) {
         return NextResponse.json({ error: 'Koperasi context not found' }, { status: 400 });
    }

    if (!uuidRegex.test(koperasiId)) {
         return NextResponse.json({ error: 'Invalid Koperasi ID format' }, { status: 400 });
    }

    const paymentService = new PaymentService(supabase, 'mock'); // Use mock for now, or env config
    
    const transaction = await paymentService.createQRISPayment(
      koperasiId,
      reference_id,
      transaction_type,
      amount,
      description
    );

    return NextResponse.json({ success: true, data: transaction });

  } catch (error: any) {
    console.error('QRIS Generation Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
