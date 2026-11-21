/**
 * exam-schema.ts
 * Thiết kế dữ liệu cho hệ thống thi online (mô phỏng thi văn bằng 2 Công an).
 *
 * Luồng:  PDF đề + PDF đáp án ──Gemini──▶ Extracted* (DTO phẳng)
 *         ──validate/merge──▶ Domain model ──▶ Firestore
 *         Thí sinh làm bài ──▶ AttemptDoc ──Cloud Function──▶ chấm điểm
 */

/* ════════════════════════════════════════════════════════════════
 * 0. KIỂU DÙNG CHUNG
 * ════════════════════════════════════════════════════════════════ */

export type PaperCode = 'CA1' | 'CA2' | 'CA3' | 'CA4';

/** Môn suy ra từ nội dung đề minh hoạ 2026 – hãy xác nhận lại với ban tổ chức. */
export const PAPER_META: Record<
  PaperCode,
  { subject: string; expectedQuestions: number; mcqUntil: number }
> = {
  CA1: { subject: 'Toán cao cấp', expectedQuestions: 50, mcqUntil: 45 },
  CA2: { subject: 'Kinh tế vĩ mô', expectedQuestions: 50, mcqUntil: 45 },
  CA3: { subject: 'Triết học Mác - Lênin', expectedQuestions: 60, mcqUntil: 54 },
  CA4: { subject: 'Nhà nước và pháp luật', expectedQuestions: 60, mcqUntil: 54 },
};

/**
 * RichText = Markdown + LaTeX.
 *  - Công thức inline:  $\frac{a}{b}$      - Công thức block: $$\int_0^1 x\,dx$$
 *  - Bảng: dùng GFM Markdown table
 *  - Ma trận: $\begin{pmatrix}1&1\\-1&1\end{pmatrix}$
 * Render ở client bằng react-markdown + remark-math + rehype-katex.
 */
export type RichText = string;

export type OptionKey = 'A' | 'B' | 'C' | 'D';
export type QuestionType =
  | 'mcq'            // trắc nghiệm 4 phương án
  | 'short_numeric'  // trả lời ngắn: số (có thể nhiều số)
  | 'short_text'     // trả lời ngắn: cụm từ / khái niệm
  | 'short_blanks';  // điền nhiều chỗ trống (chọn cụm từ đánh số, hoặc điền số + đơn vị)

/* ════════════════════════════════════════════════════════════════
 * 1. DTO CHO GEMINI (phẳng, tránh union – responseSchema của Gemini
 *    chỉ hỗ trợ tập con OpenAPI, không có discriminated union)
 * ════════════════════════════════════════════════════════════════ */

export interface ExtractedExam {
  paperCode: string;                 // "CA1".."CA4" đúng như in trên đề
  examTitle: string;
  year: number;                      // 2026
  durationMinutes: number;           // 150
  totalPages: number;
  essay: ExtractedEssay;
  groups: ExtractedGroup[];          // các "tình huống/đoạn dẫn chung" cho nhiều câu
  questions: ExtractedQuestion[];
  warnings: string[];                // model tự báo chỗ không chắc chắn
}

export interface ExtractedEssay {
  prompt: RichText;                  // toàn bộ đề tự luận (gồm cả trích dẫn)
  citation: string;                  // nguồn trích dẫn, "" nếu không có
  minWords: number;                  // 500; 0 nếu không nêu
  maxPoints: number;                 // 30
}

export interface ExtractedGroup {
  id: string;                        // "g49_51"
  fromNumber: number;
  toNumber: number;
  content: RichText;
}

export interface ExtractedQuestion {
  number: number;                    // số câu in trên đề (1..60)
  type: QuestionType;
  groupId: string;                   // "" nếu không thuộc nhóm
  stem: RichText;                    // nội dung câu hỏi, KHÔNG gồm "Câu N."
  options: { key: OptionKey; text: RichText }[]; // [] nếu không phải mcq
  blankPool: { index: number; text: RichText }[]; // CA3 55-57: (1) chép lại, (2) triết học...
  blankCount: number;                // số chỗ trống cần điền; 0 nếu không phải short_blanks
  hasFigureOrTable: boolean;         // có hình/bảng mà model không chuyển hết được
  confidence: number;                // 0..1
}

