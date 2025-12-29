import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { isAdmin } from '@/lib/auth/roles';
import { SavingsService } from '@/lib/services/savings-service';

/**
 * POST /api/admin/members/approve
 * 
 * Approve a member registration and auto-assign 'anggota' role.
 * Optionally process initial Simpanan Pokok deposit.
 * Admin only endpoint.
 * 
 * Body:
 * {
 *   member_id: string (UUID),
 *   koperasi_id: string (UUID),
 *   initial_deposit?: number, // Optional Simpanan Pokok amount
 *   payment_method?: 'cash' | 'transfer' // Default 'cash'
 * }
 * 
 * Actions:
 * 1. Update member status from 'pending' to 'active'
 * 2. Set tanggal_aktif to current date
 * 3. Auto-assign role 'anggota' to the user
 * 4. (Optional) Process Simpanan Pokok deposit
 */
const approveMemberSchema = z.object({
  member_id: z.string().uuid('Invalid member_id format'),
  koperasi_id: z.string().uuid('Invalid koperasi_id format'),
  initial_deposit: z.number().optional(),
  payment_method: z.enum(['cash', 'transfer']).optional().default('cash'),
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

    const { member_id, koperasi_id, initial_deposit, payment_method } = validation.data;

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
      .select('id, user_id, status, koperasi_id, member_number')
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

    // 4b. Process Initial Deposit (Simpanan Pokok) if provided
    let depositResult = null;
    if (initial_deposit && initial_deposit > 0) {
        try {
            // Find Simpanan Pokok Product
            const { data: product, error: prodError } = await supabase
                .from('savings_products')
                .select('id, min_deposit')
                .eq('koperasi_id', koperasi_id)
                .eq('type', 'pokok')
                .eq('is_active', true)
                .single();
            
            if (prodError || !product) {
                console.error("Simpanan Pokok Product not found");
                // Don't block approval, but warn
            } else {
                if (initial_deposit < product.min_deposit) {
                     return NextResponse.json(
                        { error: `Initial deposit must be at least ${product.min_deposit}` },
                        { status: 400 }
                    );
                }

                // Create Savings Account
                const { data: account, error: accError } = await supabase
                    .from('savings_accounts')
                    .insert({
                        koperasi_id,
                        member_id,
                        product_id: product.id,
                        account_number: `SP-${member.member_number || Date.now()}`, // Temporary number generation
                        balance: 0,
                        status: 'active',
                        created_by: user.id
                    })
                    .select()
                    .single();

                if (accError) {
                    console.error("Failed to create savings account:", accError);
                    throw new Error("Failed to create Simpanan Pokok account");
                }

                // Process Deposit
                const savingsService = new SavingsService(supabase);
                depositResult = await savingsService.processTransaction(
                    account.id,
                    initial_deposit,
                    'deposit',
                    user.id,
                    `Setoran Awal Simpanan Pokok (Member Approval)`,
                    'CASH',
                    false // Do NOT skip ledger
                );
            }
        } catch (err: any) {
            console.error("Initial Deposit Failed:", err);
            return NextResponse.json(
                { error: `Approval failed during initial deposit: ${err.message}` },
                { status: 500 }
            );
        }
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



