import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LogService } from '@/lib/services/log-service';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const body = await req.json();

    const logService = new LogService(supabase);
    await logService.log({
      action_type: 'SYSTEM',
      action_detail: String(body?.action_detail || 'UI_ERROR'),
      status: String(body?.status || 'WARNING') as any,
      user_id: user?.id,
      metadata: body?.metadata || {},
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

