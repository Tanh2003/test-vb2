import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp đầy đủ email và mã OTP.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    if (cleanOtp.length !== 6) {
      return NextResponse.json(
        { error: 'Mã OTP phải bao gồm đúng 6 chữ số.' },
        { status: 400 }
      );
    }

    // 1. Tìm bản ghi OTP trong Firestore
    const otpDocRef = adminDb.collection('otp_verifications').doc(normalizedEmail);
    const otpDoc = await otpDocRef.get();

    if (!otpDoc.exists) {
      return NextResponse.json(
        { error: 'Mã xác thực không tồn tại hoặc đã hết hạn. Vui lòng gửi lại mã mới.' },
        { status: 400 }
      );
    }

    const data = otpDoc.data()!;
    const attempts = data.attempts || 0;

    // 2. Kiểm tra số lần nhập sai (tối đa 5 lần)
    if (attempts >= 5) {
      await otpDocRef.delete();
      return NextResponse.json(
        { error: 'Bạn đã nhập sai mã OTP quá 5 lần. Mã này đã bị vô hiệu hoá vì lý do an toàn, vui lòng yêu cầu mã mới.' },
        { status: 400 }
      );
    }

    // 3. Kiểm tra thời hạn hiệu lực (5 phút)
    if (Date.now() > data.expiresAt) {
      await otpDocRef.delete();
      return NextResponse.json(
        { error: 'Mã xác thực OTP đã hết hạn (chỉ có hiệu lực trong 5 phút). Vui lòng bấm gửi lại mã.' },
        { status: 400 }
      );
    }

    // 4. So khớp mã băm SHA-256
    const inputHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');

    if (inputHash !== data.otpHash) {
      const newAttempts = attempts + 1;
      const remainingAttempts = 5 - newAttempts;

      if (remainingAttempts <= 0) {
        await otpDocRef.delete();
        return NextResponse.json(
          { error: 'Mã OTP không chính xác. Bạn đã hết 5 lần thử, vui lòng yêu cầu mã mới.' },
          { status: 400 }
        );
      } else {
        await otpDocRef.update({ attempts: newAttempts });
        return NextResponse.json(
          { error: `Mã OTP không chính xác. Bạn còn ${remainingAttempts} lần thử.` },
          { status: 400 }
        );
      }
    }

    // 5. Xác thực thành công -> Tạo tài khoản người dùng trong Firebase Authentication
    const userData = data.userData;
    let userRecord;

    try {
      userRecord = await adminAuth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.username,
      });
    } catch (authError: any) {
      if (authError.code === 'auth/email-already-exists') {
        userRecord = await adminAuth.getUserByEmail(userData.email);
        await adminAuth.updateUser(userRecord.uid, {
          password: userData.password,
          displayName: userData.username,
        });
      } else {
        throw authError;
      }
    }

    // 6. Lưu hồ sơ người dùng vào collection `users` trong Firestore với trạng thái isVerified = true
    const nowIso = new Date().toISOString();
    const userProfile = {
      uid: userRecord.uid,
      email: userData.email,
      username: userData.username,
      fullName: userData.username,
      sbd: userData.username.toUpperCase(),
      phone: userData.phone || '',
      role: 'candidate',
      isVerified: true,
      emailVerified: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await adminDb.collection('users').doc(userRecord.uid).set(userProfile, { merge: true });

    // 7. Xoá bản ghi OTP sau khi đã sử dụng thành công
    await otpDocRef.delete();

    // 8. Tạo Custom Token để Client tự động đăng nhập tức thì
    const customToken = await adminAuth.createCustomToken(userRecord.uid);

    return NextResponse.json({
      success: true,
      message: 'Xác thực email và tạo tài khoản thành công!',
      customToken,
      user: userProfile,
    });
  } catch (error: any) {
    console.error('Lỗi API verify-otp:', error);
    return NextResponse.json(
      { error: error?.message || 'Có lỗi xảy ra khi xác thực mã OTP.' },
      { status: 500 }
    );
  }
}
