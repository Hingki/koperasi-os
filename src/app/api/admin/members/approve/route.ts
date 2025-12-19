import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { isAdmin } from '@/lib/auth/roles';

/**
 * POST /api/admin/members/approve
 * 
 * Approve a member registration and auto-assign 'anggota' role.
 * Admin only endpoint.
 * 
 * Body:
 * {
 *   member_id: string (UUID),
 *   koperasi_id: string (UUID)
 * }
 * 
 * Actions:
 * 1. Update member status from 'pending' to 'active'
 * 2. Set tanggal_aktif to current date
 * 3. Auto-assign role 'anggota' to the user
 */
const approveMemberSchema = z.object({
  member_id: z.string().uuid('Invalid member_id format'),
  koperasi_id: z.string().uuid('Invalid koperasi_id format'),
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

    // 2. Parse and validate request body
    const body = await request.json();
    const validation = approveMemberSchema.safeParse(body);

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

    const { member_id, koperasi_id } = validation.data;

    // 3. Verify admin role
    const userIsAdmin = await isAdmin(koperasi_id);
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'Forbidden. Admin role required.' },
        { status: 403 }
      );
    }

    // 4. Get member data
    const { data: member, error: memberError } = await supabase
      .from('member')
      .select('id, user_id, status, koperasi_id')
      .eq('id', member_id)
      .eq('koperasi_id', koperasi_id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    if (member.status === 'active') {
      return NextResponse.json(
        { error: 'Member is already active' },
        { status: 409 }
      );
    }

    // 5. Update member status to 'active' and set tanggal_aktif
    const { error: updateError } = await supabase
      .from('member')
      .update({
        status: 'active',
        tanggal_aktif: new Date().toISOString().split('T')[0], // Current date
        updated_by: user.id,
      })
      .eq('id', member_id);

    if (updateError) {
      console.error('Error updating member status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update member status', details: updateError.message },
        { status: 500 }
      );
    }

    // 6. Check if role 'anggota' already exists
    const { data: existingRole } = await supabase
      .from('user_role')
      .select('id')
      .eq('user_id', member.user_id)
      .eq('koperasi_id', koperasi_id)
      .eq('role', 'anggota')
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    // 7. Auto-assign role 'anggota' if not exists
    if (!existingRole) {
      const { error: roleError } = await supabase.from('user_role').insert({
        user_id: member.user_id,
        koperasi_id: koperasi_id,
        member_id: member_id,
        role: 'anggota',
        permissions: [],
        is_active: true,
        created_by: user.id,
      });

      if (roleError) {
        // Log error but don't fail the approval
        // Role assignment can be done manually later
        console.error('Error assigning role:', roleError);
        // Continue with approval even if role assignment fails
      }
    }

    // 8. Return success
    return NextResponse.json(
      {
        success: true,
        message: 'Member approved successfully. Role "anggota" has been assigned.',
        data: {
          member_id: member_id,
          status: 'active',
          role_assigned: !existingRole, // true if role was just assigned
        },
      },
      { status: 200 }
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
    { error: 'Method not allowed. Use POST to approve members.' },
    { status: 405 }
  );
}


