import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json(
        { error: 'idToken is required' },
        { status: 400 }
      );
    }

    // 1. Xác minh token và lấy thông tin user
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    // 2. Kiểm tra trong Firestore collection 'users' theo document ID là uid
    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const now = new Date().toISOString();

    if (!userDoc.exists) {
      await userRef.set({
        uid,
        email: email || '',
        name: name || '',
        avatar: picture || '',
        role: 'user',
        createdAt: now,
        lastLoginAt: now,
      });
    } else {
      await userRef.update({
        lastLoginAt: now,
      });
    }

    // 3. Tạo Session Cookie với thời hạn 5 ngày
    const expiresIn = 5 * 24 * 60 * 60 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    // 4. Set cookie 'session' vào response với các cờ bảo mật
    const response = NextResponse.json({
      success: true,
      user: {
        uid,
        email: email || '',
        name: name || '',
        avatar: picture || '',
      },
    });

    response.cookies.set({
      name: 'session',
      value: sessionCookie,
      maxAge: Math.floor(expiresIn / 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Error in /api/auth/login:', error);
    return NextResponse.json(
      { error: error?.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
