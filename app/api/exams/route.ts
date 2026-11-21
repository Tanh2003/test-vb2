import { NextRequest, NextResponse } from 'next/server';

const FIREBASE_DB_URL =
  'https://exam-vb2-default-rtdb.asia-southeast1.firebasedatabase.app';

// Lấy danh sách đề thi từ Firebase Realtime Database qua REST API
export async function GET() {
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/exams.json`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json([]);
    }

    const data = await res.json();
    if (!data) return NextResponse.json([]);

    const examList = Object.keys(data).map((key) => ({
      ...data[key],
      id: data[key].id || key,
    }));

    return NextResponse.json(examList.reverse());
  } catch (error: any) {
    console.error('Lỗi lấy danh sách đề thi từ Firebase REST:', error);
    return NextResponse.json([]);
  }
}

// Lưu hoặc cập nhật đề thi vào Firebase Realtime Database
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const examId = body.id || `ca1_${Date.now()}`;

    const res = await fetch(`${FIREBASE_DB_URL}/exams/${examId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        id: examId,
        updatedAt: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      throw new Error(`Firebase returned status ${res.status}`);
    }

    return NextResponse.json({ success: true, id: examId });
  } catch (error: any) {
    console.error('Lỗi ghi đề thi vào Firebase REST:', error);
    return NextResponse.json(
      { error: error?.message || 'Không thể lưu đề thi vào Firebase.' },
      { status: 500 }
    );
  }
}
