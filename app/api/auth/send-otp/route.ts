import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { sendOtpEmail } from '@/lib/mailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, username, password, phone } = body;

    // 1. Kiểm tra tính hợp lệ của dữ liệu đầu vào
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp đầy đủ Tên tài khoản, Gmail và Mật khẩu.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Địa chỉ Gmail không đúng định dạng. Vui lòng kiểm tra lại.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.' },
        { status: 400 }
      );
    }

    // 2. Kiểm tra tài khoản đã tồn tại trên Firebase Authentication chưa
    try {
      const existingUser = await adminAuth.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email này đã được đăng ký tài khoản. Vui lòng đăng nhập hoặc sử dụng email khác.' },
          { status: 400 }
        );
      }
    } catch (e: any) {
      // Nếu lỗi là 'auth/user-not-found' thì email chưa được dùng -> hợp lệ để đăng ký mới
      if (e.code !== 'auth/user-not-found') {
        console.warn('Lỗi kiểm tra user trên Firebase Auth:', e.message);
      }
    }

    // 3. Cơ chế Rate Limit: Chống spam gửi mã liên tục (giới hạn 60 giây giữa mỗi lần gửi)
    const otpDocRef = adminDb.collection('otp_verifications').doc(normalizedEmail);
    const existingOtpDoc = await otpDocRef.get();

    if (existingOtpDoc.exists) {
      const data = existingOtpDoc.data();
      const lastCreatedAt = data?.createdAt || 0;
      const elapsed = Date.now() - lastCreatedAt;

      if (elapsed < 60 * 1000) {
        const waitSeconds = Math.ceil((60 * 1000 - elapsed) / 1000);
        return NextResponse.json(
          { error: `Vui lòng đợi ${waitSeconds} giây nữa trước khi yêu cầu gửi lại mã OTP.` },
          { status: 429 }
        );
      }
    }

    // 4. Tạo mã OTP ngẫu nhiên 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 5. Băm mã OTP bằng SHA-256 trước khi lưu vào Firestore để đảm bảo an toàn bảo mật
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // Thời gian hết hạn là 5 phút kể từ thời điểm gửi
    const expiresAt = Date.now() + 5 * 60 * 1000;

    // 6. Lưu vào collection otp_verifications trong Firestore
    await otpDocRef.set({
      email: normalizedEmail,
      otpHash,
      expiresAt,
      attempts: 0,
      createdAt: Date.now(),
      userData: {
        username: username.trim(),
        email: normalizedEmail,
        password,
        phone: (phone || '').trim(),
      },
    });

    // 7. Gửi mã OTP tới hòm thư Gmail của thí sinh
    await sendOtpEmail(normalizedEmail, otp);

    return NextResponse.json({
      success: true,
      message: 'Mã xác thực OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
    });
  } catch (error: any) {
    console.error('Lỗi API send-otp:', error);
    return NextResponse.json(
      { error: error?.message || 'Có lỗi xảy ra khi gửi mã OTP. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