export interface ExtractedAnswerKey {
  paperCode: string;
  answers: ExtractedAnswer[];
  essayRubric: RichText;             // "" nếu đáp án không có
  warnings: string[];
}

export interface ExtractedAnswer {
  number: number;
  correctOption: OptionKey | '';     // mcq
  rawAnswer: string;                 // short_*: nguyên văn đáp án, vd "2 - 4 - 1", "6,25", "Tuân thủ pháp luật"
  explanation: RichText;             // "" nếu không có
}

/* ════════════════════════════════════════════════════════════════
 * 2. DOMAIN MODEL (chặt chẽ, dùng discriminated union)
 * ════════════════════════════════════════════════════════════════ */

interface BaseQuestion {
  id: string;                        // `${paperCode}_Q${number}` – ổn định để map đáp án
  number: number;
  groupId?: string;
  stem: RichText;
  points: number;                    // điểm của câu này (xem buildPoints)
  needsReview: boolean;              // confidence thấp / có hình bảng → admin duyệt tay
}

export interface McqQuestion extends BaseQuestion {
  type: 'mcq';
  options: { key: OptionKey; text: RichText }[];
}
export interface ShortNumericQuestion extends BaseQuestion {
  type: 'short_numeric';
  unit?: string;
}
export interface ShortTextQuestion extends BaseQuestion {
  type: 'short_text';
}
export interface ShortBlanksQuestion extends BaseQuestion {
  type: 'short_blanks';
  blankCount: number;
  blankPool?: { index: number; text: RichText }[];
}
export type Question =
  | McqQuestion
  | ShortNumericQuestion
  | ShortTextQuestion
  | ShortBlanksQuestion;

export type CorrectAnswer =
  | { type: 'mcq'; option: OptionKey }
  | { type: 'short_numeric'; values: number[]; tolerance: number } // values.length>1 cho câu nhiều đáp số (CA2-47)
  | { type: 'short_text'; accepted: string[]; mode: 'exact' | 'keywords' | 'ai' }
  | { type: 'short_blanks'; blanks: { accepted: string[] }[] };

/* ════════════════════════════════════════════════════════════════
 * 3. FIRESTORE
 *
 * exams/{examId}                         ExamDoc      (kỳ thi)
 * exams/{examId}/papers/{paperCode}      PaperDoc     (mã đề, KHÔNG chứa đáp án)
 * exams/{examId}/answerKeys/{paperCode}  AnswerKeyDoc (chặn client đọc)
 * attempts/{attemptId}                   AttemptDoc   (bài làm của userId)
 *
 * Mọi doc đều có ownerId/userId để dùng collectionGroup query + rules.
 * 60 câu < 1MB nên nhúng questions[] trong PaperDoc (1 lần đọc là đủ).
 * ════════════════════════════════════════════════════════════════ */

import type { Timestamp } from 'firebase/firestore';

export type ExamStatus = 'draft' | 'needs_review' | 'published' | 'archived';

