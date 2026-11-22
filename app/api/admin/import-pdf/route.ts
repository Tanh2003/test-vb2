import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenAI } from '@google/genai';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
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

const apiKey =
  process.env.GEMINI_API_KEY ||
  'AQ.Ab8RN6KFEUAjeu7r3ESGa5vwyy4JD8XGS7bsOhy-yfyMlCstMQ';

const ai = new GoogleGenAI({ apiKey });

const FIREBASE_DB_URL =
  'https://exam-vb2-default-rtdb.asia-southeast1.firebasedatabase.app';

export const maxDuration = 120; // 120s timeout for multi-page PDF processing

// Hàm gọi Gemini an toàn với Gemini File API và cơ chế retry / fallback model
async function callGeminiPdf<T>(
  fileInput: Blob | File | Buffer,
  prompt: string,
  schema: object,
  displayName = 'exam_document.pdf'
): Promise<T | null> {
  const candidateModels = [
    'gemini-3.8-flash',          // Ưu tiên 1: Nhanh, chuẩn LaTeX
    'gemini-3.7-flash',          // Ưu tiên 2: Ổn định cao
    'gemini-3.5-flash',          // Ưu tiên 3: Bản cũ hơn nhưng server rất rảnh, ít 503
    'gemini-3.5-flash-lite',     // Ưu tiên 4: Nhẹ, phản hồi tức thì
    'gemini-3.5-pro',            // Ưu tiên 5: Dự phòng hạng nặng (bóc tách công thức toán cực chuẩn)
  ];

  let blob: Blob;
  if (fileInput instanceof Blob) {
    blob = fileInput;
  } else if (Buffer.isBuffer(fileInput)) {
    blob = new Blob([new Uint8Array(fileInput)], { type: 'application/pdf' });
  } else {
    blob = new Blob([fileInput as any], { type: 'application/pdf' });
  }

  let uploadedFileName: string | null = null;

  try {
    // 1. Upload file lên server Google thông qua Gemini File API (1 LẦN DUY NHẤT)
    console.log(`[Gemini File API] Bắt đầu tải tệp lên Google: ${displayName}...`);
    const uploadedFile = await ai.files.upload({
      file: blob,
      config: {
        mimeType: 'application/pdf',
        displayName,
      },
    });

    if (!uploadedFile.name) {
      throw new Error('Upload tệp lên Gemini File API không trả về tên file.');
    }

    uploadedFileName = uploadedFile.name;
    console.log(`[Gemini File API] Tải tệp thành công: ${uploadedFileName} (URI: ${uploadedFile.uri})`);

    // Đợi tệp chuyển sang trạng thái ACTIVE nếu đang PROCESSING
    let fileInfo = await ai.files.get({ name: uploadedFileName });
    let waitAttempts = 0;
    while (fileInfo.state === 'PROCESSING' && waitAttempts < 10) {
      waitAttempts++;
      console.log(`[Gemini File API] File đang được xử lý (trạng thái PROCESSING), đợi 1s...`);
      await new Promise((r) => setTimeout(r, 1000));
      fileInfo = await ai.files.get({ name: uploadedFileName });
    }

    if (fileInfo.state === 'FAILED') {
      throw new Error('Google Gemini File API báo lỗi xử lý tệp PDF.');
    }

    const fileUri = fileInfo.uri || uploadedFile.uri;
    if (!fileUri) {
      throw new Error('Không nhận được fileUri từ Gemini File API.');
    }

    // 2. Vòng lặp duyệt qua candidateModels tái sử dụng cùng 1 fileUri
    for (const model of candidateModels) {
      let attempt = 0;
      const maxAttempts = 2; // 1 lần đầu + 1 lần retry nếu gặp lỗi 503/429

      while (attempt < maxAttempts) {
        attempt++;
        try {
          console.log(`[Gemini API] Đang gọi model ${model} (attempt ${attempt}/${maxAttempts})...`);
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                fileData: {
                  fileUri: fileUri,
                  mimeType: 'application/pdf',
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
            console.log(`[Gemini API] Model ${model} phân tích thành công!`);
            return JSON.parse(response.text) as T;
          }
          break;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          const isRetryable =
            msg.includes('503') ||
            msg.includes('429') ||
            msg.includes('Deadline expired') ||
            msg.includes('Resource has been exhausted') ||
            msg.includes('overloaded') ||
            msg.includes('high demand');

          if (isRetryable && attempt < maxAttempts) {
            console.warn(
              `[Gemini API] Model ${model} gặp lỗi tải cao (${msg}). Đợi 2s để thử lại lần 2...`
            );
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          }

          console.warn(`[Gemini API] Model ${model} không thành công:`, msg);
          break;
        }
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Gemini API] Lỗi trong quá trình xử lý file PDF:', msg);
  } finally {
    // 4. Dọn dẹp file tạm trên server Google sau khi bóc tách xong (hoặc khi gặp lỗi)
    if (uploadedFileName) {
      try {
        console.log(`[Gemini File API] Dọn dẹp xóa tệp tạm trên server Google: ${uploadedFileName}...`);
        await ai.files.delete({ name: uploadedFileName });
        console.log(`[Gemini File API] Đã xóa tệp tạm ${uploadedFileName} thành công.`);
      } catch (delErr) {
        console.warn(`[Gemini File API] Cảnh báo dọn dẹp file tạm ${uploadedFileName}:`, delErr);
      }
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

    // 0. Xác thực tài khoản người dùng từ Session Cookie hoặc FormData
    let sessionUid: string | null = null;
    let sessionEmail: string | null = null;
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('session')?.value;
      if (sessionCookie) {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
        sessionUid = decoded.uid;
        sessionEmail = decoded.email || null;
      }
    } catch {
      // Bỏ qua nếu chưa đăng nhập qua session cookie
    }

    const formOwnerId = ((formData.get('ownerId') as string) || (formData.get('userId') as string) || '').trim();
    const ownerName = ((formData.get('ownerName') as string) || '').trim();
    const ownerEmail = ((formData.get('ownerEmail') as string) || sessionEmail || '').trim();
    const isPublicParam = formData.get('isPublic') === 'true';
    const finalOwnerId = sessionUid || formOwnerId || 'anonymous';

    let extractedExam: ExtractedExam | null = null;
    let extractedKey: ExtractedAnswerKey | null = null;

    // 1. Bóc tách PDF Đề thi qua Gemini File API
    if (examFile) {
      extractedExam = await callGeminiPdf<ExtractedExam>(
        examFile,
        `${EXAM_PROMPT}\nLƯU Ý: Đây là đề thi tuyển sinh Văn bằng 2 CAND mã đề ${chosenCode} (${PAPER_META[chosenCode]?.subject || ''}). Hãy bóc tách chuẩn xác.`,
        EXAM_RESPONSE_SCHEMA,
        examFile.name || `exam_${chosenCode}.pdf`
      );
    }

    // 2. Bóc tách PDF Đáp án qua Gemini File API (nếu có tải lên)
    if (answerFile) {
      extractedKey = await callGeminiPdf<ExtractedAnswerKey>(
        answerFile,
        `${ANSWER_KEY_PROMPT}\nMã đề tương ứng: ${chosenCode}.`,
        ANSWER_KEY_RESPONSE_SCHEMA,
        answerFile.name || `answer_${chosenCode}.pdf`
      );
    }

    // 3. Nếu AI không bóc tách được từ PDF, trả về lỗi thực tế, không tạo mẫu giả
    if (!extractedExam) {
      return NextResponse.json(
        { error: 'Không thể phân tích đề thi từ file PDF đã tải lên. Vui lòng kiểm tra lại chất lượng file PDF hoặc API Gemini.' },
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
          correctAnswer: (q.correctAnswer || '') as any,
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
            correctAnswer: (q.correctAnswer || '') as any,
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

    // Tạo mã đề thi tạm thời
    const examId = `${paperCode.toLowerCase()}_${Date.now()}`;
    const savedToFirebase = false;

    const examTitle = customTitle || extractedExam.examTitle || `Đề thi ${paperCode} - ${PAPER_META[paperCode]?.subject || ''}`;

    // Lưu ý: KHÔNG lưu vào Firebase ngay khi upload.
    // Người dùng phải duyệt, chỉnh sửa hoặc bổ sung đầy đủ đáp án rồi mới bấm Lưu đề thi!

    return NextResponse.json({
      success: true,
      id: examId,
      ownerId: finalOwnerId,
      userId: finalOwnerId,
      ownerName,
      ownerEmail,
      isPublic: isPublicParam,
      examCode: paperCode,
      paperCode,
      subject: PAPER_META[paperCode]?.subject || '',
      examTitle,
      title: examTitle,
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
      warnings: extractedExam.warnings || [],
      savedToFirebase,
      hasAnswerFile: Boolean(extractedKey && extractedKey.answers && extractedKey.answers.length > 0),
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
