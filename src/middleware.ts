import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PREFIXES = ['/login', '/api/auth/login', '/api/auth/logout', '/api/auth/verify', '/api/auth/seed-viewer', '/_next', '/favicon', '/IGS-logo'];

function decodeSessionEdge(token: string): { role?: string; exp?: number } | null {
  try {
    const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const padding = (4 - (base64.length % 4)) % 4;
    const padded = base64 + '='.repeat(padding);
    const json = atob(padded);
    const payload = JSON.parse(json);
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    PUBLIC_PREFIXES.some(p => pathname.startsWith(p)) ||
    /\.[a-zA-Z0-9]+$/.test(pathname);

  if (isPublic) return NextResponse.next();

  const sessionToken = request.cookies.get('igs-session')?.value;
  const session = sessionToken ? decodeSessionEdge(sessionToken) : null;
  const legacyAuth = request.cookies.get('igs-auth')?.value === 'authenticated';
  const isAuthenticated = !!session || legacyAuth;

  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname.startsWith('/admin/tenants') || pathname.startsWith('/api/admin/tenants')) {
    if (session?.role !== 'super_admin') {
      if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      return NextResponse.redirect(new URL('/', request.url));
    }
  } else if (pathname.startsWith('/admin/users') || pathname.startsWith('/api/admin/users')) {
    if (session?.role !== 'admin' && session?.role !== 'super_admin') {
      if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      return NextResponse.redirect(new URL('/', request.url));
    }
  } else if (pathname.startsWith('/admin')) {
    if (session?.role !== 'admin' && session?.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
