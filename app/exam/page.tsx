'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Clock,
  Send,
  FileText,
  Calculator,
  Flag,
  Layers,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import MathText from '@/components/common/MathText';
import {
  PaperCode,
  PAPER_META,
  ExtractedQuestion,
  ExtractedGroup,
  SubmissionResult,
  SubmissionDetail,
} from '@/types/exam';

type ActiveTab = 'essay' | 'mc';

function formatTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec
    .toString()
    .padStart(2, '0')}`;
}

function ExamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams.get('id');
  const caParam = (searchParams.get('ca')?.toUpperCase() as PaperCode) || 'CA1';

  const [paperCode, setPaperCode] = useState<PaperCode>(caParam);
  const [examTitle, setExamTitle] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(150);
  const [essayPrompt, setEssayPrompt] = useState<string>('');
  const [groups, setGroups] = useState<ExtractedGroup[]>([]);
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);

  const [sbd, setSbd] = useState('CAND-2026');
  const [candidateName, setCandidateName] = useState('Thí sinh CAND');
  const [candidateId, setCandidateId] = useState('');

  const [timeLeft, setTimeLeft] = useState(9000);
  const [activeTab, setActiveTab] = useState<ActiveTab>('essay');
  const [essayText, setEssayText] = useState('');
  const [mcAnswers, setMcAnswers] = useState<Record<string, string>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingExam, setIsLoadingExam] = useState(true);

  // Trạng thái modal nộp bài & đang nộp bài
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasSubmittedRef = useRef(false);
  const initialDurationRef = useRef(9000);

  const initExam = useCallback(
    (data: {
      paperCode?: string;
      examCode?: string;
      title?: string;
      examTitle?: string;
      essay?: { prompt?: string; question?: string };
      groups?: ExtractedGroup[];
      questions?: ExtractedQuestion[];
      durationMinutes?: number;
    }) => {
      const code = (data.paperCode || data.examCode || caParam || 'CA1').toUpperCase() as PaperCode;
      setPaperCode(code);
      const meta = PAPER_META[code] || PAPER_META.CA1;
      setExamTitle(data.examTitle || data.title || `${code} • ${meta.subject}`);
      setEssayPrompt(data.essay?.prompt || data.essay?.question || '');
      setGroups(data.groups || []);
      setQuestions(data.questions || []);

      const dur = data.durationMinutes || 150;
      setDurationMinutes(dur);
      const totalSec = dur * 60;
      setTimeLeft(totalSec);
      initialDurationRef.current = totalSec;

      setIsLoadingExam(false);
    },
    [caParam],
  );

  // 1. Tải đề thi từ CSDL Firebase hoặc localStorage
  useEffect(() => {
    let ignore = false;

    const loadExamData = async () => {
      setIsLoadingExam(true);

      // Thử load từ localStorage theo examId
      if (examId) {
        try {
          const stored = localStorage.getItem(`exam_current_${examId}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (!ignore) {
              initExam(parsed);
              return;
            }
          }
        } catch (e) {
          console.error(e);
        }

        // Tải từ API Firebase bảo mật theo ID và tài khoản
        try {
          let currentUserId = '';
          try {
            const cand = localStorage.getItem('candidate_info');
            if (cand) {
              const c = JSON.parse(cand);
              currentUserId = c.uid || c.id || c.sbd || c.email || '';
            }
          } catch {}

          const url = `/api/exams?id=${encodeURIComponent(examId)}${
            currentUserId ? `&userId=${encodeURIComponent(currentUserId)}` : ''
          }`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (!ignore && data && !data.error) {
              initExam(data);
              return;
            }
          } else {
            const errJson = await res.json().catch(() => ({}));
            if (!ignore) {
              setLoadError(
                errJson.error || 'Bạn không có quyền truy cập đề thi này hoặc đề thi không tồn tại.'
              );
              setIsLoadingExam(false);
              return;
            }
          }
        } catch (apiErr) {
          console.warn('Lỗi tải đề từ API:', apiErr);
        }
      }

      // Thử load từ localStorage theo mã đề caParam
      try {
        const storedCa = localStorage.getItem(`parsed_exam_${caParam}`);
        if (storedCa) {
          const parsed = JSON.parse(storedCa);
          if (!ignore) {
            initExam(parsed);
            return;
          }
        }
      } catch (e) {
        console.error(e);
      }

      if (!ignore) {
        setLoadError(
          'Không tìm thấy đề thi này trong Firebase hoặc bạn chưa đăng nhập tài khoản sở hữu đề thi.'
        );
        setIsLoadingExam(false);
      }
    };

    loadExamData();
    return () => {
      ignore = true;
    };
  }, [examId, caParam, initExam]);

  // 2. Tải SBD & thông tin thí sinh từ candidate_info
  useEffect(() => {
    try {
      const info = localStorage.getItem('candidate_info');
      if (info) {
        const parsed = JSON.parse(info);
        if (parsed.sbd) setSbd(parsed.sbd);
        if (parsed.fullName || parsed.name) setCandidateName(parsed.fullName || parsed.name);
        if (parsed.uid || parsed.id || parsed.email)
          setCandidateId(parsed.uid || parsed.id || parsed.email);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // 3. Chấm điểm & Nộp bài thi
  const executeSubmit = useCallback(async () => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setIsSubmitting(true);

    const meta = PAPER_META[paperCode] || PAPER_META.CA1;
    const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).filter(Boolean).length : 0;

    // --- A. Chấm điểm Tự luận (30 điểm) ---
    let essayScore = 0;
    let essayFeedback = '';

    if (wordCount === 0) {
      essayScore = 0;
      essayFeedback = 'Thí sinh không làm bài tự luận (0 điểm).';
    } else if (wordCount < 100) {
      essayScore = 6.0;
      essayFeedback =
        'Bài viết quá ngắn (< 100 chữ), chưa phát triển ý và chưa đáp ứng tiêu chuẩn tối thiểu 500 từ.';
    } else if (wordCount < 250) {
      essayScore = 13.5;
      essayFeedback =
        'Bài viết có mở đầu nhưng thiếu luận điểm trọng tâm, thiếu dẫn chứng thực tiễn ngành Công An, chưa đạt dung lượng.';
    } else if (wordCount < 400) {
      essayScore = 19.5;
      essayFeedback =
        'Bố cục bài viết tương đối rõ ràng, có dẫn chứng nhưng chưa phân tích sâu, chưa đạt tiêu chuẩn 500 từ.';
    } else if (wordCount < 500) {
      essayScore = 23.5;
      essayFeedback =
        'Lập luận khá tốt, tư tưởng rõ ràng, tiệm cận dung lượng tối thiểu 500 từ (bị trừ điểm dung lượng nhẹ).';
    } else {
      // wordCount >= 500
      const paragraphs = essayText
        .trim()
        .split(/\n\s*\n/)
        .filter((p) => p.trim().length > 0);
      if (paragraphs.length >= 3 && wordCount >= 550) {
        essayScore = 28.5;
        essayFeedback =
          'Bài viết xuất sắc: Bố cục 3 phần mở bài - thân bài - kết bài chuẩn xác, lập luận thuyết phục, gắn kết sâu sắc với thực tiễn lý luận CAND.';
      } else {
        essayScore = 26.5;
        essayFeedback =
          'Đạt yêu cầu dung lượng >= 500 từ, luận điểm rõ ràng, lập luận mạch lạc, liên hệ thực tế tốt.';
      }
    }

    // --- B. Chấm điểm Trắc nghiệm & Trả lời ngắn (70 điểm) ---
    const details: SubmissionDetail[] = [];
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredQCount = 0;

    questions.forEach((q) => {
      const key = String(q.number);
      let userAns = '';
      if (q.type === 'mcq') {
        userAns = (mcAnswers[key] || '').trim().toUpperCase();
      } else {
        userAns = (shortAnswers[key] || '').trim();
      }

      const correctAns = (q.correctAnswer || '').trim();
      let isCorrect = false;

      if (!userAns) {
        unansweredQCount++;
        isCorrect = false;
      } else if (correctAns) {
        if (q.type === 'mcq') {
          isCorrect = userAns === correctAns.toUpperCase();
        } else if (q.type === 'short_numeric') {
          const normUser = userAns.replace(/\s+/g, '').replace(',', '.');
          const normCorrect = correctAns.replace(/\s+/g, '').replace(',', '.');
          const numUser = parseFloat(normUser);
          const numCorrect = parseFloat(normCorrect);
          if (!isNaN(numUser) && !isNaN(numCorrect)) {
            isCorrect = Math.abs(numUser - numCorrect) < 0.001;
          } else {
            isCorrect = normUser.toLowerCase() === normCorrect.toLowerCase();
          }
        } else if (q.type === 'short_blanks') {
          // Chuẩn hóa định dạng "1-2" hoặc "1 - 2"
          const normUser = userAns.replace(/[\s\-_,]+/g, '-').toLowerCase();
          const normCorrect = correctAns.replace(/[\s\-_,]+/g, '-').toLowerCase();
          isCorrect = normUser === normCorrect;
        } else {
          // short_text
          const normUser = userAns.toLowerCase().replace(/\s+/g, ' ').trim();
          const normCorrect = correctAns.toLowerCase().replace(/\s+/g, ' ').trim();
          const acceptedParts = normCorrect.split(/[;/]+/).map((s) => s.trim());
          isCorrect = acceptedParts.includes(normUser) || normUser === normCorrect;
        }

        if (isCorrect) {
          correctCount++;
        } else {
          incorrectCount++;
        }
      } else {
        // Chưa có đáp án chính thức trong đề
        incorrectCount++;
      }

      details.push({
        questionNumber: q.number,
        type: q.type,
        stem: q.stem,
        options: q.options || [],
        userAnswer: userAns,
        correctAnswer: correctAns,
        isCorrect,
        explanation: q.explanation || '',
      });
    });

    const objectiveScore =
      questions.length > 0
        ? Number(((correctCount / questions.length) * 70).toFixed(2))
        : 0;

    const totalScore = Number((essayScore + objectiveScore).toFixed(2));

    let classification = 'Chưa đạt';
    if (totalScore >= 85) classification = 'Xuất sắc';
    else if (totalScore >= 75) classification = 'Giỏi';
    else if (totalScore >= 65) classification = 'Khá';
    else if (totalScore >= 50) classification = 'Trung bình';

    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timeSpent = Math.max(0, initialDurationRef.current - timeLeft);

    const submissionResult: SubmissionResult = {
      id: submissionId,
      examId: examId || paperCode,
      paperCode: paperCode,
      subject: meta.subject,
      examTitle: examTitle || `${paperCode} • ${meta.subject}`,
      candidateId: candidateId || 'cand_vb2',
      candidateName: candidateName || 'Thí sinh CAND',
      sbd: sbd || 'CAND-2026',
      submittedAt: new Date().toISOString(),
      timeSpentSeconds: timeSpent,
      durationMinutes: durationMinutes,
      totalScore,
      objectiveScore,
      essayScore,
      classification,
      totalQuestions: questions.length,
      correctCount,
      incorrectCount,
      unansweredCount: unansweredQCount,
      essayWordCount: wordCount,
      essayFeedback,
      essayText,
      details,
    };

    // 1. Lưu an toàn vào trình duyệt (localStorage)
    try {
      localStorage.setItem('latest_exam_result', JSON.stringify(submissionResult));
      localStorage.setItem(`submission_${submissionId}`, JSON.stringify(submissionResult));

      const rawHistory = localStorage.getItem('submissions_history');
      let historyList: SubmissionResult[] = [];
      if (rawHistory) {
        try {
          historyList = JSON.parse(rawHistory);
        } catch {}
      }
      historyList.unshift(submissionResult);
      localStorage.setItem('submissions_history', JSON.stringify(historyList.slice(0, 50)));
    } catch (e) {
      console.error('Lỗi ghi localStorage:', e);
    }

    // 2. Gửi lưu trữ lên Firebase Realtime Database & Firestore
    try {
      await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionResult),
      });
    } catch (apiErr) {
      console.warn('Gửi kết quả lên Firebase gặp lỗi:', apiErr);
    }

    // 3. Chuyển hướng ngay sang trang kết quả chi tiết
    router.push(`/result?id=${submissionId}`);
  }, [
    paperCode,
    essayText,
    questions,
    mcAnswers,
    shortAnswers,
    examId,
    examTitle,
    candidateId,
    candidateName,
    sbd,
    timeLeft,
    durationMinutes,
    router,
  ]);

  // 4. Bộ đếm ngược thời gian & Tự động nộp bài khi hết giờ
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && !hasSubmittedRef.current && !isLoadingExam && questions.length > 0) {
      executeSubmit();
    }
  }, [timeLeft, isLoadingExam, questions.length, executeSubmit]);

  const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).filter(Boolean).length : 0;

  const isAnswered = useCallback(
    (num: number) => {
      const key = String(num);
      if (mcAnswers[key]) return true;
      if (shortAnswers[key]?.trim()) return true;
      return false;
    },
    [mcAnswers, shortAnswers],
  );

  const answeredCount = questions.filter((q) => isAnswered(q.number)).length;
  const unansweredCount = questions.length - answeredCount;

  const scrollToQuestion = (num: number) => {
    const key = String(num);
    setActiveQuestion(key);
    setActiveTab('mc');
    setTimeout(() => {
      questionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleOpenSubmitModal = () => {
    setShowSubmitModal(true);
  };

  const timerColor =
    timeLeft <= 300
      ? 'bg-red-500/20 text-red-200 border-red-500/40 animate-pulse'
      : timeLeft <= 600
      ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
      : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';

  const meta = PAPER_META[paperCode] || PAPER_META.CA1;

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#f7f8f7] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Không thể tải đề thi</h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{loadError}</p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/select-exam"
              className="py-2.5 px-4 rounded-xl bg-[#0f2d22] text-white text-xs font-bold hover:bg-[#184232] transition"
            >
              Xem danh sách đề của bạn
            </Link>
            <Link
              href="/import"
              className="py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
            >
              Upload đề thi PDF mới
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingExam) {
    return (
      <div className="min-h-screen bg-[#f7f8f7] flex items-center justify-center p-4 text-sm font-semibold text-slate-600">
        <Clock className="w-5 h-5 animate-spin mr-2 text-emerald-700" />
        <span>Đang nạp dữ liệu đề thi từ CSDL...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8f7] text-slate-800 font-sans flex flex-col justify-between">
      {/* ===== HEADER STICKY (XANH RÊU CAND) ===== */}
      <header className="sticky top-0 z-40 bg-[#0f2d22] text-white shadow-md border-b border-emerald-900/60">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between px-4 sm:px-6 py-3 gap-4">
          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
            <Link
              href="/select-exam"
              className="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-200 transition cursor-pointer"
              title="Về danh sách đề"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-medium text-emerald-100">
                SBD: <strong className="text-amber-400 font-mono text-sm">{sbd}</strong>
              </span>
              <span className="text-emerald-700">|</span>
              <span className="font-medium text-emerald-100">
                Mã đề: <strong className="text-amber-400 font-extrabold">{paperCode}</strong> &bull;{' '}
                {meta.subject}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className={`flex items-center gap-1.5 font-mono text-sm sm:text-base font-extrabold px-3 py-1.5 rounded-xl border ${timerColor}`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>{formatTime(timeLeft)}</span>
            </div>
            <button
              onClick={handleOpenSubmitModal}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#c1121f] hover:bg-[#a50f1a] transition rounded-xl text-xs sm:text-sm font-bold text-white shadow-md shadow-red-950/30 cursor-pointer active:scale-[0.97] disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang chấm điểm...' : 'Nộp bài'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN EXAM LAYOUT ===== */}
      <div className="max-w-[1440px] w-full mx-auto grid grid-cols-12 gap-5 px-4 sm:px-6 py-6 flex-1">
        {/* ===== CỘT TRÁI (9 cột) ===== */}
        <main className="col-span-12 lg:col-span-9 space-y-5">
          {/* Tabs chuyển đổi Phần I / Phần II */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('essay')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'essay'
                  ? 'bg-[#0f2d22] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Phần I: Tự luận (30 điểm)</span>
            </button>
            <button
              onClick={() => setActiveTab('mc')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'mc'
                  ? 'bg-[#0f2d22] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Phần II: Trắc nghiệm & Trả lời ngắn (70 điểm)</span>
            </button>
          </div>

          {/* ===== TAB TỰ LUẬN ===== */}
          {activeTab === 'essay' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-[#0f2d22] uppercase tracking-wider">
                    <Flag className="w-4 h-4 text-amber-500" />
                    <span>Đề bài Nghị luận Xã hội</span>
                  </div>
                  <span className="text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                    30 Điểm &bull; Tối thiểu 500 chữ
                  </span>
                </div>
                <div className="text-slate-800 leading-relaxed text-sm sm:text-base font-normal">
                  <MathText text={essayPrompt} />
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={essayText}
                  onChange={(e) => setEssayText(e.target.value)}
                  rows={18}
                  placeholder="Nhập nội dung bài làm tự luận của bạn tại đây..."
                  className="w-full bg-white border border-slate-300 rounded-3xl p-6 text-slate-900 placeholder-slate-400 resize-y focus:outline-none focus:border-[#0f2d22] focus:ring-1 focus:ring-[#0f2d22] leading-relaxed shadow-sm text-sm sm:text-base font-sans"
                />
                <div
                  className={`absolute bottom-4 right-5 text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-xl border backdrop-blur flex items-center gap-1.5 shadow-2xs ${
                    wordCount >= 500
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-red-50 border-red-300 text-red-700'
                  }`}
                >
                  {wordCount >= 500 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span>
                    {wordCount}/500 chữ {wordCount >= 500 ? '(Đã đạt tối thiểu)' : '(Chưa đủ 500 chữ)'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB TRẮC NGHIỆM & TRẢ LỜI NGẮN ===== */}
          {activeTab === 'mc' && (
            <div className="space-y-5">
              {/* Nếu có nhóm ngữ liệu mồ côi (không khớp fromNumber của bất kỳ câu nào), render ở đầu */}
              {groups
                .filter((grp) => !questions.some((q) => q.number === grp.fromNumber))
                .map((grp) => (
                  <div
                    key={grp.id}
                    id={`group-${grp.id}`}
                    className="bg-purple-50/80 border border-purple-200 rounded-3xl p-6 space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-extrabold text-purple-900 border-b border-purple-200/60 pb-2">
                      <Layers className="w-4 h-4 text-purple-700 shrink-0" />
                      <span>
                        Ngữ liệu nhóm [{grp.id.toUpperCase()}] &bull; Áp dụng cho các câu từ{' '}
                        {grp.fromNumber} đến {grp.toNumber}
                      </span>
                    </div>
                    <div className="text-sm sm:text-base text-slate-800 leading-relaxed font-normal pt-1">
                      <MathText text={grp.content} />
                    </div>
                  </div>
                ))}

              {/* Danh sách câu hỏi */}
              {questions.map((q) => {
                const key = String(q.number);
                const isActive = activeQuestion === key;

                // Tìm xem câu này có phải là câu bắt đầu của một nhóm ngữ liệu không
                const groupStart = groups.find((grp) => grp.fromNumber === q.number);

                return (
                  <div key={q.number} className="space-y-4">
                    {/* Render Ngữ liệu nhóm NGAY TRƯỚC câu hỏi mở đầu nhóm (ví dụ G40_42 trước Câu 40) */}
                    {groupStart && (
                      <div
                        id={`group-${groupStart.id}`}
                        className="bg-purple-50/80 border border-purple-200 rounded-3xl p-6 space-y-2.5 shadow-xs transition"
                      >
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-extrabold text-purple-900 border-b border-purple-200/60 pb-2">
                          <Layers className="w-4 h-4 text-purple-700 shrink-0" />
                          <span>
                            Ngữ liệu nhóm [{groupStart.id.toUpperCase()}] &bull; Áp dụng cho các câu từ{' '}
                            {groupStart.fromNumber} đến {groupStart.toNumber}
                          </span>
                        </div>
                        <div className="text-sm sm:text-base text-slate-800 leading-relaxed font-normal pt-1">
                          <MathText text={groupStart.content} />
                        </div>
                      </div>
                    )}

                    <div
                      ref={(el) => {
                        questionRefs.current[key] = el;
                      }}
                      className={`bg-white border rounded-3xl p-6 sm:p-7 transition-all space-y-4 shadow-sm ${
                        isActive
                          ? 'border-emerald-600 ring-2 ring-emerald-100'
                          : 'border-slate-200/90 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-sm font-extrabold text-[#0f2d22] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                            Câu {q.number}.
                          </span>
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                              q.type === 'mcq'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : q.type === 'short_numeric'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : q.type === 'short_blanks'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {q.type === 'mcq'
                              ? 'Trắc nghiệm'
                              : q.type === 'short_numeric'
                              ? 'Trả lời ngắn số'
                              : q.type === 'short_blanks'
                              ? 'Điền khuyết'
                              : 'Khái niệm'}
                          </span>

                          {/* Huy hiệu liên kết tới nhóm ngữ liệu nếu câu này thuộc nhóm */}
                          {q.groupId && (
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.getElementById(`group-${q.groupId}`);
                                if (el) {
                                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }}
                              className="text-xs font-medium text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1 transition cursor-pointer"
                              title="Nhấn để cuộn tới ngữ liệu của câu này"
                            >
                              <Layers className="w-3 h-3 text-purple-600" />
                              <span>Nhóm [{q.groupId}]</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Nội dung câu hỏi */}
                      <div className="text-slate-800 text-sm sm:text-base leading-relaxed">
                        <MathText text={q.stem} />
                      </div>

                      {/* Dạng 1: Trắc nghiệm 4 lựa chọn (MCQ) */}
                      {q.type === 'mcq' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {(q.options || []).map((opt) => (
                            <label
                              key={opt.key}
                              className={`flex items-center gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition select-none ${
                                mcAnswers[key] === opt.key
                                  ? 'bg-emerald-50/90 border-emerald-600 text-emerald-950 font-semibold ring-1 ring-emerald-500 shadow-xs'
                                  : 'border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/20 text-slate-800'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q_${key}`}
                                checked={mcAnswers[key] === opt.key}
                                onChange={() => setMcAnswers((p) => ({ ...p, [key]: opt.key }))}
                                className="accent-emerald-700 w-4 h-4 cursor-pointer"
                              />
                              <span className="font-black text-sm text-slate-500 mr-0.5">
                                {opt.key}.
                              </span>
                              <div className="text-sm">
                                <MathText text={opt.text} />
                              </div>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Dạng 2: Trả lời ngắn số (short_numeric) */}
                      {q.type === 'short_numeric' && (
                        <div className="pt-1">
                          <input
                            type="text"
                            value={shortAnswers[key] || ''}
                            onChange={(e) =>
                              setShortAnswers((p) => ({ ...p, [key]: e.target.value }))
                            }
                            placeholder="Nhập kết quả số (VD: 48, 6.25, 0)"
                            className="w-full max-w-sm bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 font-mono text-sm focus:outline-none focus:border-[#0f2d22] focus:ring-1 focus:ring-[#0f2d22] shadow-2xs"
                          />
                        </div>
                      )}

                      {/* Dạng 3: Điền khuyết (short_blanks) */}
                      {q.type === 'short_blanks' && (
                        <div className="pt-1 space-y-2.5">
                          {q.blankPool && q.blankPool.length > 0 && (
                            <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200 text-xs text-slate-700 space-y-1.5">
                              <span className="font-extrabold text-purple-900 block">
                                Danh sách từ / cụm từ lựa chọn:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {q.blankPool.map((bp) => (
                                  <span key={bp.index} className="text-slate-800 font-medium">
                                    <strong className="text-purple-700">({bp.index})</strong>{' '}
                                    {bp.text}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <input
                            type="text"
                            value={shortAnswers[key] || ''}
                            onChange={(e) =>
                              setShortAnswers((p) => ({ ...p, [key]: e.target.value }))
                            }
                            placeholder="Nhập thứ tự số cách nhau bởi dấu '-' (VD: 1 - 2)"
                            className="w-full max-w-sm bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 font-mono text-sm focus:outline-none focus:border-[#0f2d22] focus:ring-1 focus:ring-[#0f2d22] shadow-2xs"
                          />
                        </div>
                      )}

                      {/* Dạng 4: Trả lời ngắn khái niệm (short_text) */}
                      {q.type === 'short_text' && (
                        <div className="pt-1">
                          <input
                            type="text"
                            value={shortAnswers[key] || ''}
                            onChange={(e) =>
                              setShortAnswers((p) => ({ ...p, [key]: e.target.value }))
                            }
                            placeholder="Nhập từ khoá / khái niệm (VD: Thực tiễn, Vi phạm pháp luật)"
                            className="w-full max-w-md bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-[#0f2d22] focus:ring-1 focus:ring-[#0f2d22] shadow-2xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* ===== CỘT PHẢI – BẢNG CÂU HỎI (3 cột, Sticky) ===== */}
        <aside className="hidden lg:block col-span-3">
          <div className="sticky top-[76px] bg-white border border-slate-200/90 rounded-3xl p-5 space-y-4 shadow-sm">
            <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold text-center border-b border-slate-100 pb-2">
              Bảng câu hỏi ({paperCode} &bull; {questions.length} câu)
            </h3>

            {/* Nút Tự luận */}
            <button
              onClick={() => {
                setActiveTab('essay');
                setActiveQuestion(null);
              }}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'essay'
                  ? 'bg-[#0f2d22] text-white shadow-xs'
                  : wordCount >= 1
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Tự luận ({wordCount >= 500 ? 'Đủ 500 chữ' : `${wordCount}/500`})</span>
            </button>

            {/* Lưới câu hỏi */}
            <div className="grid grid-cols-5 gap-1.5 max-h-[380px] overflow-y-auto pr-1">
              {questions.map((q) => {
                const num = q.number;
                const answered = isAnswered(num);
                const isActive = activeQuestion === String(num);

                return (
                  <button
                    key={num}
                    onClick={() => scrollToQuestion(num)}
                    title={`Câu ${num}`}
                    className={`w-full aspect-square rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center ${
                      isActive
                        ? 'bg-[#0f2d22] text-white ring-2 ring-emerald-400 shadow-xs'
                        : answered
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {String(num).padStart(2, '0')}
                  </button>
                );
              })}
            </div>

            {/* Thống kê tiến độ */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-slate-600 font-medium">
                <span>Tiến độ trắc nghiệm:</span>
                <span className="font-bold text-[#0f2d22]">
                  {answeredCount}/{questions.length} câu
                </span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Nút Nộp bài nhanh trong sidebar */}
            <button
              onClick={handleOpenSubmitModal}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-[#c1121f] hover:bg-[#a50f1a] transition rounded-xl text-xs font-bold text-white shadow-md shadow-red-950/20 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Nộp bài & Chấm điểm</span>
            </button>

            {/* Legend ghi chú */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />{' '}
                Đã làm
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200 inline-block" />{' '}
                Chưa làm
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-3 rounded bg-[#0f2d22] inline-block" /> Đang chọn
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* ===== MODAL XÁC NHẬN NỘP BÀI THI ===== */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header modal */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-[#c1121f] flex items-center justify-center shrink-0">
                <Send className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Xác nhận nộp bài thi</h3>
                <p className="text-xs text-slate-500">
                  {paperCode} &bull; {meta.subject} &bull; SBD: {sbd}
                </p>
              </div>
            </div>

            {/* Bảng tổng kết tình trạng bài làm */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 font-medium">Phần II (Trắc nghiệm):</span>
                <p className="text-sm font-bold text-emerald-800">
                  Đã làm: {answeredCount}/{questions.length} câu
                </p>
                {unansweredCount > 0 && (
                  <p className="text-xs text-red-600 font-semibold">
                    (Còn {unansweredCount} câu chưa điền)
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-medium">Phần I (Tự luận):</span>
                <p
                  className={`text-sm font-bold ${
                    wordCount >= 500 ? 'text-emerald-800' : 'text-red-600'
                  }`}
                >
                  {wordCount}/500 chữ
                </p>
                <p className="text-xs text-slate-500">
                  {wordCount >= 500 ? '✓ Đạt yêu cầu' : '⚠ Chưa đủ 500 từ'}
                </p>
              </div>

              <div className="col-span-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Thời gian còn lại:</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            {/* Lưu ý nộp bài */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Hệ thống sẽ tiến hành chấm điểm tự động toàn bộ 100 điểm (30 điểm Tự luận + 70 điểm Trắc nghiệm) và hiển thị bảng phân tích đáp án chi tiết. Bạn không thể sửa bài sau khi nộp.
              </span>
            </div>

            {/* Nút thao tác */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                onClick={executeSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#c1121f] hover:bg-[#a50f1a] transition rounded-xl text-xs sm:text-sm font-bold text-white shadow-md shadow-red-950/20 cursor-pointer active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Đang chấm điểm...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Nộp bài & Chấm điểm</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. FOOTER */}
      <footer className="bg-[#0a2018] text-emerald-100/60 text-xs py-5 px-4 text-center mt-12 border-t border-emerald-950">
        Phòng Thi Trực Tuyến &bull; Tuyển Sinh Văn Bằng 2 Công An Nhân Dân 2026
      </footer>
    </div>
  );
}

export default function ExamPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f8f7] text-slate-600 flex items-center justify-center text-sm font-semibold">
          Đang chuẩn bị phòng thi...
        </div>
      }
    >
      <ExamContent />
    </Suspense>
  );
}
