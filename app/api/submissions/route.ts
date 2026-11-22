import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { SubmissionResult } from '@/types/exam';

const FIREBASE_DB_URL =
  'https://exam-vb2-default-rtdb.asia-southeast1.firebasedatabase.app';

// Helper: Lấy userId từ Session Cookie
async function getSessionUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (sessionCookie) {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      return decoded.uid;
    }
  } catch {
    // Không có session cookie hợp lệ
  }
  return null;
}

// 1. Lấy kết quả bài thi hoặc lịch sử thi từ Firebase Realtime Database & Firestore
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get('id');
    const queryUserId = searchParams.get('userId') || searchParams.get('candidateId');
    const sessionUserId = await getSessionUserId();
    const activeUserId = queryUserId || sessionUserId;

    // A. Lấy 1 kết quả cụ thể
    if (submissionId) {
      const res = await fetch(`${FIREBASE_DB_URL}/submissions/${submissionId}.json`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data) {
          return NextResponse.json(data);
        }
      }

      // Dự phòng Firestore nếu RTDB không có
      try {
        if (adminDb) {
          const doc = await adminDb.collection('submissions').doc(submissionId).get();
          if (doc.exists) {
            return NextResponse.json({ id: doc.id, ...doc.data() });
          }
        }
      } catch (fsErr) {
        console.warn('Lỗi đọc Firestore dự phòng:', fsErr);
      }

      return NextResponse.json({ error: 'Không tìm thấy kết quả bài thi' }, { status: 404 });
    }

    // B. Lấy danh sách lịch sử làm đề từ Firebase RTDB
    const res = await fetch(`${FIREBASE_DB_URL}/submissions.json`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });

    let list: SubmissionResult[] = [];

    if (res.ok) {
      const all = await res.json();
      if (all && typeof all === 'object') {
        list = Object.keys(all).map((key) => ({
          ...all[key],
          id: all[key].id || key,
        }));
      }
    }

    // Nếu RTDB rỗng, thử đọc từ Firestore
    if (list.length === 0 && adminDb) {
      try {
        let q = adminDb.collection('submissions').limit(50);
        if (activeUserId) {
          q = adminDb.collection('submissions').where('candidateId', '==', activeUserId).limit(50);
        }
        const snap = await q.get();
        list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      } catch (fsErr) {
        console.warn('Lỗi đọc Firestore:', fsErr);
      }
    }

    // Lọc theo người dùng nếu có định danh
    if (activeUserId) {
      const target = activeUserId.toLowerCase().trim();
      list = list.filter((sub) => {
        const cId = (sub.candidateId || '').toLowerCase().trim();
        const uId = ((sub as any).userId || '').toLowerCase().trim();
        const sbd = (sub.sbd || '').toLowerCase().trim();
        const email = ((sub as any).email || (sub as any).candidateEmail || '').toLowerCase().trim();
        return cId === target || uId === target || sbd === target || email === target;
      });
    }

    // Sắp xếp bài thi mới nhất lên đầu
    list.sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    return NextResponse.json(list);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Lỗi lấy bài thi từ Firebase:', msg);
    return NextResponse.json([]);
  }
}

// 2. Lưu kết quả nộp bài và chấm điểm vào Firebase
export async function POST(req: NextRequest) {
  try {
    const body: SubmissionResult = await req.json();
    const sessionUserId = await getSessionUserId();

    const submissionId = body.id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const effectiveUserId = sessionUserId || body.candidateId || (body as any).userId || 'cand_vb2';

    const payload: SubmissionResult = {
      ...body,
      id: submissionId,
      candidateId: effectiveUserId,
      userId: effectiveUserId,
      submittedAt: body.submittedAt || new Date().toISOString(),
      savedToFirebase: true,
      syncedAt: new Date().toISOString(),
    } as any;

    // Lưu vào Firebase Realtime Database
    const res = await fetch(`${FIREBASE_DB_URL}/submissions/${submissionId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`Firebase RTDB status: ${res.status}`);
    }

    // Đồng bộ dự phòng vào Firestore
    try {
      if (adminDb && effectiveUserId) {
        await adminDb.collection('submissions').doc(submissionId).set(payload);
      }
    } catch (fsErr) {
      console.warn('Lỗi Firestore dự phòng bài thi:', fsErr);
    }

    return NextResponse.json({
      success: true,
      id: submissionId,
      candidateId: effectiveUserId,
      savedToFirebase: true,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Lỗi lưu bài nộp lên Firebase:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 3. Xoá bài làm khỏi lịch sử Firebase
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get('id');

    if (!submissionId) {
      return NextResponse.json({ error: 'Thiếu mã bài nộp cần xoá' }, { status: 400 });
    }

    const res = await fetch(`${FIREBASE_DB_URL}/submissions/${submissionId}.json`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      throw new Error(`Firebase RTDB delete status: ${res.status}`);
    }

    try {
      if (adminDb) {
        await adminDb.collection('submissions').doc(submissionId).delete();
      }
    } catch (fsErr) {
      console.warn('Lỗi Firestore xoá submission:', fsErr);
    }

    return NextResponse.json({ success: true, id: submissionId });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Lỗi xoá bài thi:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
