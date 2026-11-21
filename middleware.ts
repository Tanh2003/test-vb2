import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  // Nếu người dùng chưa có session mà cố truy cập các trang yêu cầu đăng nhập như /profile
  if (!session && pathname.startsWith('/profile')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Nếu đã có session mà truy cập /login, /signup hoặc /register -> redirect thẳng về trang chủ /
  if (session && (pathname === '/login' || pathname === '/signup' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/profile/:path*', '/login', '/signup', '/register'],
};
