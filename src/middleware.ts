import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const jwtSecret = process.env.JWT_SECRET;

  // 認証が不要なパスを定義
  const publicPaths = [
    '/',
    '/auth',
    '/api/entries/search',
    '/api/categories',
    '/api/auth/me', // ゲストでもユーザー情報を取得するため
  ];

  // パスがpublicPathsのいずれかで始まるか、またはNext.jsの内部パスかチェック
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path));

  if (isPublicPath || request.nextUrl.pathname.startsWith('/_next') || request.nextUrl.pathname.startsWith('/favicon.ico')) {
    return NextResponse.next();
  }

  // 上記以外でトークンがない場合はログインページへリダイレクト
  if (!token || !jwtSecret) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  try {
    // トークンを検証
    await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    return NextResponse.next();
  } catch (error) {
    // 検証失敗、ログインページへリダイレクトし、不正なトークンを削除
    console.error('Token verification failed:', error);
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    response.cookies.delete('token');
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)?',
  ],
};
