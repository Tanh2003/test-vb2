import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { SubmissionResult } from '@/types/exam';

const FIREBASE_DB_URL =
  'https://exam-vb2-default-rtdb.asia-southeast1.firebasedatabase.app';

// 1. Lấy kết quả bài thi hoặc lịch sử thi từ Firebase
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get('id');
    const userId = searchParams.get('userId') || searchParams.get('candidateId');

    // Lấy 1 kết quả cụ thể
    if (submissionId) {
      const res = await fetch(`${FIREBASE_DB_URL}/submissions/${submissionId}.json`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        return NextResponse.json({ error: 'Không tìm thấy kết quả bài thi' }, { status: 404 });
      }

      const data = await res.json();
      if (!data) {
        return NextResponse.json({ error: 'Không tìm thấy kết quả bài thi' }, { status: 404 });
      }

      return NextResponse.json(data);
    }

    // Lấy danh sách kết quả (lịch sử làm đề)
    const res = await fetch(`${FIREBASE_DB_URL}/submissions.json`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return NextResponse.json([]);
    }

    const all = await res.json();
    if (!all) return NextResponse.json([]);

    let list: SubmissionResult[] = Object.keys(all).map((key) => ({
      ...all[key],
      id: all[key].id || key,
    }));

    if (userId) {
      list = list.filter(
        (sub) => sub.candidateId === userId || (sub as any).userId === userId
      );
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
    const submissionId = body.id || `sub_${Date.now()}`;

    const payload: SubmissionResult = {
      ...body,
      id: submissionId,
      submittedAt: body.submittedAt || new Date().toISOString(),
    };

    // Lưu vào Firebase Realtime Database
    const res = await fetch(`${FIREBASE_DB_URL}/submissions/${submissionId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      throw new Error(`Firebase RTDB status: ${res.status}`);
    }

    // Lưu dự phòng Firestore
    try {
      if (adminDb && payload.candidateId) {
        await adminDb.collection('submissions').doc(submissionId).set(payload);
      }
    } catch (fsErr) {
      console.warn('Lỗi Firestore:', fsErr);
    }

    return NextResponse.json({ success: true, id: submissionId });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Lỗi lưu bài nộp:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
