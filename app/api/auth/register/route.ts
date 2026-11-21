import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, email, password, phone } = body;

    // 1. Kiểm tra tính hợp lệ của dữ liệu đầu vào
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp đầy đủ Tên tài khoản, Gmail và Mật khẩu.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.' },
        { status: 400 }
      );
    }

    // 2. Kiểm tra tài khoản/email đã tồn tại trên Firebase Auth chưa
    let existingUid: string | null = null;
    try {
      const existingUser = await adminAuth.getUserByEmail(email);
      if (existingUser) {
        existingUid = existingUser.uid;
      }
    } catch (e: any) {
      if (e.code !== 'auth/user-not-found') {
        console.warn('Check existing user warning:', e.message);
      }
    }

    // 3. Tạo hoặc lấy tài khoản trong Firebase Authentication
    let userUid = existingUid;
    if (!userUid) {
      const userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: username,
      });
      userUid = userRecord.uid;
    } else {
      // Cập nhật lại mật khẩu và tên hiển thị nếu tài khoản đã tồn tại
      await adminAuth.updateUser(userUid, {
        password,
        displayName: username,
      });
    }

    const now = new Date().toISOString();
    // Đối tượng dữ liệu đầy đủ bao gồm MẬT KHẨU lưu vào CSDL
    const userData = {
      uid: userUid,
      username,
      fullName: username,
      email,
      password, // Lưu mật khẩu trực tiếp vào Firestore & Realtime DB
      phone: phone || '',
      role: 'user',
      sbd: username.toUpperCase(),
      examCode: 'CA1',
      freeUploadsRemaining: 2,
      createdAt: now,
      lastLoginAt: now,
    };

    // 4. Lưu hồ sơ người dùng vào Firestore collection 'users'
    await adminDb.collection('users').doc(userUid).set(userData, { merge: true });

    // 5. Lưu đồng bộ vào Firebase Realtime Database
    const rtdbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
    if (rtdbUrl) {
      try {
        await fetch(`${rtdbUrl}/users/${userUid}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
          signal: AbortSignal.timeout(4000),
        });
      } catch (rtdbErr) {
        console.warn('RTDB backup write warning:', rtdbErr);
      }
    }

    // 6. Tạo Custom Token để Client SDK tự động đăng nhập và tạo phiên
    const customToken = await adminAuth.createCustomToken(userUid);

    return NextResponse.json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      user: userData,
      customToken,
    });
  } catch (error: any) {
    console.error('Registration API Error:', error);
    let errorMessage = 'Đăng ký thất bại. Vui lòng thử lại sau.';
    if (error?.code === 'auth/email-already-exists') {
      errorMessage = 'Gmail này đã được sử dụng.';
    } else if (error?.code === 'auth/invalid-email') {
      errorMessage = 'Địa chỉ Gmail không đúng định dạng.';
    }
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
