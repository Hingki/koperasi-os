import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { respondError, respondSuccess } from '@/lib/api/response';
import { isAdmin } from '@/lib/auth/roles';

const updateRoleSchema = z.object({
  koperasi_id: z.string().uuid('Invalid koperasi_id format'),
  role: z.enum(['admin', 'pengurus', 'bendahara', 'ketua', 'wakil_ketua', 'sekretaris', 'anggota', 'staff']).optional(),
  permissions: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  valid_until: z.string().datetime().optional().nullable(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return respondError('UNAUTHORIZED', 'Please login', 401);

    const body = await request.json();
    const validation = updateRoleSchema.safeParse(body);
    if (!validation.success) {
      return respondError('VALIDATION_ERROR', 'Invalid payload', 400, validation.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })));
    }
    const { koperasi_id, ...updates } = validation.data;

    const isAdminRole = await isAdmin(koperasi_id);
    if (!isAdminRole) return respondError('FORBIDDEN', 'Admin role required', 403);

    const { data: existing, error: findError } = await supabase
      .from('user_role')
      .select('id, koperasi_id')
      .eq('id', id)
      .single();
    if (findError || !existing) return respondError('NOT_FOUND', 'Role record not found', 404);
    if (existing.koperasi_id !== koperasi_id) return respondError('FORBIDDEN', 'Cross-koperasi update denied', 403);

    const { error: updateError } = await supabase
      .from('user_role')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', id);
    if (updateError) return respondError('UPDATE_FAILED', updateError.message, 500);

    return respondSuccess(undefined, 'Role updated', 200);
  } catch (e) {
    return respondError('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return respondError('UNAUTHORIZED', 'Please login', 401);

    const body = await request.json().catch(() => ({}));
    const koperasi_id: string | undefined = body?.koperasi_id;
    if (!koperasi_id) return respondError('VALIDATION_ERROR', 'koperasi_id required', 400, [{ field: 'koperasi_id', message: 'koperasi_id required' }]);

    const isAdminRole = await isAdmin(koperasi_id);
    if (!isAdminRole) return respondError('FORBIDDEN', 'Admin role required', 403);

    const { data: existing, error: findError } = await supabase
      .from('user_role')
      .select('id, koperasi_id')
      .eq('id', id)
      .single();
    if (findError || !existing) return respondError('NOT_FOUND', 'Role record not found', 404);
    if (existing.koperasi_id !== koperasi_id) return respondError('FORBIDDEN', 'Cross-koperasi delete denied', 403);

    const { error: deleteError } = await supabase
      .from('user_role')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        is_active: false,
      })
      .eq('id', id);
    if (deleteError) return respondError('DELETE_FAILED', deleteError.message, 500);

    return respondSuccess(undefined, 'Role deleted', 200);
  } catch (e) {
    return respondError('INTERNAL_SERVER_ERROR', 'Unexpected error', 500);
  }
}

