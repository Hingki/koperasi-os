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

    // 1. Get Member Data
    const { data: member, error: memberError } = await supabase
      .from('member')
      .select('*')
      .eq('id', id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // 2. Update Status to Active
    const { error: updateError } = await supabase
      .from('member')
      .update({
        status: 'active',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error approving member:', updateError);
      return NextResponse.json({ error: 'Failed to update member status' }, { status: 500 });
    }
    
    // 3. Ensure Role is assigned (if not already)
    const { data: existingRole } = await supabase
        .from('user_role')
        .select('id')
        .eq('user_id', member.user_id)
        .eq('koperasi_id', member.koperasi_id)
        .single();
    
    if (!existingRole) {
        await supabase.from('user_role').insert({
            user_id: member.user_id,
            member_id: member.id,
            koperasi_id: member.koperasi_id,
            role: 'anggota'
        });
    }

    return NextResponse.json({
      success: true,
      message: `Member ${member.nama_lengkap} has been approved.`,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}