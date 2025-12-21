import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/services/payment-service';
import { PaymentProviderType } from '@/lib/types/payment';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Note: Webhooks usually don't have user session (server-to-server).
    // So we don't check for `user`. We trust the provider signature (TODO).
    
    const searchParams = request.nextUrl.searchParams;
    const providerType = (searchParams.get('provider') as PaymentProviderType) || 'mock';

    const paymentService = new PaymentService(supabase, providerType);
    
    const body = await request.json();
    
    const result = await paymentService.processWebhook(body);

    return NextResponse.json({ success: true, status: result.status });

  } catch (error: any) {
    console.error('Payment Webhook Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
