import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Match pages that require authentication
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     * - register (register page)
     * - api/auth/session (session establishment API)
     * - api/auth/logout (logout API)
     * - $ (root path redirect handled client-side)
     */
    '/((?!_next/static|_next/image|favicon.ico|login|register|api/auth/session|api/auth/logout|$).*)',
  ],
};

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('__session')?.value;
  const { pathname } = request.nextUrl;

  let isValid = false;
  let decodedPayload: any = null;

  if (sessionCookie) {
    decodedPayload = parseJwt(sessionCookie);
    if (decodedPayload) {
      const now = Math.floor(Date.now() / 1000);
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-7140172946-dab17';
      const expectedIssuer = `https://securetoken.google.com/${projectId}`;

      const isExpired = decodedPayload.exp && decodedPayload.exp < now;
      const isInvalidIssuer = decodedPayload.iss !== expectedIssuer;
      const isInvalidAudience = decodedPayload.aud !== projectId;

      if (!isExpired && !isInvalidIssuer && !isInvalidAudience) {
        isValid = true;
      }
    }
  }

  // 1. If the session is invalid or missing, protect route
  if (!isValid) {
    // If it's an API route request, return standard JSON unauthorized response
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized. Secure session is required.' },
        { status: 401 }
      );
    }

    // Otherwise redirect browser to login page
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    
    // Clear out invalid session cookie if it exists
    if (sessionCookie) {
      response.cookies.delete('__session');
    }
    return response;
  }

  // 2. Role-based Access Control (RBAC) Page Guards
  const role = decodedPayload.role;

  // Protect Admin Panel path
  if (pathname.startsWith('/admin')) {
    if (role !== 'Admin' && role !== 'admin') {
      // Not authorized for Admin Panel — redirect to dashboard
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}
