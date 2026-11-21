import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken, account, password, username, phone } = body;

    const expiresIn = 5 * 24 * 60 * 60 * 1000;
    const apiKey =
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
      'AIzaSyAa-2mOkb4iZ_uWRaL9a_vKMs6V7ZJsunQ';

    // =========================================================================
    // TRƯỜNG HỢP 1: ĐĂNG NHẬP BẰNG TÀI KHOẢN (GMAIL / USERNAME) VÀ MẬT KHẨU
    // =========================================================================
    if (account && password) {
      const trimmedAccount = account.trim();
      let matchedUid: string | null = null;
      let userData: any = null;

      // 1.1 Tìm trong Firestore theo Email
      const emailSnap = await adminDb
        .collection('users')
        .where('email', '==', trimmedAccount)
        .limit(1)
        .get();

      if (!emailSnap.empty) {
        matchedUid = emailSnap.docs[0].id;
        userData = emailSnap.docs[0].data();
      }

      // 1.2 Nếu chưa thấy, tìm trong Firestore theo Username
      if (!matchedUid) {
        const usernameSnap = await adminDb
          .collection('users')
          .where('username', '==', trimmedAccount)
          .limit(1)
          .get();

        if (!usernameSnap.empty) {
          matchedUid = usernameSnap.docs[0].id;
          userData = usernameSnap.docs[0].data();
        }
      }

      // 1.3 Nếu chưa thấy, tìm trong Firestore theo Số báo danh (SBD)
      if (!matchedUid) {
        const sbdSnap = await adminDb
          .collection('users')
          .where('sbd', '==', trimmedAccount.toUpperCase())
          .limit(1)
          .get();

        if (!sbdSnap.empty) {
          matchedUid = sbdSnap.docs[0].id;
          userData = sbdSnap.docs[0].data();
        }
      }

      // 1.4 Tìm dự phòng trong Realtime Database nếu Firestore chưa đồng bộ
      if (!matchedUid) {
        const rtdbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
        if (rtdbUrl) {
          try {
            const rtdbRes = await fetch(`${rtdbUrl}/users.json`, {
              signal: AbortSignal.timeout(3000),
            });
            if (rtdbRes.ok) {
              const allUsers = await rtdbRes.json();
              if (allUsers) {
                for (const key of Object.keys(allUsers)) {
                  const u = allUsers[key];
                  if (
                    u.email?.toLowerCase() === trimmedAccount.toLowerCase() ||
                    u.username?.toLowerCase() === trimmedAccount.toLowerCase() ||
                    u.sbd?.toUpperCase() === trimmedAccount.toUpperCase()
                  ) {
                    matchedUid = key;
                    userData = u;
                    break;
                  }
                }
              }
            }
          } catch (rtdbErr) {
            console.warn('RTDB search warning:', rtdbErr);
          }
        }
      }

      // 1.5 Tìm trong Firebase Authentication nếu vẫn chưa thấy
      if (!matchedUid && trimmedAccount.includes('@')) {
        try {
          const authUser = await adminAuth.getUserByEmail(trimmedAccount);
          matchedUid = authUser.uid;
        } catch {}
      }

      if (!matchedUid) {
        return NextResponse.json(
          { error: 'Tài khoản không tồn tại trên hệ thống. Vui lòng kiểm tra lại hoặc Đăng ký.' },
          { status: 404 }
        );
      }

      // 1.6 Kiểm tra mật khẩu
      let isPasswordCorrect = false;

      // Ưu tiên 1: So sánh trực tiếp mật khẩu đã lưu trong database của Firebase
      if (userData && userData.password) {
        if (userData.password === password) {
          isPasswordCorrect = true;
        } else {
          return NextResponse.json(
            { error: 'Mật khẩu không chính xác. Vui lòng kiểm tra lại.' },
            { status: 401 }
          );
        }
      }

      // Ưu tiên 2: Xác thực qua Firebase Auth REST API (nếu chưa so sánh được)
      let resolvedIdToken: string | null = null;
      if (!isPasswordCorrect && userData?.email) {
        try {
          const verifyRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: userData.email,
                password,
                returnSecureToken: true,
              }),
            }
          );
          const verifyData = await verifyRes.json();
          if (verifyRes.ok) {
            isPasswordCorrect = true;
            resolvedIdToken = verifyData.idToken;
          }
        } catch (apiErr) {
          console.warn('Identity toolkit verify warning:', apiErr);
        }
      }

      if (!isPasswordCorrect && !userData?.password) {
        return NextResponse.json(
          { error: 'Tên tài khoản hoặc mật khẩu không chính xác.' },
          { status: 401 }
        );
      }

      // 1.7 Chuẩn bị dữ liệu trả về và cập nhật lastLoginAt
      const now = new Date().toISOString();
      const finalUser = {
        uid: matchedUid,
        username: userData?.username || trimmedAccount,
        fullName: userData?.fullName || userData?.username || 'Đồng chí Thí sinh',
        email: userData?.email || (trimmedAccount.includes('@') ? trimmedAccount : ''),
        phone: userData?.phone || '',
        role: userData?.role || 'user',
        sbd: userData?.sbd || (userData?.username || trimmedAccount).toUpperCase(),
        examCode: userData?.examCode || 'CA1',
        freeUploadsRemaining: userData?.freeUploadsRemaining ?? 2,
        lastLoginAt: now,
      };

      // Cập nhật lastLoginAt vào Firestore
      try {
        await adminDb.collection('users').doc(matchedUid).set(
          { lastLoginAt: now },
          { merge: true }
        );
      } catch {}

      // 1.8 Tạo Session Cookie an toàn
      let sessionCookieValue = '';
      try {
        if (!resolvedIdToken) {
          // Tạo Custom Token rồi đổi sang ID Token qua REST API
          const customToken = await adminAuth.createCustomToken(matchedUid);
          const tokenExchangeRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: customToken,
                returnSecureToken: true,
              }),
            }
          );
          if (tokenExchangeRes.ok) {
            const tokenData = await tokenExchangeRes.json();
            resolvedIdToken = tokenData.idToken;
          }
        }

        if (resolvedIdToken) {
          sessionCookieValue = await adminAuth.createSessionCookie(resolvedIdToken, { expiresIn });
        }
      } catch (cookieErr) {
        console.warn('Session cookie warning, fallback session:', cookieErr);
      }

      if (!sessionCookieValue) {
        // Fallback tạo token định danh phiên
        sessionCookieValue = await adminAuth.createCustomToken(matchedUid);
      }

      const response = NextResponse.json({
        success: true,
        user: finalUser,
      });

      response.cookies.set({
        name: 'session',
        value: sessionCookieValue,
        maxAge: Math.floor(expiresIn / 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      return response;
    }

    // =========================================================================
    // TRƯỜNG HỢP 2: ĐĂNG NHẬP BẰNG ID TOKEN (GOOGLE HOẶC CLIENT TOKEN)
    // =========================================================================
    if (idToken) {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const userEmail = decodedToken.email || '';
      const userName = decodedToken.name || '';
      const userAvatar = decodedToken.picture || '';

      const userRef = adminDb.collection('users').doc(uid);
      const userDoc = await userRef.get();
      const now = new Date().toISOString();

      let fullUserData;
      if (!userDoc.exists) {
        const displayName = userName || username || (userEmail ? userEmail.split('@')[0] : 'Thí sinh');
        const sbdCode = (username || userEmail || uid).split('@')[0].toUpperCase();
        fullUserData = {
          uid,
          email: userEmail,
          name: displayName,
          fullName: displayName,
          username: username || (userEmail ? userEmail.split('@')[0] : ''),
          phone: phone || '',
          avatar: userAvatar,
          role: 'user',
          sbd: sbdCode,
          examCode: 'CA1',
          freeUploadsRemaining: 2,
          createdAt: now,
          lastLoginAt: now,
        };
        await userRef.set(fullUserData);
      } else {
        fullUserData = {
          ...userDoc.data(),
          lastLoginAt: now,
        };
        await userRef.update({ lastLoginAt: now });
      }

      const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

      const response = NextResponse.json({
        success: true,
        user: fullUserData,
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
    }

    return NextResponse.json(
      { error: 'Vui lòng cung cấp đầy đủ thông tin đăng nhập.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error in /api/auth/login:', error);
    return NextResponse.json(
      { error: error?.message || 'Đăng nhập không thành công.' },
      { status: 500 }
    );
  }
}
