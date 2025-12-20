import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRoles } from '@/lib/auth/roles';

/**
 * GET /api/auth/roles
 * 
 * Get all active roles for the current authenticated user.
 * 
 * Query parameters:
 * - koperasi_id (optional): Filter roles by koperasi_id
 * 
 * Returns:
 * - 200: Array of user roles
 * - 401: Unauthorized
 */
export async function GET(request: NextRequest) {
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

    // 2. Get koperasi_id from query params (optional)
    const { searchParams } = new URL(request.url);
    const koperasiId = searchParams.get('koperasi_id') || undefined;

    // 3. Get user roles
    const roles = await getUserRoles(koperasiId);

    // 4. Return roles
    return NextResponse.json(
      {
        success: true,
        data: roles,
        count: roles.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Only allow GET method
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET to retrieve roles.' },
    { status: 405 }
  );
}



