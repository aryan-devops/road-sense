import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PROTECTED_PATHS = ['/dashboard', '/simulation', '/scenarios', '/perception', '/prediction', '/path-planning', '/collision-avoidance', '/analytics', '/history', '/reports', '/datasets', '/profile', '/settings', '/admin'];
const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If Supabase is not configured, allow demo mode
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // In demo mode, protect admin routes but allow everything else
    return NextResponse.next();
  }

  const { supabaseResponse, user } = await updateSession(request);

  const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p));
  const isAuthPath = AUTH_PATHS.some(p => pathname.startsWith(p));

  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthPath && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|public/).*)'],
};
