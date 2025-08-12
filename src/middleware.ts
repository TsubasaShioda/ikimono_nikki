import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const jwtSecret = process.env.JWT_SECRET;

  // Allow access to auth pages and static assets
  if (request.nextUrl.pathname.startsWith('/auth') || request.nextUrl.pathname.startsWith('/_next') || request.nextUrl.pathname.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }

  if (!token || !jwtSecret) {
    // Redirect to login if no token or secret
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  try {
    // Verify token
    verify(token, jwtSecret);
    return NextResponse.next();
  } catch (error) {
    // Redirect to login if token is invalid
    console.error('Token verification failed:', error);
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}

// Configure which paths the middleware applies to
export const config = {
  matcher: [
    '/',
    '/((?!api|_next/static|_next/image|favicon.ico).*)?',
  ],
};
