import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

const RTDB_URL =
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
  'https://exam-vb2-default-rtdb.asia-southeast1.firebasedatabase.app';

// GET: Tải thông tin người dùng từ Firebase
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let targetUid = searchParams.get('uid');
    let targetEmail = searchParams.get('email');

    // 1. Thử đọc từ Session Cookie nếu không truyền query
    if (!targetUid && !targetEmail) {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('session')?.value;
      if (sessionCookie) {
        try {
          const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
          targetUid = decoded.uid;
          targetEmail = decoded.email || null;
        } catch {}
      }
    }

    let userDoc: any = null;

    // 2. Tìm theo UID trong Firestore
    if (targetUid) {
      const docSnap = await adminDb.collection('users').doc(targetUid).get();
      if (docSnap.exists) {
        userDoc = { uid: targetUid, ...docSnap.data() };
      }
    }

    // 3. Tìm theo Email trong Firestore
    if (!userDoc && targetEmail) {
      const snap = await adminDb
        .collection('users')
        .where('email', '==', targetEmail.trim())
        .limit(1)
        .get();
      if (!snap.empty) {
        userDoc = { uid: snap.docs[0].id, ...snap.docs[0].data() };
        targetUid = snap.docs[0].id;
      }
    }

    // 4. Tìm trong Realtime Database nếu Firestore chưa có
    if (!userDoc) {
      try {
        const rtdbRes = await fetch(`${RTDB_URL}/users.json`, { signal: AbortSignal.timeout(3000) });
        if (rtdbRes.ok) {
          const allUsers = await rtdbRes.json();
          if (allUsers) {
            for (const key of Object.keys(allUsers)) {
              const u = allUsers[key];
              if (
                (targetEmail && u.email?.toLowerCase() === targetEmail.trim().toLowerCase()) ||
                (targetUid && key === targetUid)
              ) {
                userDoc = { uid: key, ...u };
                targetUid = key;
                break;
              }
            }
          }
        }
      } catch {}
    }

    // 5. Tìm trong Firebase Auth nếu chưa có trong database
    if (!userDoc && targetEmail) {
      try {
        const authUser = await adminAuth.getUserByEmail(targetEmail.trim());
        if (authUser) {
          userDoc = {
            uid: authUser.uid,
            email: authUser.email,
            fullName: authUser.displayName || 'Thí sinh',
            username: authUser.displayName || targetEmail.split('@')[0],
            phone: authUser.phoneNumber || '',
            sbd: (authUser.displayName || targetEmail).split('@')[0].toUpperCase(),
            examCode: 'CA1',
            freeUploadsRemaining: 2,
          };
          targetUid = authUser.uid;
        }
      } catch {}
    }

    if (!userDoc) {
      return NextResponse.json(
        { error: 'Không tìm thấy hồ sơ người dùng trong Firebase.' },
        { status: 404 }
      );
    }

    const { password, ...safeUserData } = userDoc;

    return NextResponse.json({
      success: true,
      user: safeUserData,
    });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi khi tải thông tin tài khoản.' },
      { status: 500 }
    );
  }
}

// PUT: Cập nhật thông tin người dùng vào Firebase (Firestore & Realtime Database)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { uid, email, username, fullName, phone, sbd, examCode } = body;

    let targetUid = uid;
    const cleanEmail = email ? email.trim() : '';

    // 1. Tìm targetUid qua Firebase Auth
    if (!targetUid && cleanEmail) {
      try {
        const authUser = await adminAuth.getUserByEmail(cleanEmail);
        if (authUser) {
          targetUid = authUser.uid;
        }
      } catch {}
    }

    // 2. Tìm targetUid qua Firestore theo email
    if (!targetUid && cleanEmail) {
      const snap = await adminDb
        .collection('users')
        .where('email', '==', cleanEmail)
        .limit(1)
        .get();
      if (!snap.empty) {
        targetUid = snap.docs[0].id;
      }
    }

    // 3. Tìm targetUid qua Firestore theo username
    if (!targetUid && (username || fullName)) {
      const nameToSearch = (username || fullName).trim();
      const snap = await adminDb
        .collection('users')
        .where('username', '==', nameToSearch)
        .limit(1)
        .get();
      if (!snap.empty) {
        targetUid = snap.docs[0].id;
      }
    }

    // 4. Tìm targetUid qua Session Cookie
    if (!targetUid) {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('session')?.value;
      if (sessionCookie) {
        try {
          const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
          targetUid = decoded.uid;
        } catch {}
      }
    }

    // 5. Dự phòng an toàn: nếu vẫn chưa có UID, tạo UID định danh theo email
    if (!targetUid) {
      targetUid = cleanEmail
        ? cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_')
        : `user_${Date.now()}`;
    }

    const now = new Date().toISOString();
    const displayName = fullName || username || 'Thí sinh';
    const sbdCode = sbd ? sbd.trim().toUpperCase() : displayName.toUpperCase();

    const updatePayload: Record<string, any> = {
      uid: targetUid,
      fullName: displayName,
      name: displayName,
      username: username || displayName,
      email: cleanEmail,
      phone: phone !== undefined ? phone.trim() : '',
      sbd: sbdCode,
      examCode: examCode || 'CA1',
      updatedAt: now,
    };

    // A. CẬP NHẬT TRỰC TIẾP VÀO FIRESTORE (Collection 'users')
    const userRef = adminDb.collection('users').doc(targetUid);
    await userRef.set(updatePayload, { merge: true });

    // B. ĐỒNG BỘ TRỰC TIẾP VÀO FIREBASE REALTIME DATABASE (users/{targetUid}.json)
    try {
      const rtdbRes = await fetch(`${RTDB_URL}/users/${targetUid}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
        signal: AbortSignal.timeout(4000),
      });
      if (!rtdbRes.ok) {
        console.warn('RTDB write response not ok:', rtdbRes.status);
      }
    } catch (rtdbErr) {
      console.warn('RTDB update sync warning:', rtdbErr);
    }

    // C. CẬP NHẬT TÊN HIỂN THỊ TRÊN FIREBASE AUTH NẾU ĐÃ CÓ AUTH USER
    try {
      await adminAuth.updateUser(targetUid, {
        displayName: displayName,
      });
    } catch {}

    // Lấy dữ liệu mới nhất sau khi merge
    const finalSnap = await userRef.get();
    const finalData = finalSnap.data() || updatePayload;
    const { password, ...safeUserData } = finalData;

    return NextResponse.json({
      success: true,
      message: 'Đã lưu thông tin thành công vào Firebase!',
      user: safeUserData,
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: error?.message || 'Cập nhật thông tin thất bại.' },
      { status: 500 }
    );
  }
}