export interface ExamDoc {
  id: string;
  ownerId: string;                   // userId người tạo
  title: string;
  year: number;
  durationMinutes: number;
  paperCodes: PaperCode[];           // các mã đề đã upload
  status: ExamStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PaperDoc {
  examId: string;
  paperCode: PaperCode;
  ownerId: string;
  subject: string;
  status: ExamStatus;
  essay: { prompt: RichText; citation?: string; minWords: number; maxPoints: number };
  groups: { id: string; fromNumber: number; toNumber: number; content: RichText }[];
  questions: Question[];
  scoring: { essayPoints: number; objectivePoints: number }; // 30 / 70
  sourceFile: { storagePath: string; sha256: string };       // PDF gốc trên Firebase Storage
  extraction: { model: string; warnings: string[]; reviewedBy?: string; reviewedAt?: Timestamp };
  createdAt: Timestamp;
}

export interface AnswerKeyDoc {
  examId: string;
  paperCode: PaperCode;
  ownerId: string;
  answers: Record<string, CorrectAnswer>;   // key = String(question.number)
  explanations: Record<string, RichText>;
  essayRubric?: RichText;
  createdAt: Timestamp;
}

export type AttemptStatus = 'in_progress' | 'submitted' | 'graded';

export interface AttemptDoc {
  id: string;
  userId: string;                    // người thi
  examId: string;
  paperCode: PaperCode;
  status: AttemptStatus;
  startedAt: Timestamp;
  deadline: Timestamp;               // startedAt + durationMinutes (server tính, không tin client)
  submittedAt?: Timestamp;
  /** key = số câu. mcq ["B"] | numeric ["1.25"] | blanks ["2","4","1"] | text ["..."] */
  responses: Record<string, string[]>;
  essay?: { text: string; wordCount: number };
  result?: AttemptResult;
}

export interface AttemptResult {
  objectiveScore: number;
  essayScore: number | null;         // null = chờ chấm tay / AI
  total: number | null;
  perQuestion: Record<string, { correct: boolean; earned: number }>;
}

/** firestore.rules (rút gọn)
 *
 * match /exams/{examId} {
 *   allow read: if resource.data.status == 'published' || resource.data.ownerId == request.auth.uid;
 *   allow write: if request.auth.uid == resource.data.ownerId;
 *   match /papers/{code}     { allow read: if request.auth != null; allow write: if isOwner(examId); }
 *   match /answerKeys/{code} { allow read, write: if false; }   // chỉ Admin SDK / Cloud Function
 * }
 * match /attempts/{id} {
 *   allow create: if request.resource.data.userId == request.auth.uid;
 *   allow read: if resource.data.userId == request.auth.uid;
 *   allow update: if resource.data.userId == request.auth.uid
 *                 && resource.data.status == 'in_progress'
 *                 && request.time < resource.data.deadline
 *                 && !('result' in request.resource.data.diff(resource.data).affectedKeys());
 * }
 */

/* ════════════════════════════════════════════════════════════════
 * 4. GEMINI: responseSchema + prompt + gọi API
 * ════════════════════════════════════════════════════════════════ */

import { GoogleGenAI, Type } from '@google/genai';

const str = { type: Type.STRING };
const num = { type: Type.NUMBER };
const bool = { type: Type.BOOLEAN };
const arr = (items: object) => ({ type: Type.ARRAY, items });
const obj = (properties: Record<string, object>) => ({
  type: Type.OBJECT,
  properties,
  required: Object.keys(properties),
});

export const EXAM_RESPONSE_SCHEMA = obj({
  paperCode: str,
  examTitle: str,
  year: num,
  durationMinutes: num,
  totalPages: num,
  essay: obj({ prompt: str, citation: str, minWords: num, maxPoints: num }),
  groups: arr(obj({ id: str, fromNumber: num, toNumber: num, content: str })),
  questions: arr(
    obj({
      number: num,
      type: { type: Type.STRING, enum: ['mcq', 'short_numeric', 'short_text', 'short_blanks'] },
      groupId: str,
      stem: str,
      options: arr(obj({ key: { type: Type.STRING, enum: ['A', 'B', 'C', 'D'] }, text: str })),
      blankPool: arr(obj({ index: num, text: str })),
      blankCount: num,
      hasFigureOrTable: bool,
      confidence: num,
    }),
  ),
  warnings: arr(str),
});

export const ANSWER_KEY_RESPONSE_SCHEMA = obj({
  paperCode: str,
  answers: arr(
    obj({
      number: num,
      correctOption: { type: Type.STRING, enum: ['A', 'B', 'C', 'D', ''] },
      rawAnswer: str,
      explanation: str,
    }),
  ),
  essayRubric: str,
  warnings: arr(str),
});

export const EXAM_PROMPT = `
Bạn là bộ bóc tách đề thi. Đọc TOÀN BỘ file PDF đính kèm (đọc bằng hình ảnh, không dựa vào text layer vì công thức bị vỡ) và trả về JSON đúng schema.

QUY TẮC:
1. KHÔNG giải bài, KHÔNG bịa. Chép nguyên văn tiếng Việt, giữ dấu.
2. Mọi công thức, ma trận, tích phân, giới hạn, chuỗi, phân số, chỉ số trên/dưới => LaTeX: $...$ (inline) hoặc $$...$$ (block).
   Trong JSON phải escape backslash: "\\\\frac{a}{b}", "\\\\begin{pmatrix}...".
3. Bảng số liệu => Markdown table trong stem. Hình vẽ không chuyển được => ghi "[HÌNH]" và đặt hasFigureOrTable=true.
4. Xác định type theo NỘI DUNG từng câu, KHÔNG theo tiêu đề phần (tiêu đề "câu 1 đến 39" có thể sai):
   - 4 phương án A-D => mcq
   - Yêu cầu tính ra số => short_numeric
   - Điền cụm từ vào chỗ trống từ danh sách đánh số (1)(2)(3)(4) => short_blanks, blankPool = danh sách đó, blankCount = số chỗ trống
   - Điền số/đơn vị vào chỗ trống tự do => short_blanks, blankPool = []
   - Còn lại (trả lời bằng cụm từ/khái niệm) => short_text
5. "Đọc tình huống/nội dung sau và trả lời câu X đến Y" => tạo 1 group (id "gX_Y"), gán groupId cho các câu X..Y, KHÔNG lặp lại đoạn dẫn trong stem.
6. stem không chứa "Câu N." ; options.text không chứa "A." "B.".
7. Phần tự luận => trường essay. minWords lấy từ "tối thiểu N chữ".
8. Phải trả về ĐỦ và ĐÚNG THỨ TỰ tất cả các câu; câu nào không chắc, vẫn trả về và giảm confidence + thêm warnings.
`;

export const ANSWER_KEY_PROMPT = `
Đọc PDF đáp án. Với mỗi câu: trắc nghiệm => correctOption (A-D); trả lời ngắn => rawAnswer ghi NGUYÊN VĂN (giữ dấu phẩy thập phân, đơn vị, dấu "-" giữa các chỗ trống). Có lời giải => explanation (LaTeX như đề). Có thang điểm/hướng dẫn chấm tự luận => essayRubric. Không bịa đáp án thiếu: để rỗng và ghi vào warnings.
`;

export const GEMINI_MODEL = 'gemini-2.5-pro'; // đổi sang model Gemini bạn đang dùng

async function callGemini<T>(
  ai: GoogleGenAI,
  pdfBase64: string,
  prompt: string,
  schema: object,
): Promise<T> {
  const res = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
      { text: prompt },
    ],
    config: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0 },
  });
  return JSON.parse(res.text ?? '{}') as T;
}

