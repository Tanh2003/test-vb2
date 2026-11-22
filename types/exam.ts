import type { Timestamp } from 'firebase/firestore';

/* ════════════════════════════════════════════════════════════════
 * 0. KIỂU DÙNG CHUNG CHO 4 MÃ ĐỀ (CA1, CA2, CA3, CA4)
 * ════════════════════════════════════════════════════════════════ */

export type PaperCode = 'CA1' | 'CA2' | 'CA3' | 'CA4';

export const PAPER_META: Record<
  PaperCode,
  { subject: string; expectedQuestions: number; mcqUntil: number; description: string }
> = {
  CA1: {
    subject: 'Toán cao cấp',
    expectedQuestions: 50,
    mcqUntil: 45,
    description: 'Tự luận Xã hội (30đ) + Toán cao cấp (70đ: 45 trắc nghiệm + 5 trả lời ngắn số/điền khuyết)',
  },
  CA2: {
    subject: 'Kinh tế vĩ mô',
    expectedQuestions: 50,
    mcqUntil: 45,
    description: 'Tự luận Xã hội (30đ) + Kinh tế vĩ mô (70đ: 45 trắc nghiệm + 5 trả lời ngắn số/tính toán)',
  },
  CA3: {
    subject: 'Triết học Mác - Lênin',
    expectedQuestions: 60,
    mcqUntil: 54,
    description: 'Tự luận Xã hội (30đ) + Triết học Mác - Lênin (70đ: 54 trắc nghiệm + 6 điền khuyết/khái niệm)',
  },
  CA4: {
    subject: 'Nhà nước và pháp luật',
    expectedQuestions: 60,
    mcqUntil: 54,
    description: 'Tự luận Xã hội (30đ) + Nhà nước và pháp luật (70đ: 54 trắc nghiệm + 6 tình huống/điền khuyết)',
  },
};

export type RichText = string;
export type OptionKey = 'A' | 'B' | 'C' | 'D';
export type QuestionType =
  | 'mcq'            // trắc nghiệm 4 phương án
  | 'short_numeric'  // trả lời ngắn: số (có thể nhiều số)
  | 'short_text'     // trả lời ngắn: cụm từ / khái niệm
  | 'short_blanks';  // điền nhiều chỗ trống (chọn cụm từ đánh số, hoặc điền số + đơn vị)

/* ════════════════════════════════════════════════════════════════
 * 1. DTO BÓC TÁCH TỪ GEMINI
 * ════════════════════════════════════════════════════════════════ */

export interface ExtractedExam {
  paperCode: string;                 // "CA1".."CA4"
  examTitle: string;
  year: number;                      // 2026
  durationMinutes: number;           // 150
  totalPages: number;
  essay: ExtractedEssay;
  groups: ExtractedGroup[];          // tình huống / đoạn dẫn chung
  questions: ExtractedQuestion[];
  warnings: string[];
}

export interface ExtractedEssay {
  prompt: RichText;                  // toàn bộ đề tự luận (gồm cả trích dẫn)
  citation: string;                  // nguồn trích dẫn
  minWords: number;                  // 500
  maxPoints: number;                 // 30
}

export interface ExtractedGroup {
  id: string;                        // vd: "g40_42", "g49_51"
  fromNumber: number;
  toNumber: number;
  content: RichText;
}

export interface ExtractedQuestion {
  number: number;                    // 1..50 hoặc 1..60
  type: QuestionType;
  groupId: string;                   // rỗng nếu không thuộc nhóm
  stem: RichText;                    // nội dung câu hỏi
  options: { key: OptionKey; text: RichText }[]; // [] nếu không phải mcq
  blankPool: { index: number; text: RichText }[]; // ngân hàng từ lựa chọn (1)(2)(3)(4)
  blankCount: number;                // số chỗ trống cần điền
  hasFigureOrTable: boolean;         // có hình vẽ / bảng cần lưu ý
  confidence: number;                // 0..1
  correctAnswer?: string;            // đáp án đúng (nếu có sẵn từ PDF đề hoặc sau khi ghép)
  explanation?: RichText;            // lời giải chi tiết
}

export interface ExtractedAnswerKey {
  paperCode: string;
  answers: ExtractedAnswer[];
  essayRubric: RichText;
  warnings: string[];
}

export interface ExtractedAnswer {
  number: number;
  correctOption: OptionKey | '';
  rawAnswer: string;
  explanation: RichText;
}

/* ════════════════════════════════════════════════════════════════
 * 2. DOMAIN QUESTION MODEL
 * ════════════════════════════════════════════════════════════════ */

