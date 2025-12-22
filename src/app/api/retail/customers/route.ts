import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { respondSuccess, respondError, respondZodError } from '@/lib/api/response';

const createCustomerSchema = z.object({
  koperasi_id: z.string().uuid(),
  name: z.string().min(1, 'Nama wajib diisi'),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const koperasiId = searchParams.get('koperasi_id');

  if (!koperasiId) {
    return respondError('BAD_REQUEST', 'Koperasi ID is required', 400);
  }

  const { data, error } = await supabase
    .from('retail_customers')
    .select('*')
    .eq('koperasi_id', koperasiId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) return respondError('DB_ERROR', error.message);
  return respondSuccess(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validation = createCustomerSchema.safeParse(body);

  if (!validation.success) {
    return respondZodError(validation.error);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('retail_customers')
    .insert(validation.data)
    .select()
    .single();

  if (error) return respondError('DB_ERROR', error.message);
  return respondSuccess(data);
}
