import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { respondSuccess, respondError, respondZodError } from '@/lib/api/response';

const updateCustomerSchema = z.object({
  koperasi_id: z.string().uuid(),
  name: z.string().min(1, 'Nama wajib diisi').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const validation = updateCustomerSchema.safeParse(body);

  if (!validation.success) {
    return respondZodError(validation.error);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('retail_customers')
    .update(validation.data)
    .eq('id', id)
    .eq('koperasi_id', validation.data.koperasi_id)
    .select()
    .single();

  if (error) return respondError('DB_ERROR', error.message);
  return respondSuccess(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json(); // Expecting koperasi_id for safety
  
  if (!body.koperasi_id) {
    return respondError('BAD_REQUEST', 'Koperasi ID is required', 400);
  }

  const supabase = await createClient();
  // Soft delete
  const { error } = await supabase
    .from('retail_customers')
    .update({ is_active: false })
    .eq('id', id)
    .eq('koperasi_id', body.koperasi_id);

  if (error) return respondError('DB_ERROR', error.message);
  return respondSuccess({ success: true });
}