interface BaseQuestion {
  id: string;
  number: number;
  groupId?: string;
  stem: RichText;
  points: number;
  needsReview: boolean;
  correctAnswer?: string;
  explanation?: RichText;
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
  | { type: 'short_numeric'; values: number[]; tolerance: number }
  | { type: 'short_text'; accepted: string[]; mode: 'exact' | 'keywords' | 'ai' }
  | { type: 'short_blanks'; blanks: { accepted: string[] }[] };

/* ════════════════════════════════════════════════════════════════
 * 3. DATABASE / FIRESTORE / REALTIME MODELS
 * ════════════════════════════════════════════════════════════════ */

export type ExamStatus = 'draft' | 'needs_review' | 'published' | 'archived';

export interface ExamDoc {
  id: string;
  ownerId?: string;                  // ID tài khoản người tạo (uid/sbd/email)
  userId?: string;                   // ID tài khoản người tạo
  ownerName?: string;                // Họ tên người upload
  ownerEmail?: string;               // Email người upload
  isPublic?: boolean;                // Đề công khai hay riêng tư
  title: string;
  year: number;
  durationMinutes: number;
  paperCodes?: PaperCode[];
  examCode?: PaperCode;
  status?: ExamStatus;
  createdAt: string | Timestamp;
  updatedAt?: string | Timestamp;
  totalQuestions?: number;
}

export interface PaperDoc {
  examId: string;
  paperCode: PaperCode;
  ownerId?: string;
  userId?: string;
  ownerName?: string;
  ownerEmail?: string;
  subject: string;
  status: ExamStatus;
  essay: { prompt: RichText; citation?: string; minWords: number; maxPoints: number; rubric?: RichText };
  groups: { id: string; fromNumber: number; toNumber: number; content: RichText }[];
  questions: Question[];
  scoring: { essayPoints: number; objectivePoints: number };
  extraction?: { model: string; warnings: string[]; reviewedAt?: string };
  createdAt: string | Timestamp;
}

export interface AnswerKeyDoc {
  examId: string;
  paperCode: PaperCode;
  answers: Record<string, CorrectAnswer>;
  explanations: Record<string, RichText>;
  essayRubric?: RichText;
}

/* ════════════════════════════════════════════════════════════════
 * 4. BACKWARD COMPATIBILITY TYPES (CHO CÁC TRANG CŨ)
 * ════════════════════════════════════════════════════════════════ */

export type CognitiveLevel = 'BIET' | 'HIEU' | 'VAN_DUNG';

export interface EssayQuestion {
  id: 'ESSAY';
  type: 'ESSAY';
  level: CognitiveLevel;
  content: string;
  minWords: 500;
  maxScore: 30;
}

export interface SingleChoiceQuestion {
  id: string;
  type: 'SINGLE';
  level: CognitiveLevel;
  content: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer?: 'A' | 'B' | 'C' | 'D';
}

export interface SubQuestion {
  id: string;
  level: CognitiveLevel;
  content: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer?: 'A' | 'B' | 'C' | 'D';
}

export interface GroupQuestion {
  id: string;
  type: 'GROUP';
  level: CognitiveLevel;
  context: string;
  subQuestions: SubQuestion[];
}

export interface ShortAnswerQuestion {
  id: string;
  type: 'SHORT';
  level: CognitiveLevel;
  content: string;
  correctAnswer?: string;
}

export interface ExamPaper {
  examCode: PaperCode;
  durationSeconds: number;
  totalScore: number;
  essay: EssayQuestion;
  singleChoices: SingleChoiceQuestion[];
  groupQuestions: GroupQuestion[];
  shortAnswers: ShortAnswerQuestion[];
}

export interface CandidateAnswers {
  essay: string;
  multipleChoice: Record<string, string>;
}

export interface CandidateSession {
  sbd: string;
  cccd: string;
  fullName?: string;
  examCode: PaperCode;
  answers: CandidateAnswers;
  flaggedQuestions: string[];
  timeLeft: number;
  violationCount: number;
  isSubmitted?: boolean;
  submittedAt?: string;
}

export interface PriorityPoints {
  doiTuong: number;
  khuVuc: number;
  diemThuong: number;
}

export interface GradingResult {
  multipleChoiceScore: number;
  essayScoreJudge1: number;
  essayScoreJudge2: number;
  essayAgreedScore: number;
  totalExamScore: number;
  priorityPoints: PriorityPoints;
  totalBonusPoints: number;
  admissionScore: number;
}

/* ════════════════════════════════════════════════════════════════
 * 6. KẾT QUẢ NỘP BÀI & BẢNG ĐIỂM CHI TIẾT
 * ════════════════════════════════════════════════════════════════ */

export interface SubmissionDetail {
  questionNumber: number;
  type: QuestionType;
  stem: string;
  options?: { key: OptionKey; text: string }[];
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface SubmissionResult {
  id: string;
  examId: string;
  paperCode: PaperCode;
  subject: string;
  examTitle: string;
  candidateId: string;
  candidateName: string;
  sbd: string;
  submittedAt: string;
  timeSpentSeconds: number;
  durationMinutes: number;
  totalScore: number;
  objectiveScore: number;
  essayScore: number;
  classification: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  essayWordCount: number;
  essayFeedback: string;
  essayText: string;
  details: SubmissionDetail[];
}
