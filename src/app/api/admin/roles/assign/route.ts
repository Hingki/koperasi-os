import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { isAdmin, type UserRoleType } from '@/lib/auth/roles';

/**
 * POST /api/admin/roles/assign
 * 
 * Assign a role to a user (admin only).
 * 
 * Body:
 * {
 *   user_id: string (UUID),
 *   koperasi_id: string (UUID),
 *   role: UserRoleType,
 *   member_id?: string (UUID, optional),
 *   permissions?: string[] (optional),
 *   valid_until?: string (ISO date, optional)
 * }
 * 
 * Security:
 * - Only admins can assign roles
 * - RLS policy enforces admin check
 */
const assignRoleSchema = z.object({
  user_id: z.string().uuid('Invalid user_id format'),
  koperasi_id: z.string().uuid('Invalid koperasi_id format'),
  role: z.enum(['admin', 'pengurus', 'bendahara', 'ketua', 'anggota', 'staff']),
  member_id: z.string().uuid().optional().nullable(),
  permissions: z.array(z.string()).default([]),
  valid_until: z.string().datetime().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login first.' },
        { status: 401 }
      );
    }

    // 2. Verify admin role
    const body = await request.json();
    const { koperasi_id } = body;

    if (!koperasi_id) {
      return NextResponse.json(
        { error: 'koperasi_id is required' },
        { status: 400 }
      );
    }

    const userIsAdmin = await isAdmin(koperasi_id);
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'Forbidden. Admin role required.' },
        { status: 403 }
      );
    }

    // 3. Validate request body
    const validation = assignRoleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // 4. Check if role already exists (active)
    const { data: existingRole } = await supabase
      .from('user_role')
      .select('id')
      .eq('user_id', validatedData.user_id)
      .eq('koperasi_id', validatedData.koperasi_id)
      .eq('role', validatedData.role)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (existingRole) {
      return NextResponse.json(
        { error: 'User already has this role assigned' },
        { status: 409 }
      );
    }

    // 5. Insert new role
    const { data: newRole, error: insertError } = await supabase
      .from('user_role')
      .insert({
        user_id: validatedData.user_id,
        koperasi_id: validatedData.koperasi_id,
        member_id: validatedData.member_id || null,
        role: validatedData.role,
        permissions: validatedData.permissions || [],
        is_active: true,
        valid_from: new Date().toISOString(),
        valid_until: validatedData.valid_until || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      // Handle RLS policy violation
      if (insertError.code === '42501') {
        return NextResponse.json(
          {
            error: 'Permission denied. RLS policy violation.',
            details: 'You may not have admin privileges for this koperasi.',
          },
          { status: 403 }
        );
      }

      console.error('Database error:', insertError);
      return NextResponse.json(
        { error: 'Failed to assign role', details: insertError.message },
        { status: 500 }
      );
    }

    // 6. Return success
    return NextResponse.json(
      {
        success: true,
        data: newRole,
        message: 'Role assigned successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Only allow POST method
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to assign roles.' },
    { status: 405 }
  );
}



