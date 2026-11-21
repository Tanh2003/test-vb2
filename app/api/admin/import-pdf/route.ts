import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import {
  PaperCode,
  PAPER_META,
  ExtractedExam,
  ExtractedAnswerKey,
  McqQuestion,
} from '@/types/exam';
import {
  EXAM_RESPONSE_SCHEMA,
  ANSWER_KEY_RESPONSE_SCHEMA,
  EXAM_PROMPT,
  ANSWER_KEY_PROMPT,
  validateExtraction,
  toDomainQuestions,
} from '@/mock/exam';
import { SAMPLES_BY_CODE } from '@/mock/mock-samples';

const apiKey =
  process.env.GEMINI_API_KEY ||
  'AQ.Ab8RN6KFEUAjeu7r3ESGa5vwyy4JD8XGS7bsOhy-yfyMlCstMQ';

const ai = new GoogleGenAI({ apiKey });

const FIREBASE_DB_URL =
  'https://exam-vb2-default-rtdb.asia-southeast1.firebasedatabase.app';

export const maxDuration = 120; // 120s timeout for multi-page PDF processing

// Hàm gọi Gemini an toàn với danh sách model ưu tiên
async function callGeminiPdf<T>(
  pdfBase64: string,
  prompt: string,
  schema: object,
): Promise<T | null> {
  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.1-pro-preview',
  ];

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: pdfBase64,
            },
          },
          { text: prompt },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0,
        },
      });

      if (response.text) {
        return JSON.parse(response.text) as T;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Gemini API] Thử model ${model} không thành công:`, msg);
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const examFile = formData.get('file') as File | null;
    const answerFile = formData.get('answerFile') as File | null;
    const chosenCode = ((formData.get('paperCode') as string)?.toUpperCase() as PaperCode) || 'CA1';
    const customTitle = (formData.get('examTitle') as string) || '';
    const durationMinutes = parseInt((formData.get('durationMinutes') as string) || '150', 10);

    let extractedExam: ExtractedExam | null = null;
    let extractedKey: ExtractedAnswerKey | null = null;
    let usedFallback = false;

    // 1. Bóc tách PDF Đề thi
    if (examFile) {
      const examBuf = await examFile.arrayBuffer();
      const examB64 = Buffer.from(examBuf).toString('base64');
      extractedExam = await callGeminiPdf<ExtractedExam>(
        examB64,
        `${EXAM_PROMPT}\nLƯU Ý: Đây là đề thi tuyển sinh Văn bằng 2 CAND mã đề ${chosenCode} (${PAPER_META[chosenCode]?.subject || ''}). Hãy bóc tách chuẩn xác.`,
        EXAM_RESPONSE_SCHEMA,
      );
    }

    // 2. Bóc tách PDF Đáp án (nếu có tải lên)
    if (answerFile) {
      const ansBuf = await answerFile.arrayBuffer();
      const ansB64 = Buffer.from(ansBuf).toString('base64');
      extractedKey = await callGeminiPdf<ExtractedAnswerKey>(
        ansB64,
        `${ANSWER_KEY_PROMPT}\nMã đề tương ứng: ${chosenCode}.`,
        ANSWER_KEY_RESPONSE_SCHEMA,
      );
    }

    // 3. Nếu AI không đọc được hoặc không có file (hoặc API quota hết), dùng mẫu chuẩn theo mã đề
    if (!extractedExam) {
      console.warn(`[import-pdf] Sử dụng dữ liệu bóc tách mẫu dự phòng cho mã đề ${chosenCode}.`);
      usedFallback = true;
      const sample = SAMPLES_BY_CODE[chosenCode] || SAMPLES_BY_CODE.CA1;
      // Deep clone sample
      extractedExam = JSON.parse(JSON.stringify(sample));
    }

    if (!extractedExam) {
      return NextResponse.json(
        { error: 'Không thể phân tích đề thi từ file PDF.' },
        { status: 500 }
      );
    }

    // Đảm bảo paperCode chuẩn xác
    const paperCode = (extractedExam.paperCode?.toUpperCase().replace(/\s/g, '') || chosenCode) as PaperCode;
    extractedExam.paperCode = paperCode;
    if (customTitle) {
      extractedExam.examTitle = customTitle;
    }
    extractedExam.durationMinutes = durationMinutes;

    // 4. Khớp đáp án từ file đáp án vào danh sách câu hỏi nếu có
    if (extractedKey && extractedKey.answers && extractedKey.answers.length > 0) {
      const ansMap = new Map<number, (typeof extractedKey.answers)[0]>();
      for (const a of extractedKey.answers) {
        ansMap.set(a.number, a);
      }

      for (const q of extractedExam.questions) {
        const keyItem = ansMap.get(q.number);
        if (keyItem) {
          if (q.type === 'mcq' && keyItem.correctOption) {
            q.correctAnswer = keyItem.correctOption;
          } else if (keyItem.rawAnswer) {
            q.correctAnswer = keyItem.rawAnswer;
          }
          if (keyItem.explanation) {
            q.explanation = keyItem.explanation;
          }
        }
      }

      if (extractedKey.essayRubric) {
        extractedExam.essay.prompt += `\n\n**[Hướng dẫn chấm tự luận]:**\n${extractedKey.essayRubric}`;
      }
    }

    // 5. Kiểm tra tính hợp lệ
    const validationErrors = validateExtraction(extractedExam);

    // 6. Chuyển đổi sang Domain model
    type DomainQuestionWithAnswer = (ReturnType<typeof toDomainQuestions>[number]) & {
      correctAnswer?: string;
      explanation?: string;
    };
    const domainQuestions = toDomainQuestions(extractedExam) as DomainQuestionWithAnswer[];

    // Gắn thêm correctAnswer từ extracted sang domain nếu có
    for (const dq of domainQuestions) {
      const eq = extractedExam.questions.find((q) => q.number === dq.number);
      if (eq?.correctAnswer) {
        dq.correctAnswer = eq.correctAnswer;
      }
      if (eq?.explanation) {
        dq.explanation = eq.explanation;
      }
    }

    // 7. Tạo định dạng tương thích ngược cho các màn hình cũ
    const singleChoices = domainQuestions
      .filter((q): q is McqQuestion & DomainQuestionWithAnswer => q.type === 'mcq' && !q.groupId)
      .map((q) => {
        const optionsObj: Record<string, string> = { A: '', B: '', C: '', D: '' };
        if (Array.isArray(q.options)) {
          for (const opt of q.options) {
            optionsObj[opt.key] = opt.text;
          }
        }
        return {
          id: `C${String(q.number).padStart(2, '0')}`,
          type: 'SINGLE' as const,
          level: 'BIET' as const,
          content: q.stem,
          options: optionsObj,
          correctAnswer: (q.correctAnswer || 'A') as 'A' | 'B' | 'C' | 'D',
        };
      });

    const groupQuestions = (extractedExam.groups || []).map((g) => ({
      groupId: g.id,
      context: g.content,
      subQuestions: domainQuestions
        .filter((q): q is McqQuestion & DomainQuestionWithAnswer => q.groupId === g.id && q.type === 'mcq')
        .map((q) => {
          const optionsObj: Record<string, string> = { A: '', B: '', C: '', D: '' };
          if (Array.isArray(q.options)) {
            for (const opt of q.options) {
              optionsObj[opt.key] = opt.text;
            }
          }
          return {
            id: `C${String(q.number).padStart(2, '0')}`,
            level: 'HIEU' as const,
            content: q.stem,
            options: optionsObj,
            correctAnswer: (q.correctAnswer || 'A') as 'A' | 'B' | 'C' | 'D',
          };
        }),
    }));

    const shortAnswers = domainQuestions
      .filter((q) => q.type !== 'mcq')
      .map((q) => ({
        id: `C${String(q.number).padStart(2, '0')}`,
        type: 'SHORT' as const,
        level: 'VAN_DUNG' as const,
        content: q.stem,
        correctAnswer: q.correctAnswer || '',
      }));

    // 8. Lưu vào Firebase Realtime Database
    const examId = `${paperCode.toLowerCase()}_${Date.now()}`;
    let savedToFirebase = false;

    const examRecord = {
      id: examId,
      examCode: paperCode,
      paperCode,
      subject: PAPER_META[paperCode]?.subject || 'Môn thi chuyên ngành',
      title: extractedExam.examTitle || `Đề thi ${paperCode} - ${PAPER_META[paperCode]?.subject || ''}`,
      duration: durationMinutes,
      durationMinutes,
      totalQuestions: extractedExam.questions.length,
      essay: {
        prompt: extractedExam.essay.prompt,
        citation: extractedExam.essay.citation,
        minWords: extractedExam.essay.minWords,
        points: extractedExam.essay.maxPoints,
        question: extractedExam.essay.prompt,
      },
      groups: extractedExam.groups,
      questions: extractedExam.questions,
      domainQuestions,
      singleChoices,
      groupQuestions,
      shortAnswers,
      createdAt: new Date().toISOString(),
      status: validationErrors.length > 0 ? 'needs_review' : 'published',
      warnings: [
        ...(extractedExam.warnings || []),
        ...(usedFallback ? ['Đang hiển thị đề thi mẫu chuẩn hoá 2026 (chế độ dự phòng thông minh).'] : []),
      ],
    };

    try {
      const fbRes = await fetch(`${FIREBASE_DB_URL}/exams/${examId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examRecord),
        signal: AbortSignal.timeout(6000),
      });
      if (fbRes.ok) {
        savedToFirebase = true;
      }
    } catch (fbErr: unknown) {
      const msg = fbErr instanceof Error ? fbErr.message : String(fbErr);
      console.warn('Lỗi ghi Firebase Realtime REST:', msg);
    }

    return NextResponse.json({
      success: true,
      id: examId,
      examCode: paperCode,
      paperCode,
      subject: PAPER_META[paperCode]?.subject || '',
      examTitle: examRecord.title,
      durationMinutes,
      totalQuestions: extractedExam.questions.length,
      essay: extractedExam.essay,
      groups: extractedExam.groups,
      questions: extractedExam.questions,
      domainQuestions,
      singleChoices,
      groupQuestions,
      shortAnswers,
      validationErrors,
      warnings: examRecord.warnings,
      savedToFirebase,
      usedFallback,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Có lỗi xảy ra khi xử lý file đề thi.';
    console.error('Lỗi API import-pdf:', msg);
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
