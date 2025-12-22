import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';
import { SavingsService } from '@/lib/services/savings-service';
import { savingsTransactionSchema } from '@/lib/validations/savings';
import { hasAnyRole } from '@/lib/auth/roles';
import { z } from 'zod';
import { respondSuccess, respondError, respondZodError, respondServiceError } from '@/lib/api/response';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return respondError('UNAUTHORIZED', 'You must be logged in', 401);
    }

    const body = await request.json();
    const validatedData = savingsTransactionSchema.parse(body);

    const { data: account, error: accError } = await supabase
        .from('savings_accounts')
        .select('koperasi_id')
        .eq('id', validatedData.accountId)
        .single();

    if (accError || !account) {
        return respondError('NOT_FOUND', 'Account not found', 404, [{ field: 'accountId', message: 'Account not found' }]);
    }

    const isAuthorized = await hasAnyRole(['admin', 'pengurus', 'bendahara', 'staff'], account.koperasi_id);
    if (!isAuthorized) {
        return respondError('FORBIDDEN', 'Insufficient permissions', 403);
    }

    const savingsService = new SavingsService(supabase);
    const result = await savingsService.processTransaction(
        validatedData.accountId,
        validatedData.amount,
        validatedData.type,
        user.id,
        validatedData.description
    );

    return respondSuccess(result, 'Transaction successful', 200);

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return respondZodError(error, 400);
    }
    return respondServiceError(error);
  }
}