export const extractExam = (ai: GoogleGenAI, pdfB64: string) =>
  callGemini<ExtractedExam>(ai, pdfB64, EXAM_PROMPT, EXAM_RESPONSE_SCHEMA);

export const extractAnswerKey = (ai: GoogleGenAI, pdfB64: string) =>
  callGemini<ExtractedAnswerKey>(ai, pdfB64, ANSWER_KEY_PROMPT, ANSWER_KEY_RESPONSE_SCHEMA);

/* ════════════════════════════════════════════════════════════════
 * 5. VALIDATE + CHUYỂN DTO → DOMAIN
 * ════════════════════════════════════════════════════════════════ */

export function validateExtraction(e: ExtractedExam): string[] {
  const errs: string[] = [];
  const code = e.paperCode?.toUpperCase().replace(/\s/g, '') as PaperCode;
  const meta = PAPER_META[code];
  if (!meta) return [`Mã đề không hợp lệ: ${e.paperCode}`];

  if (e.questions.length !== meta.expectedQuestions)
    errs.push(`${code} cần ${meta.expectedQuestions} câu, nhận ${e.questions.length}`);

  e.questions.forEach((q, i) => {
    if (q.number !== i + 1) errs.push(`Sai thứ tự: vị trí ${i + 1} là câu ${q.number}`);
    if (q.type === 'mcq' && q.options.length !== 4) errs.push(`Câu ${q.number}: mcq phải có 4 phương án`);
    if (q.type === 'short_blanks' && q.blankCount < 1) errs.push(`Câu ${q.number}: thiếu blankCount`);
    if (q.groupId && !e.groups.some((g) => g.id === q.groupId)) errs.push(`Câu ${q.number}: groupId không tồn tại`);
  });
  if (e.essay.prompt.trim().length < 20) errs.push('Thiếu đề tự luận');
  return errs;
}

