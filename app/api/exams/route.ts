import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { PAPER_META, PaperCode } from '@/types/exam';

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
    // Không có session hợp lệ
  }
  return null;
}

// Lấy danh sách đề thi từ Firebase Realtime Database qua REST API
// CHỈ hiển thị đề thi thực tế từ Firebase và của người nào thì người đó xem
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get('userId') || searchParams.get('ownerId');
    const userOnly = searchParams.get('userOnly') === 'true';
    const isPublicOnly = searchParams.get('isPublic') === 'true';
    const singleExamId = searchParams.get('id');

    const sessionUserId = await getSessionUserId();
    const activeUserId = queryUserId || sessionUserId;

    // 1. Trường hợp truy vấn 1 đề cụ thể theo ID
    if (singleExamId) {
      const singleRes = await fetch(`${FIREBASE_DB_URL}/exams/${singleExamId}.json`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(6000),
      });

      if (!singleRes.ok) {
        return NextResponse.json({ error: 'Không tìm thấy đề thi' }, { status: 404 });
      }

      const singleData = await singleRes.json();
      if (!singleData) {
        return NextResponse.json({ error: 'Không tìm thấy đề thi' }, { status: 404 });
      }

      const owner = singleData.ownerId || singleData.userId || '';
      const isPublic = Boolean(singleData.isPublic === true);

      // Nếu là đề riêng tư, chỉ cho phép chính chủ sở hữu truy cập
      if (!isPublic) {
        if (!activeUserId || owner !== activeUserId) {
          return NextResponse.json(
            { error: 'Bạn không có quyền truy cập đề thi riêng tư của tài khoản khác' },
            { status: 403 }
          );
        }
      }

      return NextResponse.json(singleData);
    }

    // 2. Trường hợp lấy danh sách đề thi từ Firebase
    const res = await fetch(`${FIREBASE_DB_URL}/exams.json`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return NextResponse.json([]);
    }

    const data = await res.json();
    if (!data) return NextResponse.json([]);

    const allExams = Object.keys(data).map((key) => {
      const item = data[key];
      const pCode = (item.paperCode || item.examCode || 'CA1') as PaperCode;
      const owner = item.ownerId || item.userId || '';

      return {
        ...item,
        id: item.id || key,
        ownerId: owner,
        userId: owner,
        paperCode: pCode,
        examCode: pCode,
        subject: item.subject || PAPER_META[pCode]?.subject || 'Môn thi VB2',
        duration: item.duration || item.durationMinutes || 150,
        isPublic: Boolean(item.isPublic === true),
      };
    });

    // Lọc nghiêm ngặt theo quyền tài khoản:
    let filteredExams: typeof allExams = [];

    if (isPublicOnly) {
      // Chỉ lấy các đề công khai / miễn phí do admin tự đăng
      filteredExams = allExams.filter((exam) => exam.isPublic === true);
    } else if (userOnly) {
      // Chỉ lấy đề do chính tài khoản này upload
      if (!activeUserId) {
        return NextResponse.json([]);
      }
      filteredExams = allExams.filter(
        (exam) => exam.ownerId === activeUserId || exam.userId === activeUserId
      );
    } else if (activeUserId) {
      // Người dùng đăng nhập: Chỉ thấy đề của chính mình + đề công khai
      // TUYỆT ĐỐI KHÔNG hiển thị đề riêng tư của người dùng khác
      filteredExams = allExams.filter((exam) => {
        const isOwner = exam.ownerId === activeUserId || exam.userId === activeUserId;
        const isPublic = exam.isPublic === true;
        return isOwner || isPublic;
      });
    } else {
      // Chưa đăng nhập: Chỉ thấy đề công khai
      filteredExams = allExams.filter((exam) => exam.isPublic === true);
    }

    return NextResponse.json(filteredExams.reverse());
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

    // Lấy ownerId từ session cookie hoặc body
    const sessionUserId = await getSessionUserId();
    const ownerId = body.ownerId || body.userId || sessionUserId || 'anonymous';
    const ownerName = body.ownerName || '';
    const ownerEmail = body.ownerEmail || '';

    const payload = {
      ...body,
      id: examId,
      ownerId,
      userId: ownerId,
      ownerName,
      ownerEmail,
      isPublic: Boolean(body.isPublic),
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

    // Đồng bộ Firestore dự phòng
    try {
      if (adminDb && ownerId && ownerId !== 'anonymous') {
        await adminDb.collection('exams').doc(examId).set({
          ...payload,
        });
      }
    } catch (fsErr) {
      console.warn('Lỗi Firestore:', fsErr);
    }

    return NextResponse.json({ success: true, id: examId, ownerId });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Lỗi ghi đề thi vào Firebase REST:', msg);
    return NextResponse.json(
      { error: msg || 'Không thể lưu đề thi vào Firebase.' },
      { status: 500 }
    );
  }
}

// Xoá đề thi khỏi Firebase Realtime Database & Firestore
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get('id');

    if (!examId) {
      return NextResponse.json({ error: 'Thiếu mã đề thi cần xoá' }, { status: 400 });
    }

    const sessionUserId = await getSessionUserId();

    // Lấy thông tin đề để kiểm tra quyền sở hữu
    const getRes = await fetch(`${FIREBASE_DB_URL}/exams/${examId}.json`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });

    if (getRes.ok) {
      const examData = await getRes.json();
      if (examData) {
        const owner = examData.ownerId || examData.userId || '';
        // Nếu có session mà không phải chủ sở hữu thì chặn
        if (sessionUserId && owner && owner !== 'anonymous' && owner !== sessionUserId) {
          return NextResponse.json(
            { error: 'Bạn không có quyền xoá đề thi của tài khoản khác' },
            { status: 403 }
          );
        }
      }
    }

    const res = await fetch(`${FIREBASE_DB_URL}/exams/${examId}.json`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      throw new Error(`Firebase returned status ${res.status}`);
    }

    try {
      if (adminDb) {
        await adminDb.collection('exams').doc(examId).delete();
      }
    } catch (fsErr) {
      console.warn('Lỗi Firestore xoá đề:', fsErr);
    }

    return NextResponse.json({ success: true, id: examId });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Lỗi xoá đề thi:', msg);
    return NextResponse.json(
      { error: msg || 'Không thể xoá đề thi khỏi hệ thống' },
      { status: 500 }
    );
  }
}
