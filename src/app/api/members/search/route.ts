import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  const supabase = await createClient();
  
  // Basic search: exact match for ID or partial for name
  // Using ilike for case-insensitive search
  const { data, error } = await supabase
    .from('member')
    .select('id, nomor_anggota, nama_lengkap')
    .or(`nomor_anggota.ilike.%${query}%,nama_lengkap.ilike.%${query}%`)
    .eq('status', 'active') // Only active members
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
