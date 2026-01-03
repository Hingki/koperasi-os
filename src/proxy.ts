import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js Middleware for Route Protection
 * 
 * Protects routes based on authentication and roles.
 * 
 * Route patterns:
 * - /admin/* - Requires admin role
 * - /pengurus/* - Requires pengurus, ketua, or admin role
 * - /bendahara/* - Requires bendahara, ketua, or admin role
 * - /member/* - Requires authentication (any role)
 * - /api/admin/* - Requires admin role
 * - /api/pengurus/* - Requires pengurus level role
 */

// Routes that require authentication (any role)
const AUTH_REQUIRED_ROUTES = ['/member', '/api/members', '/dashboard'];

// Routes that require admin role
const ADMIN_ROUTES = ['/admin', '/api/admin'];

// Routes that require pengurus level (pengurus, ketua, admin)
const PENGURUS_ROUTES = ['/pengurus', '/api/pengurus'];

// Routes that require bendahara level (bendahara, ketua, admin)
const BENDAHARA_ROUTES = ['/bendahara', '/api/bendahara'];

// Public routes (no authentication required)
const PUBLIC_ROUTES = ['/', '/register', '/login', '/api/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes that don't need auth
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/signup')
  ) {
    return NextResponse.next();
  }

  // Create Supabase client for middleware
  // Sanitize environment variables to remove accidental quotes or whitespace
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/['"`\s]/g, '');
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/['"`\s]/g, '');

  if (!supabaseUrl || !supabaseKey) {
    // Only warn in development, but don't crash middleware
    // This allows public pages to load even if Supabase config is broken
    if (process.env.NODE_ENV === 'development') {
       console.warn('Middleware Warning: Missing Supabase Environment Variables');
    }
    
    // If it's a public route, just let it pass without auth check
    if (
      pathname === '/' || 
      pathname === '/login' || 
      pathname === '/register' ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/static')
    ) {
      return NextResponse.next();
    }
    
    // For protected routes, we can't proceed without Supabase
    return NextResponse.json(
      { error: 'Configuration Error: Missing Supabase Environment Variables' },
      { status: 500 }
    );
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Check if route requires authentication
  const requiresAuth =
    AUTH_REQUIRED_ROUTES.some((route) => pathname.startsWith(route)) ||
    ADMIN_ROUTES.some((route) => pathname.startsWith(route)) ||
    PENGURUS_ROUTES.some((route) => pathname.startsWith(route)) ||
    BENDAHARA_ROUTES.some((route) => pathname.startsWith(route));

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isApiRoute = pathname.startsWith('/api');

  // If route requires auth but user is not authenticated
  if (requiresAuth && (!user || authError)) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login first.' },
        { status: 401 }
      );
    } else {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // If route is public, allow access
  if (isPublicRoute) {
    return response;
  }

  // Check role-based access for admin routes
  if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    // Get koperasi_id from query or default (for now)
    const koperasiId =
      request.nextUrl.searchParams.get('koperasi_id') ||
      process.env.KOPERASI_ID;

    if (koperasiId) {
      const { data: adminRole } = await supabase
        .from('user_role')
        .select('role')
        .eq('user_id', user!.id)
        .eq('koperasi_id', koperasiId)
        .in('role', ['admin', 'wakil_ketua_usaha', 'wakil_ketua_keanggotaan'])
        .eq('is_active', true)
        .is('deleted_at', null)
        .limit(1)
        .single();

      if (!adminRole) {
        return NextResponse.json(
          { error: 'Forbidden. Admin role required.' },
          { status: 403 }
        );
      }
    }
  }

  // Check role-based access for pengurus routes
  if (PENGURUS_ROUTES.some((route) => pathname.startsWith(route))) {
    const koperasiId =
      request.nextUrl.searchParams.get('koperasi_id') ||
      process.env.KOPERASI_ID;

    if (koperasiId) {
      const { data: pengurusRole } = await supabase
        .from('user_role')
        .select('role')
        .eq('user_id', user!.id)
        .eq('koperasi_id', koperasiId)
        .in('role', ['admin', 'ketua', 'pengurus', 'wakil_ketua_usaha', 'wakil_ketua_keanggotaan'])
        .eq('is_active', true)
        .is('deleted_at', null)
        .limit(1)
        .single();

      if (!pengurusRole) {
        return NextResponse.json(
          { error: 'Forbidden. Pengurus role required.' },
          { status: 403 }
        );
      }
    }
  }

  // Check role-based access for bendahara routes
  if (BENDAHARA_ROUTES.some((route) => pathname.startsWith(route))) {
    const koperasiId =
      request.nextUrl.searchParams.get('koperasi_id') ||
      process.env.KOPERASI_ID;

    if (koperasiId) {
      const { data: bendaharaRole } = await supabase
        .from('user_role')
        .select('role')
        .eq('user_id', user!.id)
        .eq('koperasi_id', koperasiId)
        .in('role', ['admin', 'ketua', 'bendahara'])
        .eq('is_active', true)
        .is('deleted_at', null)
        .limit(1)
        .single();

      if (!bendaharaRole) {
        return NextResponse.json(
          { error: 'Forbidden. Bendahara role required.' },
          { status: 403 }
        );
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
