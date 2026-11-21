'use client';

import React from 'react';
import { useExamStore } from '@/store/useExamStore';
import { FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import MathText from '@/components/common/MathText';

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
      {/* Khung đề bài (Nền trắng sang trọng) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-extrabold text-[#0f2d22]">
            <FileText className="w-4 h-4 text-amber-600" />
            <span>Phần I: Nghị Luận Xã Hội</span>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            30 Điểm &bull; Tối thiểu 500 chữ
          </span>
        </div>
        <div className="text-slate-800 text-sm sm:text-base leading-relaxed text-justify">
          <MathText text={questionPrompt} />
        </div>
      </div>

      {/* Khung nhập bài tự luận */}
      <div className="relative bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm">
        <textarea
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          value={essay}
          onChange={(e) => updateEssay(e.target.value)}
          placeholder="Nhập nội dung bài làm tự luận của bạn tại đây..."
          rows={18}
          className="w-full bg-slate-50/50 border border-slate-300 rounded-2xl p-5 text-slate-900 placeholder-slate-400 resize-y focus:outline-none focus:border-[#0f2d22] focus:bg-white text-sm sm:text-base leading-relaxed font-sans pb-16 transition"
        />

        {/* Bộ đếm số chữ */}
        <div className="absolute bottom-4 right-6">
          <div
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold border shadow-xs transition-all ${
              isSatisfied
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-red-50 border-red-300 text-red-700'
            }`}
          >
            {isSatisfied ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{wordCount} chữ (Đạt yêu cầu)</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span>{wordCount}/500 chữ &bull; Chưa đủ 500 chữ</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EssayTab;
