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
  'AQ.Ab8RN6JsqD2Usk-GV4m895efhWOmTwm_10vqUHIW47qLJyE_8g';

const ai = new GoogleGenAI({ apiKey });

const FIREBASE_DB_URL =
  'https://exam-vb2-default-rtdb.asia-southeast1.firebasedatabase.app';

export const maxDuration = 300; // 120s timeout for multi-page PDF processing

// Danh sách model ưu tiên cao nhất: Khả dụng thực tế, tốc độ phản hồi nhanh, không lỗi 404
const candidateModels = [
  'gemini-3.5-flash-lite', // Ưu tiên 1: Tốc độ siêu tốc (~4-8s), nhẹ tải, ít nghẽn
  'gemini-3.5-flash',      // Ưu tiên 2: Cân bằng, tính ổn định cao (~15-30s)
  'gemini-3.6-flash',      // Ưu tiên 3: Phiên bản mở rộng độ chính xác cao
  'gemini-3.8-flash',      // Ưu tiên 4: Dự phòng khi các model trên quá tải
];

// Hàm gọi Gemini an toàn với cơ chế nạp inlineData siêu tốc (<15MB) hoặc Gemini File API (>15MB)
async function callGeminiPdf<T>(
  fileInput: Blob | File | Buffer,
  prompt: string,
  schema: object,
  displayName = 'exam_document.pdf'
): Promise<T | null> {
  // 1. Chuẩn hóa fileInput thành Buffer
  let buffer: Buffer;
  if (Buffer.isBuffer(fileInput)) {
    buffer = fileInput;
  } else if (fileInput instanceof Blob) {
    const ab = await fileInput.arrayBuffer();
    buffer = Buffer.from(ab);
  } else {
    buffer = Buffer.from(fileInput as any);
  }

  // Tệp PDF <= 15MB sẽ dùng inlineData (base64) trực tiếp để tránh độ trễ upload & polling
  const isSmallFile = buffer.length <= 15 * 1024 * 1024;
  let fileDataPart: any = null;
  let uploadedFileName: string | null = null;

  try {
    if (isSmallFile) {
      console.log(
        `[Gemini API] Tệp PDF ${(buffer.length / 1024).toFixed(1)}KB: Nạp inlineData trực tiếp (siêu tốc, bỏ qua độ trễ File API).`
      );
      fileDataPart = {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: 'application/pdf',
        },
      };
    } else {
      console.log(
        `[Gemini File API] Tệp PDF lớn (${(buffer.length / 1024 / 1024).toFixed(1)}MB): Tải lên Gemini File API: ${displayName}...`
      );
      const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
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
      console.log(`[Gemini File API] Tải tệp thành công: ${uploadedFileName}`);

      // Đợi tệp chuyển sang trạng thái ACTIVE nếu đang PROCESSING
      let fileInfo = await ai.files.get({ name: uploadedFileName });
      let waitAttempts = 0;
      while (fileInfo.state === 'PROCESSING' && waitAttempts < 10) {
        waitAttempts++;
        console.log(`[Gemini File API] File đang được xử lý, đợi 1s...`);
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

      fileDataPart = {
        fileData: {
          fileUri,
          mimeType: 'application/pdf',
        },
      };
    }

    const contents = [
      fileDataPart,
      { text: prompt },
    ];

    const modelConfig: any = {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0,
      thinkingConfig: {
        thinkingLevel: 'MINIMAL', // TỐI ƯU CỰC QUAN TRỌNG: Tắt suy nghĩ kéo dài, xuất thẳng JSON trong vài giây
      },
    };

    // 2. Vòng lặp duyệt qua candidateModels: Mỗi model tối đa 35s timeout để đảm bảo toàn bộ request dưới 120s
    for (const model of candidateModels) {
      try {
        console.log(`[Gemini API] Đang gọi model ${model} (chế độ thinkingLevel: MINIMAL)...`);
        const startTime = Date.now();

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout quá 35s khi gọi model ${model}`)), 35000)
        );

        const generatePromise = ai.models.generateContent({
          model,
          contents,
          config: modelConfig,
        });

        const response = await Promise.race([generatePromise, timeoutPromise]);

        if (response && response.text) {
          console.log(
            `[Gemini API] ✅ Model ${model} phân tích thành công trong ${Date.now() - startTime}ms!`
          );
          return JSON.parse(response.text) as T;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(
          `[Gemini API] ⚠️ Model ${model} gặp lỗi/quá tải (${msg.substring(0, 100)}...). Lập tức chuyển sang model tiếp theo...`
        );
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Gemini API] Lỗi trong quá trình xử lý file PDF:', msg);
  } finally {
    // 3. Dọn dẹp file tạm trên server Google nếu có dùng File API
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
