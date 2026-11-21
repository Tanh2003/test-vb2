'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
} from 'lucide-react';
import MathText from '@/components/common/MathText';
import { PaperCode, PAPER_META, ExtractedQuestion, ExtractedGroup } from '@/types/exam';
import { SAMPLES_BY_CODE } from '@/mock/mock-samples';

type ActiveTab = 'essay' | 'mc';

function formatTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function ExamContent() {
  const searchParams = useSearchParams();
  const examId = searchParams.get('id');
  const caParam = (searchParams.get('ca')?.toUpperCase() as PaperCode) || 'CA1';

  const [paperCode, setPaperCode] = useState<PaperCode>(caParam);
  const [essayPrompt, setEssayPrompt] = useState<string>('');
  const [groups, setGroups] = useState<ExtractedGroup[]>([]);
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);

  const [sbd, setSbd] = useState('CAND-2026');
  const [timeLeft, setTimeLeft] = useState(9000);
  const [activeTab, setActiveTab] = useState<ActiveTab>('essay');
  const [essayText, setEssayText] = useState('');
  const [mcAnswers, setMcAnswers] = useState<Record<string, string>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const initExam = useCallback(
    (data: {
      paperCode?: string;
      examCode?: string;
      essay?: { prompt?: string; question?: string };
      groups?: ExtractedGroup[];
      questions?: ExtractedQuestion[];
      durationMinutes?: number;
    }) => {
      const code = (data.paperCode || data.examCode || caParam || 'CA1').toUpperCase() as PaperCode;
      setPaperCode(code);
      setEssayPrompt(data.essay?.prompt || data.essay?.question || '');
      setGroups(data.groups || []);
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        const sample = SAMPLES_BY_CODE[code] || SAMPLES_BY_CODE.CA1;
        setQuestions(sample.questions);
      }
      if (data.durationMinutes) {
        setTimeLeft(data.durationMinutes * 60);
      }
    },
    [caParam],
  );

  // 1. Tải đề thi từ CSDL hoặc localStorage hoặc Sample
  useEffect(() => {
    let loaded = false;

    // Thử load từ localStorage theo examId
    if (examId) {
      try {
        const stored = localStorage.getItem(`exam_current_${examId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          initExam(parsed);
          loaded = true;
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Thử load từ localStorage theo mã đề caParam
    if (!loaded) {
      try {
        const storedCa = localStorage.getItem(`parsed_exam_${caParam}`);
        if (storedCa) {
          const parsed = JSON.parse(storedCa);
          initExam(parsed);
          loaded = true;
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Fallback: Dùng sample chuẩn tương ứng của mã đề
    if (!loaded) {
      const sample = SAMPLES_BY_CODE[caParam] || SAMPLES_BY_CODE.CA1;
      initExam(sample);
    }
  }, [examId, caParam, initExam]);

  // 2. Tải SBD từ candidate_info
  useEffect(() => {
    try {
      const info = localStorage.getItem('candidate_info');
      if (info) {
        const parsed = JSON.parse(info);
        if (parsed.sbd) setSbd(parsed.sbd);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // 3. Bộ đếm ngược thời gian
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;

  const isAnswered = useCallback(
    (num: number) => {
      const key = String(num);
      if (mcAnswers[key]) return true;
      if (shortAnswers[key]?.trim()) return true;
      return false;
    },
    [mcAnswers, shortAnswers],
  );

  const scrollToQuestion = (num: number) => {
    const key = String(num);
    setActiveQuestion(key);
    setActiveTab('mc');
    setTimeout(() => {
      questionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleSubmit = () => {
    if (confirm('Bạn có chắc chắn muốn nộp bài? Hành động này không thể hoàn tác.')) {
      alert('Bài thi đã được nộp thành công! Hệ thống đang chuyển sang màn hình chấm điểm...');
    }
  };

  const timerColor =
    timeLeft <= 300
      ? 'bg-red-500/20 text-red-200 border-red-500/40 animate-pulse'
      : timeLeft <= 600
      ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
      : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';

  const meta = PAPER_META[paperCode] || PAPER_META.CA1;

  return (
    <div className="min-h-screen bg-[#f7f8f7] text-slate-800 font-sans flex flex-col justify-between">
      {/* ===== HEADER STICKY (XANH RÊU CAND) ===== */}
      <header className="sticky top-0 z-50 bg-[#0f2d22] text-white shadow-md border-b border-emerald-900/60">
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
                Mã đề: <strong className="text-amber-400 font-extrabold">{paperCode}</strong> &bull; {meta.subject}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`flex items-center gap-1.5 font-mono text-sm sm:text-base font-extrabold px-3 py-1.5 rounded-xl border ${timerColor}`}>
              <Clock className="w-4 h-4 shrink-0" />
              <span>{formatTime(timeLeft)}</span>
            </div>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#c1121f] hover:bg-[#a50f1a] transition rounded-xl text-xs sm:text-sm font-bold text-white shadow-md shadow-red-950/30 cursor-pointer active:scale-[0.97]"
            >
              <Send className="w-4 h-4" />
              <span>Nộp bài</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN EXAM LAYOUT (NỀN SÁNG CAO CẤP) ===== */}
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
              {/* Hiển thị Nhóm tình huống nếu có */}
              {groups.map((grp) => (
                <div key={grp.id} className="bg-purple-50/70 border border-purple-200 rounded-3xl p-6 space-y-2.5 shadow-xs">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-extrabold text-purple-900">
                    <Layers className="w-4 h-4 text-purple-700" />
                    <span>Ngữ liệu nhóm [{grp.id}] &bull; Áp dụng cho các câu từ {grp.fromNumber} đến {grp.toNumber}</span>
                  </div>
                  <div className="text-sm sm:text-base text-slate-800 leading-relaxed font-normal">
                    <MathText text={grp.content} />
                  </div>
                </div>
              ))}

              {/* Danh sách câu hỏi */}
              {questions.map((q) => {
                const key = String(q.number);
                const isActive = activeQuestion === key;

                return (
                  <div
                    key={q.number}
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
                      <div className="flex items-center gap-2.5">
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
                        {q.groupId && (
                          <span className="text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                            Nhóm: {q.groupId}
                          </span>
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
                          onChange={(e) => setShortAnswers((p) => ({ ...p, [key]: e.target.value }))}
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
                                  <strong className="text-purple-700">({bp.index})</strong> {bp.text}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <input
                          type="text"
                          value={shortAnswers[key] || ''}
                          onChange={(e) => setShortAnswers((p) => ({ ...p, [key]: e.target.value }))}
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
                          onChange={(e) => setShortAnswers((p) => ({ ...p, [key]: e.target.value }))}
                          placeholder="Nhập từ khoá / khái niệm (VD: Thực tiễn, Vi phạm pháp luật)"
                          className="w-full max-w-md bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-[#0f2d22] focus:ring-1 focus:ring-[#0f2d22] shadow-2xs"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* ===== CỘT PHẢI – BẢNG CÂU HỎI (3 cột, Sticky, Nền trắng sang trọng) ===== */}
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

            {/* Lưới câu hỏi động */}
            <div className="grid grid-cols-5 gap-1.5 max-h-[440px] overflow-y-auto pr-1">
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

            {/* Legend ghi chú */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" /> Đã làm
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200 inline-block" /> Chưa làm
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-3 rounded bg-[#0f2d22] inline-block" /> Đang chọn
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* 3. FOOTER */}
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
