import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  // 1. Create a Supabase Admin Client (using Service Role Key)
  // We need to bypass RLS to assign roles
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ 
      error: 'Server configuration error. Missing SUPABASE_SERVICE_ROLE_KEY.' 
    }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // 2. Get the current user from the session (using standard client)
  // We need to know WHO is calling this
  const { createClient: createServerClient } = await import('@/lib/supabase/server');
  const supabaseAuth = createServerClient();
  const { data: { user } } = await (await supabaseAuth).auth.getUser();

  if (!user) {
    return NextResponse.json({ 
      error: 'You must be logged in to run this setup.' 
    }, { status: 401 });
  }

  // 3. Get Koperasi ID
  const { data: koperasi } = await supabaseAdmin.from('koperasi').select('id').limit(1).single();
  const koperasiId = koperasi?.id || '5dbd0f3f-e591-4714-8522-2809eb9f3d33';

  // 4. Promote User to Admin
  const { error: roleError } = await supabaseAdmin
    .from('user_role')
    .upsert({
      user_id: user.id,
      koperasi_id: koperasiId,
      role: 'admin',
      is_active: true,
      permissions: ['*']
    }, { onConflict: 'user_id,koperasi_id' });

  if (roleError) {
    return NextResponse.json({ error: 'Failed to assign role', details: roleError }, { status: 500 });
  }

  // 5. Activate Member
  await supabaseAdmin
    .from('member')
    .update({ status: 'active' })
    .eq('user_id', user.id);

  return NextResponse.json({ 
    success: true, 
    message: `User ${user.email} has been promoted to ADMIN.`,
    next_step: 'Please go back to /dashboard to see the full admin view.'
  });
}