/** 70 điểm trắc nghiệm chia đều theo số câu (có thể ghi đè từng câu sau khi admin duyệt). */
export function toDomainQuestions(e: ExtractedExam, objectivePoints = 70): Question[] {
  const code = e.paperCode as PaperCode;
  const each = Math.round((objectivePoints / e.questions.length) * 1000) / 1000;
  return e.questions.map((q): Question => {
    const base = {
      id: `${code}_Q${q.number}`,
      number: q.number,
      groupId: q.groupId || undefined,
      stem: q.stem,
      points: each,
      needsReview: q.confidence < 0.8 || q.hasFigureOrTable,
    };
    switch (q.type) {
      case 'mcq':
        return { ...base, type: 'mcq', options: q.options };
      case 'short_numeric':
        return { ...base, type: 'short_numeric' };
      case 'short_blanks':
        return { ...base, type: 'short_blanks', blankCount: q.blankCount, blankPool: q.blankPool.length ? q.blankPool : undefined };
      default:
        return { ...base, type: 'short_text' };
    }
  });
}

/** "6,25" | "1.25" | "-2 030" => number (kiểu VN: dấu phẩy thập phân). */
export const parseVnNumber = (s: string): number =>
  Number(s.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));

export function toCorrectAnswer(q: Question, a: ExtractedAnswer): CorrectAnswer {
  switch (q.type) {
    case 'mcq':
      return { type: 'mcq', option: a.correctOption as OptionKey };
    case 'short_numeric': {
      const values = (a.rawAnswer.match(/-?\d[\d.,\s]*/g) ?? []).map(parseVnNumber);
      return { type: 'short_numeric', values, tolerance: 0.01 };
    }
    case 'short_blanks':
      return {
        type: 'short_blanks',
        blanks: a.rawAnswer.split(/\s*[-–;]\s*/).map((x) => ({ accepted: [x.trim()] })),
      };
    default:
      return { type: 'short_text', accepted: a.rawAnswer.split(/\s*\|\s*/), mode: 'keywords' };
  }
}

/* ════════════════════════════════════════════════════════════════
 * 6. CHẤM ĐIỂM (chạy trong Cloud Function, KHÔNG chạy ở client)
 * ════════════════════════════════════════════════════════════════ */

const norm = (s: string) =>
  s.normalize('NFC').toLowerCase().replace(/[.,;:!?"'()]/g, '').replace(/\s+/g, ' ').trim();

export function gradeQuestion(q: Question, key: CorrectAnswer, resp: string[] = []): boolean {
  if (!resp.length) return false;
  switch (key.type) {
    case 'mcq':
      return resp[0] === key.option;
    case 'short_numeric': {
      const got = resp.flatMap((r) => r.split(/[;|]/)).map(parseVnNumber);
      return (
        got.length === key.values.length &&
        key.values.every((v, i) => Math.abs(v - got[i]) <= Math.max(key.tolerance, Math.abs(v) * 0.001))
      );
    }
    case 'short_blanks':
      return (
        resp.length === key.blanks.length &&
        key.blanks.every((b, i) => b.accepted.some((x) => norm(x) === norm(resp[i])))
      );
    case 'short_text': {
      const r = norm(resp.join(' '));
      return key.mode === 'exact'
        ? key.accepted.some((x) => norm(x) === r)
        : key.accepted.some((x) => r.includes(norm(x))); // 'keywords'; 'ai' => xử lý riêng
    }
  }
}

export function gradeAttempt(
  paper: Pick<PaperDoc, 'questions'>,
  keys: Record<string, CorrectAnswer>,
  responses: Record<string, string[]>,
): AttemptResult {
  const perQuestion: AttemptResult['perQuestion'] = {};
  let objectiveScore = 0;
  for (const q of paper.questions) {
    const key = keys[String(q.number)];
    const ok = key ? gradeQuestion(q, key, responses[String(q.number)]) : false;
    const earned = ok ? q.points : 0;
    perQuestion[String(q.number)] = { correct: ok, earned };
    objectiveScore += earned;
  }
  objectiveScore = Math.round(objectiveScore * 100) / 100;
  return { objectiveScore, essayScore: null, total: null, perQuestion };
}