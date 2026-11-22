import { NextRequest, NextResponse } from 'next/server';
import { uploadBufferToB2 } from '@/lib/b2';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'exams';
    const customName = formData.get('customName') as string | null;
    const paperCode = (formData.get('paperCode') as string) || 'CA1';
    const examId = (formData.get('examId') as string) || `${paperCode.toLowerCase()}_${Date.now()}`;

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file để upload' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Đặt tên file có ý nghĩa và duy nhất: [examId]_[timestamp]_[tên_gốc]
    const originalName = file.name || 'exam.pdf';
    const cleanOrigName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalFileName = customName
      ? `${examId}_${customName}.pdf`
      : `${examId}_${Date.now()}_${cleanOrigName}`;

    const contentType = file.type || 'application/pdf';

    const result = await uploadBufferToB2({
      buffer,
      fileName: finalFileName,
      contentType,
      folder,
    });

    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      fileName: result.fileName,
      fileSize: result.fileSize,
      bucketName: result.bucketName,
      directUrl: result.directUrl,
      authorizedUrl: result.authorizedUrl,
      proxyUrl: result.proxyUrl,
      uploadedAt: result.uploadedAt,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Lỗi API upload-b2:', msg);
    return NextResponse.json(
      { error: `Không thể upload lên Backblaze B2: ${msg}` },
      { status: 500 }
    );
  }
}
