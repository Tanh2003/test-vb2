'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Send, FileText, Calculator, Flag, ChevronRight } from 'lucide-react';

type ActiveTab = 'essay' | 'mc';

const ESSAY_QUESTION =
  'Chủ tịch Hồ Chí Minh khẳng định: "Tương lai thuộc về thanh niên. Tương lai là cách mạng luôn tiến lên. Là chủ của tương lai, thanh niên không thể không có lý tưởng cao cả. Vì vậy thanh niên phải có cuộc sống chính trị tích cực và cách mạng." (Hồ Chí Minh toàn tập, Tập 12, NXB Chính trị quốc gia - Sự thật, 2011, trang 519). Anh/chị hãy viết một bài nghị luận (tối thiểu 500 chữ) trình bày cách hiểu của mình về nội dung đoạn trích trên và liên hệ với vai trò của thanh niên trong giai đoạn hiện nay.';

const SAMPLE_SINGLE = [
  {
    id: 'C01',
    content: 'Trong không gian véc tơ R³, cho hai véc tơ u₁=(2;-1;3), u₂=(1;2;-3). Tổ hợp tuyến tính 2u₁ - u₂ bằng',
    options: { A: '(3;-4;9)', B: '(3;0;9)', C: '(1;-4;6)', D: '(3;-4;6)' },
  },
  {
    id: 'C02',
    content: 'Cho hai ma trận A và B cấp 2×2. Phần tử thuộc hàng một và cột hai của ma trận A+B bằng',
    options: { A: '3', B: '2', C: '1', D: '0' },
  },
  {
    id: 'C03',
    content: 'Hạng của ma trận đơn vị cấp 3 bằng',
    options: { A: '3', B: '2', C: '1', D: '0' },
  },
];

const SAMPLE_GROUP = {
  groupId: 'N1',
  context: 'Trong không gian véc tơ R³, cho hệ véc tơ S = {u₁(3;2;2); u₂(2;3;2); u₃(2;2;3)}. Gọi A là ma trận có các dòng theo thứ tự là các véc tơ trong S.',
  subQuestions: [
    { id: 'C40', content: 'Mệnh đề nào sau đây là sai?', options: { A: 'Hệ S phụ thuộc tuyến tính.', B: 'Hệ {u₁,u₃} độc lập tuyến tính.', C: 'Hệ S độc lập tuyến tính.', D: 'Hệ {u₁,u₂} độc lập tuyến tính.' } },
    { id: 'C41', content: 'Định thức của ma trận A bằng', options: { A: '5', B: '7', C: '0', D: '15' } },
    { id: 'C42', content: 'Tổng bình phương các trị riêng của A bằng', options: { A: '50', B: '51', C: '9', D: '10' } },
  ],
};

const SAMPLE_SHORT = [
  { id: 'C46', content: 'Cho A=(aᵢⱼ) là ma trận vuông cấp 3 với aᵢⱼ = i² + j − min{i,j}. Tính det(2Aᵀ).' },
  { id: 'C47', content: 'Gọi M(a,b,c) là điểm cực trị của f(x,y,z) = x²+y²+z²−4x−6y+2z+2026. Tính 2a−b+c.' },
];

function formatTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export default function ExamPage() {
  const [sbd, setSbd] = useState('CAND-2026');
  const [timeLeft, setTimeLeft] = useState(9000);
  const [activeTab, setActiveTab] = useState<ActiveTab>('essay');
  const [essayText, setEssayText] = useState('');
  const [mcAnswers, setMcAnswers] = useState<Record<string, string>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    try {
      const info = localStorage.getItem('candidate_info');
      if (info) {
        const parsed = JSON.parse(info);
        if (parsed.sbd) setSbd(parsed.sbd);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;

  const isAnswered = useCallback(
    (qId: string) => {
      if (qId === 'ESSAY') return wordCount >= 1;
      if (mcAnswers[qId]) return true;
      if (shortAnswers[qId]?.trim()) return true;
      return false;
    },
    [wordCount, mcAnswers, shortAnswers],
  );

  const scrollToQuestion = (qId: string) => {
    setActiveQuestion(qId);
    if (qId === 'ESSAY') {
      setActiveTab('essay');
    } else {
      setActiveTab('mc');
      setTimeout(() => {
        questionRefs.current[qId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const handleSubmit = () => {
    if (confirm('Bạn có chắc chắn muốn nộp bài? Hành động này không thể hoàn tác.')) {
      alert('Bài thi đã được nộp thành công!');
    }
  };

  const timerColor = timeLeft <= 300 ? 'text-red-400' : timeLeft <= 600 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ===== HEADER STICKY ===== */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-lg">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between px-4 py-2.5 gap-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-semibold text-slate-300">SBD: <span className="text-amber-400 font-mono">{sbd}</span></span>
            <span className="hidden sm:inline text-slate-500">|</span>
            <span className="hidden sm:inline text-slate-400">Mã đề: <strong className="text-blue-400">CA1 - Toán cao cấp</strong></span>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1.5 font-mono text-lg font-bold ${timerColor}`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
            <button onClick={handleSubmit} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 transition rounded-lg text-sm font-bold text-white shadow shadow-red-600/40 cursor-pointer active:scale-[0.97]">
              <Send className="w-4 h-4" />
              Nộp bài
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN LAYOUT ===== */}
      <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-4 px-4 py-4">
        {/* ===== CỘT TRÁI (9 cột) ===== */}
        <main className="col-span-12 lg:col-span-9 space-y-4">
          {/* Tab buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('essay')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                activeTab === 'essay'
                  ? 'bg-blue-600 text-white shadow shadow-blue-600/40'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              Phần I: Tự luận (30 điểm)
            </button>
            <button
              onClick={() => setActiveTab('mc')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                activeTab === 'mc'
                  ? 'bg-blue-600 text-white shadow shadow-blue-600/40'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              <Calculator className="w-4 h-4" />
              Phần II: Trắc nghiệm (70 điểm)
            </button>
          </div>

          {/* ===== TAB TỰ LUẬN ===== */}
          {activeTab === 'essay' && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3">
                  <Flag className="w-3.5 h-3.5 text-amber-500" />
                  Câu hỏi nghị luận xã hội
                </div>
                <p className="text-slate-200 leading-relaxed text-[15px]">{ESSAY_QUESTION}</p>
              </div>

              <div className="relative">
                <textarea
                  value={essayText}
                  onChange={(e) => setEssayText(e.target.value)}
                  rows={16}
                  placeholder="Nhập bài viết tại đây..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-100 placeholder-slate-600 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent leading-relaxed"
                />
                <div className={`absolute bottom-3 right-4 text-sm font-mono font-bold ${wordCount >= 500 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {wordCount}/500 chữ
                </div>
              </div>
            </div>
          )}

          {/* ===== TAB TRẮC NGHIỆM ===== */}
          {activeTab === 'mc' && (
            <div className="space-y-5">
              {/* -- Câu đơn C01-C39 -- */}
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500 font-semibold">
                <ChevronRight className="w-4 h-4 text-blue-500" />
                Câu hỏi trắc nghiệm đơn (C01 – C39)
              </div>
              {SAMPLE_SINGLE.map((q) => (
                <div
                  key={q.id}
                  ref={(el) => { questionRefs.current[q.id] = el; }}
                  className={`bg-slate-900 border rounded-xl p-5 transition ${activeQuestion === q.id ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-slate-800'}`}
                >
                  <p className="text-sm font-bold text-amber-400 mb-2">Câu {q.id.replace('C', '')}.</p>
                  <p className="text-slate-200 mb-3 leading-relaxed">{q.content}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(['A', 'B', 'C', 'D'] as const).map((key) => (
                      <label
                        key={key}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition select-none ${
                          mcAnswers[q.id] === key
                            ? 'bg-blue-600/20 border-blue-500 text-white'
                            : 'border-slate-700/60 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={mcAnswers[q.id] === key}
                          onChange={() => setMcAnswers((p) => ({ ...p, [q.id]: key }))}
                          className="accent-blue-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="font-semibold text-sm mr-1">{key}.</span>
                        <span className="text-sm">{q.options[key]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {/* -- Câu nhóm C40-C45 -- */}
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500 font-semibold mt-6">
                <ChevronRight className="w-4 h-4 text-purple-500" />
                Câu hỏi nhóm (C40 – C45)
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <p className="text-xs uppercase tracking-widest text-purple-400 font-semibold mb-1">Ngữ liệu {SAMPLE_GROUP.groupId}</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{SAMPLE_GROUP.context}</p>
                </div>
                {SAMPLE_GROUP.subQuestions.map((sq) => (
                  <div
                    key={sq.id}
                    ref={(el) => { questionRefs.current[sq.id] = el; }}
                    className={`border-t border-slate-800 pt-4 ${activeQuestion === sq.id ? 'ring-1 ring-blue-500/30 rounded-lg p-3 -mx-1 border-blue-500' : ''}`}
                  >
                    <p className="text-sm font-bold text-amber-400 mb-2">Câu {sq.id.replace('C', '')}.</p>
                    <p className="text-slate-200 mb-3 text-sm leading-relaxed">{sq.content}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(['A', 'B', 'C', 'D'] as const).map((key) => (
                        <label
                          key={key}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition select-none text-sm ${
                            mcAnswers[sq.id] === key
                              ? 'bg-blue-600/20 border-blue-500 text-white'
                              : 'border-slate-700/60 hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={sq.id}
                            checked={mcAnswers[sq.id] === key}
                            onChange={() => setMcAnswers((p) => ({ ...p, [sq.id]: key }))}
                            className="accent-blue-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="font-semibold mr-1">{key}.</span>
                          <span>{sq.options[key]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* -- Trả lời ngắn C46-C50 -- */}
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500 font-semibold mt-6">
                <ChevronRight className="w-4 h-4 text-emerald-500" />
                Trả lời ngắn (C46 – C50)
              </div>
              {SAMPLE_SHORT.map((q) => (
                <div
                  key={q.id}
                  ref={(el) => { questionRefs.current[q.id] = el; }}
                  className={`bg-slate-900 border rounded-xl p-5 transition ${activeQuestion === q.id ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-slate-800'}`}
                >
                  <p className="text-sm font-bold text-amber-400 mb-2">Câu {q.id.replace('C', '')}.</p>
                  <p className="text-slate-200 mb-3 leading-relaxed text-sm">{q.content}</p>
                  <input
                    type="text"
                    value={shortAnswers[q.id] || ''}
                    onChange={(e) => setShortAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                    placeholder="Nhập đáp án (VD: -5, 1.25, 3/4)"
                    className="w-full max-w-xs bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
          )}
        </main>

        {/* ===== CỘT PHẢI – QUESTION PALETTE (3 cột, Sticky) ===== */}
        <aside className="hidden lg:block col-span-3">
          <div className="sticky top-[72px] bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
            <h3 className="text-xs uppercase tracking-widest text-slate-500 font-semibold text-center">Bảng câu hỏi</h3>

            {/* Nút Tự luận */}
            <button
              onClick={() => scrollToQuestion('ESSAY')}
              className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'essay' && activeQuestion === 'ESSAY'
                  ? 'bg-blue-600 text-white'
                  : isAnswered('ESSAY')
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              Tự luận
            </button>

            {/* Lưới 50 câu */}
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 50 }, (_, i) => {
                const num = i + 1;
                const qId = `C${num.toString().padStart(2, '0')}`;
                const answered = isAnswered(qId);
                const isActive = activeQuestion === qId;

                return (
                  <button
                    key={qId}
                    onClick={() => scrollToQuestion(qId)}
                    title={`Câu ${num}`}
                    className={`w-full aspect-square rounded-md text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                      isActive
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : answered
                        ? 'bg-blue-500/25 text-blue-300 border border-blue-500/40'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {num.toString().padStart(2, '0')}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 pt-1">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500/25 border border-blue-500/40 inline-block" /> Đã trả lời</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-800 inline-block" /> Chưa trả lời</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-600 ring-2 ring-blue-400 inline-block" /> Đang chọn</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
