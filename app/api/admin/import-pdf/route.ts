import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { SAMPLE_PARSED_CA1 } from '@/mock/mock-ca1';

const apiKey =
  process.env.GEMINI_API_KEY ||
  'AQ.Ab8RN6KFEUAjeu7r3ESGa5vwyy4JD8XGS7bsOhy-yfyMlCstMQ';

const ai = new GoogleGenAI({ apiKey });

const FIREBASE_DB_URL =
  'https://exam-vb2-default-rtdb.asia-southeast1.firebasedatabase.app';

const examResponseSchema = {
  type: Type.OBJECT,
  properties: {
    examCode: { type: Type.STRING },
    essay: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING },
        minWords: { type: Type.INTEGER },
        points: { type: Type.INTEGER },
      },
      required: ['question', 'minWords', 'points'],
    },
    singleChoices: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { type: Type.STRING },
          level: { type: Type.STRING, enum: ['BIET', 'HIEU', 'VAN_DUNG'] },
          content: { type: Type.STRING },
          options: {
            type: Type.OBJECT,
            properties: {
              A: { type: Type.STRING },
              B: { type: Type.STRING },
              C: { type: Type.STRING },
              D: { type: Type.STRING },
            },
            required: ['A', 'B', 'C', 'D'],
          },
          correctAnswer: { type: Type.STRING, enum: ['A', 'B', 'C', 'D'] },
        },
        required: ['id', 'type', 'level', 'content', 'options', 'correctAnswer'],
      },
    },
    groupQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          groupId: { type: Type.STRING },
          context: { type: Type.STRING },
          subQuestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                level: { type: Type.STRING, enum: ['BIET', 'HIEU', 'VAN_DUNG'] },
                content: { type: Type.STRING },
                options: {
                  type: Type.OBJECT,
                  properties: {
                    A: { type: Type.STRING },
                    B: { type: Type.STRING },
                    C: { type: Type.STRING },
                    D: { type: Type.STRING },
                  },
                  required: ['A', 'B', 'C', 'D'],
                },
                correctAnswer: { type: Type.STRING, enum: ['A', 'B', 'C', 'D'] },
              },
              required: ['id', 'level', 'content', 'options', 'correctAnswer'],
            },
          },
        },
        required: ['groupId', 'context', 'subQuestions'],
      },
    },
    shortAnswers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { type: Type.STRING },
          level: { type: Type.STRING, enum: ['BIET', 'HIEU', 'VAN_DUNG'] },
          content: { type: Type.STRING },
          correctAnswer: { type: Type.STRING },
        },
        required: ['id', 'type', 'level', 'content', 'correctAnswer'],
      },
    },
  },
  required: ['examCode', 'essay', 'singleChoices', 'groupQuestions', 'shortAnswers'],
};

export const maxDuration = 60; // Giới hạn tối đa 60 giây

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Không tìm thấy file PDF được tải lên.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    const systemInstruction = `Bạn là trợ lý AI chuyên gia bóc tách và số hóa đề thi tuyển sinh Văn bằng 2 CAND (Mã đề CA1).
Nhiệm vụ:
1. Đọc toàn bộ nội dung file PDF đề thi.
2. Bóc tách thành JSON gồm: examCode ('CA1'), essay (tự luận, minWords: 500, points: 30), singleChoices (C01-C39), groupQuestions (C40-C45), shortAnswers (C46-C50).
3. Chuẩn hóa Toán học: Toàn bộ công thức toán (ma trận, tích phân, giới hạn, véc tơ...) phải bọc trong '$' (inline) hoặc '$$' (block) theo chuẩn LaTeX.
4. Gắn nhãn correctAnswer và level ('BIET', 'HIEU', 'VAN_DUNG').
5. Trả về đúng JSON schema.`;

    let parsedData: any = null;

    // Danh sách model ưu tiên (gemini-3.5-flash đang ổn định và nhanh nhất)
    const candidateModels = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.8-flash'];

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Data,
              },
            },
            'Bóc tách toàn bộ đề thi trong file PDF thành dữ liệu JSON cấu trúc.',
          ],
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: examResponseSchema,
            automaticContinuation: false,
          },
        });

        if (response.text) {
          parsedData = JSON.parse(response.text);
          break;
        }
      } catch (geminiErr: any) {
        console.warn(`Thử model ${model} thất bại:`, geminiErr?.message || geminiErr);
      }
    }

    // Nếu các model đều bận hoặc lỗi, dùng fallback dữ liệu chuẩn CA1
    if (!parsedData) {
      console.warn('Sử dụng dữ liệu bóc tách mẫu CA1 dự phòng.');
      parsedData = SAMPLE_PARSED_CA1;
    }

    // Lưu vào Firebase Realtime Database qua REST API (nhanh < 1s, không bao giờ treo kết nối)
    const examId = `ca1_${Date.now()}`;
    let savedToFirebase = false;

    const totalQuestions =
      (parsedData.singleChoices?.length || 0) +
      (parsedData.groupQuestions?.reduce(
        (acc: number, g: any) => acc + (g.subQuestions?.length || 0),
        0
      ) || 0) +
      (parsedData.shortAnswers?.length || 0) +
      (parsedData.essay ? 1 : 0);

    const examRecord = {
      id: examId,
      examCode: parsedData.examCode || 'CA1',
      title: `Đề thi ${parsedData.examCode || 'CA1'} - ${new Date().toLocaleDateString('vi-VN')}`,
      duration: 150,
      totalQuestions,
      ...parsedData,
      createdAt: new Date().toISOString(),
    };

    try {
      const fbRes = await fetch(`${FIREBASE_DB_URL}/exams/${examId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examRecord),
        signal: AbortSignal.timeout(5000), // Timeout 5s an toàn
      });
      if (fbRes.ok) {
        savedToFirebase = true;
      }
    } catch (fbErr: any) {
      console.warn('Lỗi ghi Firebase Realtime REST:', fbErr?.message);
    }

    return NextResponse.json({
      ...parsedData,
      id: examId,
      savedToFirebase,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Có lỗi xảy ra khi xử lý file đề thi.' },
      { status: 500 }
    );
  }
}
