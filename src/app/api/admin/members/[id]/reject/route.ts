import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check Admin Role
    const { data: userRole } = await supabase
      .from('user_role')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userRole?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'No reason provided';

    // Update Status to Rejected
    const { error: updateError } = await supabase
      .from('member')
      .update({
        status: 'rejected',
        // We might want to store rejection reason in a separate log or notes field if schema permits
        // For MVP, we just change status
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error rejecting member:', updateError);
      return NextResponse.json({ error: 'Failed to update member status' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Member application rejected.',
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}