'use client';

import React from 'react';
import { useExamStore } from '@/store/useExamStore';
import { FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

interface EssayTabProps {
  questionPrompt?: string;
}

const DEFAULT_ESSAY_PROMPT =
  'Chủ tịch Hồ Chí Minh khẳng định: “Tương lai thuộc về thanh niên. Tương lai là cách mạng luôn tiến lên. Là chủ của tương lai, thanh niên không thể không có lý tưởng cao cả. Vì vậy thanh niên phải có cuộc sống chính trị tích cực và cách mạng.” (Hồ Chí Minh toàn tập, Tập 12, NXB Chính trị quốc gia - Sự thật, 2011, trang 519). Anh/chị hãy viết một bài nghị luận (tối thiểu 500 chữ) trình bày cách hiểu của mình về nội dung đoạn trích trên và liên hệ với vai trò của thanh niên trong giai đoạn hiện nay.';

export const EssayTab: React.FC<EssayTabProps> = ({
  questionPrompt = DEFAULT_ESSAY_PROMPT,
}) => {
  const essay = useExamStore((state) => state.answers.essay);
  const updateEssay = useExamStore((state) => state.updateEssay);

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  const isSatisfied = wordCount >= 500;

  return (
    <div className="space-y-4">
      {/* Khung đề bài */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-slate-400">
            <FileText className="w-4 h-4 text-amber-500" />
            <span>Phần I: Nghị Luận Xã Hội</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            30 Điểm (Tối thiểu 500 chữ)
          </span>
        </div>
        <p className="text-slate-200 text-sm sm:text-base leading-relaxed text-justify">
          {questionPrompt}
        </p>
      </div>

      {/* Khung nhập bài tự luận */}
      <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-inner">
        <textarea
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          value={essay}
          onChange={(e) => updateEssay(e.target.value)}
          placeholder="Nhập nội dung bài làm tự luận của bạn tại đây..."
          rows={18}
          className="w-full bg-transparent text-slate-100 placeholder-slate-600 resize-y focus:outline-none text-sm sm:text-base leading-relaxed font-sans pb-12"
        />

        {/* Bộ đếm số chữ ở góc dưới bên phải */}
        <div className="absolute bottom-3 right-4">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border backdrop-blur transition-all ${
              isSatisfied
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400 shadow-sm shadow-emerald-500/10'
                : 'bg-red-950/80 border-red-500/40 text-red-400 shadow-sm shadow-red-500/10'
            }`}
          >
            {isSatisfied ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{wordCount} chữ (Đạt yêu cầu)</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                <span>{wordCount}/500 chữ &bull; Chưa đạt tối thiểu 500 chữ</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EssayTab;
