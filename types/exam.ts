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
  id: string; // C01 - C39
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
  id: string; // C40 - C45
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
  id: string; // N1, N2
  type: 'GROUP';
  level: CognitiveLevel;
  context: string;
  subQuestions: SubQuestion[];
}

export interface ShortAnswerQuestion {
  id: string; // C46 - C50
  type: 'SHORT';
  level: CognitiveLevel;
  content: string;
  correctAnswer?: string; // số nguyên, số thập phân hoặc phân số tối giản (vd: -5, 1.25, 3/4)
}

export type Question =
  | EssayQuestion
  | SingleChoiceQuestion
  | GroupQuestion
  | ShortAnswerQuestion;

export interface ExamPaper {
  examCode: 'CA1';
  durationSeconds: 9000;
  totalScore: 100;
  essay: EssayQuestion;
  singleChoices: SingleChoiceQuestion[];
  groupQuestions: GroupQuestion[];
  shortAnswers: ShortAnswerQuestion[];
}

export interface CandidateAnswers {
  essay: string;
  multipleChoice: Record<string, string>; // key: C01 -> C50
}

export interface CandidateSession {
  sbd: string;
  cccd: string;
  fullName?: string;
  examCode: 'CA1';
  answers: CandidateAnswers;
  flaggedQuestions: string[];
  timeLeft: number; // 9000 giây
  violationCount: number; // số lần chuyển tab / vi phạm
  isSubmitted?: boolean;
  submittedAt?: string;
}

export interface PriorityPoints {
  doiTuong: number;
  khuVuc: number;
  diemThuong: number;
}

export interface GradingResult {
  multipleChoiceScore: number; // tối đa 70
  essayScoreJudge1: number;
  essayScoreJudge2: number;
  essayAgreedScore: number; // tối đa 30
  totalExamScore: number; // tối đa 100
  priorityPoints: PriorityPoints;
  totalBonusPoints: number; // ĐT + KV + Điểm thưởng
  admissionScore: number; // ĐXT = (Điểm Bài Thi * 3 / 10) + Điểm Cộng
}

