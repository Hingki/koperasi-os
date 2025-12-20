import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { SavingsService } from '@/lib/services/savings-service';
import { savingsTransactionSchema } from '@/lib/validations/savings';
import { hasAnyRole } from '@/lib/auth/roles';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // 1. Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      );
    }

    // 2. Parse & Validate Body
    const body = await request.json();
    const validatedData = savingsTransactionSchema.parse(body);

    // 3. Permission Check
    // We need to know the Koperasi ID to check permissions.
    const { data: account, error: accError } = await supabase
        .from('savings_accounts')
        .select('koperasi_id')
        .eq('id', validatedData.accountId)
        .single();

    if (accError || !account) {
        return NextResponse.json({ error: 'NotFound', message: 'Account not found' }, { status: 404 });
    }

    // Only Admin/Teller can perform transactions for now (or maybe members can deposit via payment gateway later)
    const isAuthorized = await hasAnyRole(supabase, user.id, account.koperasi_id, ['admin', 'pengurus', 'bendahara', 'teller']);
    if (!isAuthorized) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Insufficient permissions' },
            { status: 403 }
        );
    }

    // 4. Invoke Service
    const savingsService = new SavingsService(supabase);
    const result = await savingsService.processTransaction(
        validatedData.accountId,
        validatedData.amount,
        validatedData.type,
        user.id,
        validatedData.description
    );

    return NextResponse.json(
      { 
        message: 'Transaction successful', 
        data: result 
      }, 
      { status: 200 }
    );

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ValidationError', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Savings Transaction Error:', error);
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message || 'Transaction failed' },
      { status: 500 }
    );
  }
}
