import { NextRequest, NextResponse } from 'next/server';
import { PAPER_META, PaperCode } from '@/types/exam';

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

    const examList = Object.keys(data).map((key) => {
      const item = data[key];
      const pCode = (item.paperCode || item.examCode || 'CA1') as PaperCode;
      return {
        ...item,
        id: item.id || key,
        paperCode: pCode,
        examCode: pCode,
        subject: item.subject || PAPER_META[pCode]?.subject || 'Môn thi VB2',
        duration: item.duration || item.durationMinutes || 150,
      };
    });

    return NextResponse.json(examList.reverse());
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Lỗi lấy danh sách đề thi từ Firebase REST:', msg);
    return NextResponse.json([]);
  }
}

// Lưu hoặc cập nhật đề thi vào Firebase Realtime Database
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const paperCode = (body.paperCode || body.examCode || 'CA1') as PaperCode;
    const examId = body.id || `${paperCode.toLowerCase()}_${Date.now()}`;

    const payload = {
      ...body,
      id: examId,
      paperCode,
      examCode: paperCode,
      subject: body.subject || PAPER_META[paperCode]?.subject || 'Môn thi VB2',
      updatedAt: new Date().toISOString(),
    };

    const res = await fetch(`${FIREBASE_DB_URL}/exams/${examId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      throw new Error(`Firebase returned status ${res.status}`);
    }

    return NextResponse.json({ success: true, id: examId });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Lỗi ghi đề thi vào Firebase REST:', msg);
    return NextResponse.json(
      { error: msg || 'Không thể lưu đề thi vào Firebase.' },
      { status: 500 }
    );
  }
}
