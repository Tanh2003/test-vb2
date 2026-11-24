import { NextRequest, NextResponse } from 'next/server';
import { downloadFileFromB2 } from '@/lib/b2';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key') || searchParams.get('name');

    if (!key) {
      return NextResponse.json({ error: 'Thiếu tham số key của file' }, { status: 400 });
    }

    const { stream, contentType, contentLength } = await downloadFileFromB2(key);

    if (!stream) {
      return NextResponse.json({ error: 'Không thể đọc nội dung tệp từ kho lưu trữ' }, { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', contentType || 'application/pdf');
    headers.set('Content-Disposition', `inline; filename="${key.split('/').pop() || 'document.pdf'}"`);
    headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(stream as any, {
      status: 200,
      headers,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Lỗi API view file từ B2:', msg);
    return NextResponse.json(
      { error: `Không thể mở file từ Backblaze: ${msg}` },
      { status: 500 }
    );
  }
}
