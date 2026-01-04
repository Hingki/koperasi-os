import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
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

    // Get Query Params
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // 'pending', 'active', 'rejected', 'all'
    const search = searchParams.get('search'); // Name or NIK

    // Build Query
    let query = supabase
      .from('member')
      .select('id, nama_lengkap, nik, phone, alamat_lengkap, status, created_at, nomor_anggota')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`nama_lengkap.ilike.%${search}%,nik.ilike.%${search}%`);
    }

    const { data: members, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching members:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
