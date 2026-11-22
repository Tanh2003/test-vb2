'use client';

import React, { useState, useMemo } from 'react';
import MathText from '@/components/common/MathText';
import {
  PaperCode,
  PAPER_META,
  QuestionType,
  OptionKey,
  SingleChoiceQuestion,
  GroupQuestion,
  ShortAnswerQuestion,
} from '@/types/exam';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  Layers,
  ChevronDown,
  ChevronUp,
  Tag,
  Sparkles,
  Edit3,
} from 'lucide-react';

export interface PreviewQuestion {
  number: number;
  type: QuestionType;
  groupId?: string;
  stem: string;
  options: { key: OptionKey; text: string }[];
  blankPool?: { index: number; text: string }[];
  blankCount?: number;
  hasFigureOrTable?: boolean;
  confidence?: number;
  correctAnswer?: string;
  explanation?: string;
  needsReview?: boolean;
}

export interface ParsedData {
  id?: string;
  ownerId?: string;
  userId?: string;
  ownerName?: string;
  ownerEmail?: string;
  paperCode?: string;
  examCode?: string;
  examTitle?: string;
  title?: string;
  subject?: string;
  durationMinutes?: number;
  year?: number;
  totalPages?: number;
  essay: {
    prompt: string;
    citation?: string;
    minWords: number;
    maxPoints: number;
    question?: string;
    points?: number;
  };
  groups?: Array<{
    id: string;
    fromNumber: number;
    toNumber: number;
    content: string;
  }>;
  questions?: PreviewQuestion[];
  validationErrors?: string[];
  warnings?: string[];
  pdfFileUrl?: string;
  pdfFileName?: string;
  b2FileId?: string;
  answerPdfFileUrl?: string;
  answerPdfFileName?: string;
  b2UploadedAt?: string;
  // Backward compatibility fields
  singleChoices?: SingleChoiceQuestion[];
  groupQuestions?: GroupQuestion[];
  shortAnswers?: ShortAnswerQuestion[];
}

export const isQuestionAnswerValid = (q: PreviewQuestion): boolean => {
  const ans = (q.correctAnswer || '').trim();
  if (!ans) return false;
  if (q.type === 'mcq') {
    return ['A', 'B', 'C', 'D'].includes(ans.toUpperCase());
  }
  return ans.length > 0;
};

interface Props {
  data: ParsedData;
  onChange: (updated: ParsedData) => void;
}

export const ParsedExamPreview: React.FC<Props> = ({ data, onChange }) => {
  const paperCode = (data.paperCode || data.examCode || 'CA1').toUpperCase() as PaperCode;
  const meta = PAPER_META[paperCode] || PAPER_META.CA1;

  const [activeFilter, setActiveFilter] = useState<
    'ALL' | 'mcq' | 'short_numeric' | 'short_blanks' | 'short_text' | 'REVIEW' | 'MISSING'
  >('ALL');
  const [showGroups, setShowGroups] = useState(true);
  const [showEssay, setShowEssay] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);

  // Chuẩn hóa danh sách câu hỏi
  const questions: PreviewQuestion[] = useMemo(() => {
    if (data.questions && data.questions.length > 0) {
      return data.questions;
    }
    const list: PreviewQuestion[] = [];
    if (data.singleChoices) {
      for (const sc of data.singleChoices) {
        const num = parseInt(sc.id?.replace(/\D/g, '') || '0', 10);
        list.push({
          number: num,
          type: 'mcq',
          stem: sc.content || '',
          options: [
            { key: 'A', text: sc.options?.A || '' },
            { key: 'B', text: sc.options?.B || '' },
            { key: 'C', text: sc.options?.C || '' },
            { key: 'D', text: sc.options?.D || '' },
          ],
          correctAnswer: sc.correctAnswer || '',
          blankPool: [],
          blankCount: 0,
          confidence: 0.95,
        });
      }
    }
    if (data.groupQuestions) {
      for (const g of data.groupQuestions) {
        for (const sq of g.subQuestions || []) {
          const num = parseInt(sq.id?.replace(/\D/g, '') || '0', 10);
          list.push({
            number: num,
            type: 'mcq',
            groupId: g.id,
            stem: sq.content || '',
            options: [
              { key: 'A', text: sq.options?.A || '' },
              { key: 'B', text: sq.options?.B || '' },
              { key: 'C', text: sq.options?.C || '' },
              { key: 'D', text: sq.options?.D || '' },
            ],
            correctAnswer: sq.correctAnswer || '',
            blankPool: [],
            blankCount: 0,
            confidence: 0.95,
          });
        }
      }
    }
    if (data.shortAnswers) {
      for (const sa of data.shortAnswers) {
        const num = parseInt(sa.id?.replace(/\D/g, '') || '0', 10);
        list.push({
          number: num,
          type: 'short_numeric',
          stem: sa.content || '',
          options: [],
          blankPool: [],
          blankCount: 0,
          correctAnswer: sa.correctAnswer || '',
          confidence: 0.95,
        });
      }
    }
    return list.sort((a, b) => a.number - b.number);
  }, [data]);

  // Thống kê theo loại
  const counts = useMemo(() => {
    let mcq = 0;
    let short_numeric = 0;
    let short_blanks = 0;
    let short_text = 0;
    let review = 0;
    let missing = 0;
    for (const q of questions) {
      if (q.type === 'mcq') mcq++;
      else if (q.type === 'short_numeric') short_numeric++;
      else if (q.type === 'short_blanks') short_blanks++;
      else if (q.type === 'short_text') short_text++;

      if (q.needsReview || (q.confidence !== undefined && q.confidence < 0.8) || q.hasFigureOrTable) {
        review++;
      }
      if (!isQuestionAnswerValid(q)) {
        missing++;
      }
    }
    return { total: questions.length, mcq, short_numeric, short_blanks, short_text, review, missing };
  }, [questions]);

  // Bộ lọc câu hỏi
  const filteredQuestions = useMemo(() => {
    if (activeFilter === 'ALL') return questions;
    if (activeFilter === 'MISSING') {
      return questions.filter((q) => !isQuestionAnswerValid(q));
    }
    if (activeFilter === 'REVIEW') {
      return questions.filter(
        (q) => q.needsReview || (q.confidence !== undefined && q.confidence < 0.8) || q.hasFigureOrTable
      );
    }
    return questions.filter((q) => q.type === activeFilter);
  }, [questions, activeFilter]);

  // Handlers cập nhật
  const updateQuestion = (idx: number, patch: Partial<PreviewQuestion>) => {
    const updated = [...questions];
    updated[idx] = { ...updated[idx], ...patch };
    onChange({ ...data, questions: updated });
  };

  const updateOptionText = (qIdx: number, optKey: OptionKey, newText: string) => {
    const q = questions[qIdx];
    const opts = (q.options || []).map((o) => (o.key === optKey ? { ...o, text: newText } : o));
    updateQuestion(qIdx, { options: opts });
  };

  const updateBlankPoolItem = (qIdx: number, poolIdx: number, text: string) => {
    const q = questions[qIdx];
    const pool = [...(q.blankPool || [])];
    if (pool[poolIdx]) {
      pool[poolIdx] = { ...pool[poolIdx], text };
      updateQuestion(qIdx, { blankPool: pool });
    }
  };

  const addBlankPoolItem = (qIdx: number) => {
    const q = questions[qIdx];
    const pool = [...(q.blankPool || [])];
    const nextIdx = pool.length + 1;
    pool.push({ index: nextIdx, text: `Cụm từ (${nextIdx})` });
    updateQuestion(qIdx, { blankPool: pool });
  };

  const updateEssayField = (field: 'prompt' | 'citation' | 'minWords' | 'maxPoints', val: string | number) => {
    onChange({
      ...data,
      essay: {
        ...data.essay,
        [field]: val,
        question: field === 'prompt' ? String(val) : (data.essay.question || data.essay.prompt),
      },
    });
  };

  const updateGroup = (gIdx: number, patch: Partial<NonNullable<ParsedData['groups']>[0]>) => {
    const grps = [...(data.groups || [])];
    grps[gIdx] = { ...grps[gIdx], ...patch };
    onChange({ ...data, groups: grps });
  };

  const isMatchedExpected = questions.length === meta.expectedQuestions;

  return (
    <div className="space-y-6 text-slate-800">
      {/* 1. HEADER THÔNG TIN ĐỀ & THỐNG KÊ (NỀN TRẮNG SÁNG CAO CẤP) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 rounded-xl font-extrabold text-sm sm:text-base tracking-wider bg-[#0f2d22] text-amber-400 shadow-xs">
              MÃ ĐỀ: {paperCode}
            </span>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl text-[#0f2d22]">
                {meta.subject}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {meta.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 ${
                isMatchedExpected
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border border-amber-300'
              }`}
            >
              {isMatchedExpected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              )}
              <span>
                {questions.length}/{meta.expectedQuestions} câu ({isMatchedExpected ? 'Đủ chuẩn' : 'Cần kiểm tra'})
              </span>
            </span>
            <span className="px-3 py-1.5 rounded-xl font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Thời gian: {data.durationMinutes || 150} phút
            </span>
          </div>
        </div>

        {/* Cảnh báo kiểm duyệt nếu có */}
        {((data.warnings && data.warnings.length > 0) || (data.validationErrors && data.validationErrors.length > 0)) && (
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
            <div
              className="flex items-center justify-between cursor-pointer font-bold select-none text-amber-900"
              onClick={() => setShowWarnings(!showWarnings)}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Thông báo kiểm duyệt AI ({((data.warnings?.length || 0) + (data.validationErrors?.length || 0))} mục)
                </span>
              </span>
              {showWarnings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
            {showWarnings && (
              <ul className="list-disc list-inside space-y-1 pl-1 pt-1 text-amber-800 text-xs">
                {data.validationErrors?.map((err, i) => (
                  <li key={`val-${i}`} className="font-semibold text-red-700">
                    {err}
                  </li>
                ))}
                {data.warnings?.map((w, i) => (
                  <li key={`warn-${i}`}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* 5 Thẻ thống kê dạng câu (Nền nhẹ sáng) */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-1">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-center">
            <div className="text-xs text-slate-500 font-semibold mb-0.5">Trắc nghiệm MCQ</div>
            <div className="text-lg font-extrabold text-blue-700">{counts.mcq} câu</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-center">
            <div className="text-xs text-slate-500 font-semibold mb-0.5">Trả lời ngắn số</div>
            <div className="text-lg font-extrabold text-emerald-700">{counts.short_numeric} câu</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-center">
            <div className="text-xs text-slate-500 font-semibold mb-0.5">Điền khuyết (Blanks)</div>
            <div className="text-lg font-extrabold text-purple-700">{counts.short_blanks} câu</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-center">
            <div className="text-xs text-slate-500 font-semibold mb-0.5">Khái niệm (Text)</div>
            <div className="text-lg font-extrabold text-amber-700">{counts.short_text} câu</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-center">
            <div className="text-xs text-slate-500 font-semibold mb-0.5">Cần xem lại (!)</div>
            <div className={`text-lg font-extrabold ${counts.review > 0 ? 'text-red-600' : 'text-slate-400'}`}>
              {counts.review} câu
            </div>
          </div>
          <div className={`p-3 rounded-2xl border text-center ${counts.missing > 0 ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'}`}>
            <div className={`text-xs font-semibold mb-0.5 ${counts.missing > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
              {counts.missing > 0 ? 'Thiếu đáp án' : 'Đủ đáp án'}
            </div>
            <div className={`text-lg font-extrabold ${counts.missing > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {counts.missing > 0 ? `${counts.missing} câu` : '100%'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. PHẦN I: TỰ LUẬN (30 ĐIỂM) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-3">
        <div
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={() => setShowEssay(!showEssay)}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-[#0f2d22]">
                Phần I: Nghị luận Xã hội (30 Điểm)
              </h4>
              <p className="text-xs text-slate-500 font-medium">Đề tự luận chung cho thí sinh dự thi</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
              Tối thiểu {data.essay.minWords || 500} chữ &bull; {data.essay.maxPoints || 30} điểm
            </span>
            {showEssay ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>
        </div>

        {showEssay && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nội dung đề bài tự luận:
              </label>
              <textarea
                rows={4}
                value={data.essay.prompt || data.essay.question || ''}
                onChange={(e) => updateEssayField('prompt', e.target.value)}
                className="w-full bg-slate-50/70 border border-slate-300 rounded-2xl p-4 text-sm text-slate-800 focus:outline-none focus:border-[#0f2d22] focus:bg-white transition leading-relaxed"
              />
            </div>

            {data.essay.citation !== undefined && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nguồn trích dẫn (Citation):
                </label>
                <input
                  type="text"
                  value={data.essay.citation || ''}
                  onChange={(e) => updateEssayField('citation', e.target.value)}
                  placeholder="VD: Hồ Chí Minh toàn tập, Tập 12, NXB Chính trị quốc gia..."
                  className="w-full bg-slate-50/70 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0f2d22] focus:bg-white transition"
                />
              </div>
            )}

            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/80 text-xs text-slate-800 space-y-1">
              <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                Xem trước đề tự luận (LaTeX / Markdown):
              </span>
              <div className="pt-1 text-sm leading-relaxed text-slate-800">
                <MathText text={data.essay.prompt || data.essay.question || ''} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. PHẦN II: NGỮ LIỆU / TÌNH HUỐNG CHUNG (NẾU CÓ) */}
      {data.groups && data.groups.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-3">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setShowGroups(!showGroups)}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4 text-purple-700" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-[#0f2d22]">
                  Đoạn ngữ liệu / Tình huống chung ({data.groups.length} nhóm)
                </h4>
                <p className="text-xs text-slate-500 font-medium">Áp dụng cho các câu hỏi chùm</p>
              </div>
            </div>
            {showGroups ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>

          {showGroups && (
            <div className="space-y-4 pt-3 border-t border-slate-100">
              {data.groups.map((grp, gIdx) => (
                <div key={grp.id || gIdx} className="bg-purple-50/40 border border-purple-200 rounded-2xl p-4 sm:p-5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-purple-700" />
                      Nhóm [{grp.id}] &bull; Áp dụng cho các câu từ {grp.fromNumber} đến {grp.toNumber}
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={grp.content}
                    onChange={(e) => updateGroup(gIdx, { content: e.target.value })}
                    className="w-full bg-white border border-purple-300 rounded-xl p-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-purple-600 transition"
                  />
                  <div className="bg-white/80 p-3 rounded-xl border border-purple-200/70 text-xs sm:text-sm text-slate-700 leading-relaxed">
                    <MathText text={grp.content} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. BẢNG ĐIỀN NHANH ĐÁP ÁN CHO ĐỀ THI */}
      <div id="answer-matrix-section" className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-[#0f2d22]">
                Bảng Đáp Án Đề Thi ({questions.length - counts.missing}/{questions.length} câu)
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                Điền nhanh phương án đúng cho các câu hỏi trước khi lưu vào ngân hàng đề
              </p>
            </div>
          </div>

          {counts.missing > 0 ? (
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Bắt buộc: Còn {counts.missing} câu chưa có đáp án</span>
            </span>
          ) : (
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Đã đủ 100% đáp án (Đủ điều kiện lưu đề)</span>
            </span>
          )}
        </div>

        {/* Ma trận nút bấm chọn đáp án nhanh */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-2 max-h-[360px] overflow-y-auto p-1">
          {questions.map((q) => {
            const originalIdx = questions.findIndex((item) => item.number === q.number);
            const hasAns = isQuestionAnswerValid(q);

            return (
              <div
                key={q.number}
                className={`p-2 rounded-xl border flex flex-col justify-between gap-1.5 transition ${
                  hasAns
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-300'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(`question-card-${q.number}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="text-[#0f2d22] hover:underline cursor-pointer"
                    title={`Cuộn đến Câu ${q.number}`}
                  >
                    C.{q.number}
                  </button>
                  <span
                    className={`text-[9px] uppercase px-1 rounded ${
                      hasAns
                        ? 'bg-emerald-200/60 text-emerald-900 font-bold'
                        : 'bg-amber-200 text-amber-900 font-extrabold'
                    }`}
                  >
                    {hasAns ? q.correctAnswer : 'Thiếu'}
                  </span>
                </div>

                {q.type === 'mcq' ? (
                  <div className="grid grid-cols-4 gap-0.5">
                    {(['A', 'B', 'C', 'D'] as const).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateQuestion(originalIdx, { correctAnswer: key })}
                        className={`py-1 text-[10px] font-black rounded transition cursor-pointer ${
                          q.correctAnswer === key
                            ? 'bg-emerald-700 text-white shadow-2xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={q.correctAnswer || ''}
                    onChange={(e) =>
                      updateQuestion(originalIdx, { correctAnswer: e.target.value })
                    }
                    placeholder={q.type === 'short_numeric' ? 'Số...' : 'Chữ...'}
                    className="w-full text-[10px] font-mono bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. PHẦN IV: DANH SÁCH CÂU HỎI & BỘ LỌC */}
      <div className="space-y-4">
        {/* Bộ lọc loại câu hỏi */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeFilter === 'ALL'
                  ? 'bg-[#0f2d22] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tất cả ({counts.total})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('mcq')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeFilter === 'mcq'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Trắc nghiệm ({counts.mcq})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('short_numeric')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeFilter === 'short_numeric'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Trả lời ngắn số ({counts.short_numeric})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('short_blanks')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeFilter === 'short_blanks'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Điền khuyết ({counts.short_blanks})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('short_text')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeFilter === 'short_text'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Khái niệm ({counts.short_text})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveFilter('MISSING')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'MISSING'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : counts.missing > 0
                  ? 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 font-extrabold'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Chưa có đáp án ({counts.missing})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('REVIEW')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'REVIEW'
                  ? 'bg-[#c1121f] text-white shadow-xs'
                  : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Cần xem lại ({counts.review})</span>
            </button>
          </div>
        </div>

        {/* Danh sách từng câu hỏi (Nền thẻ trắng đẹp mắt) */}
        <div className="space-y-4">
          {filteredQuestions.map((q) => {
            const originalIdx = questions.findIndex((item) => item.number === q.number);
            const hasAns = isQuestionAnswerValid(q);

            return (
              <div
                key={q.number}
                id={`question-card-${q.number}`}
                className={`bg-white border rounded-3xl p-6 space-y-4 transition-all shadow-sm ${
                  !hasAns
                    ? 'border-amber-400 ring-2 ring-amber-100'
                    : q.needsReview
                    ? 'border-red-400 ring-2 ring-red-100'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Header câu hỏi */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-extrabold text-sm text-[#0f2d22] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                      Câu {q.number}
                    </span>

                    {/* Badge loại câu */}
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
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
                        ? 'Trắc nghiệm 4 phương án'
                        : q.type === 'short_numeric'
                        ? 'Trả lời ngắn số'
                        : q.type === 'short_blanks'
                        ? 'Điền khuyết chỗ trống'
                        : 'Trả lời ngắn khái niệm'}
                    </span>

                    {/* Badge nhóm */}
                    {q.groupId && (
                      <span className="text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                        Nhóm: {q.groupId}
                      </span>
                    )}

                    {q.hasFigureOrTable && (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        Hình vẽ / Bảng
                      </span>
                    )}

                    {!hasAns && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>Chưa có đáp án</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuestion(originalIdx, { needsReview: !q.needsReview })
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 ${
                        q.needsReview
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{q.needsReview ? 'Đánh dấu cần xem lại' : 'Đã chuẩn hoá'}</span>
                    </button>
                  </div>
                </div>

                {/* Nội dung câu hỏi (Stem) */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Nội dung câu hỏi:
                  </label>
                  <textarea
                    rows={2}
                    value={q.stem}
                    onChange={(e) => updateQuestion(originalIdx, { stem: e.target.value })}
                    className="w-full bg-slate-50/70 border border-slate-300 rounded-xl p-3 text-sm text-slate-800 focus:outline-none focus:border-[#0f2d22] focus:bg-white transition"
                  />
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-sm text-slate-800 leading-relaxed">
                    <MathText text={q.stem} />
                  </div>
                </div>

                {/* Phương án cho Trắc nghiệm (MCQ) */}
                {q.type === 'mcq' && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>4 Phương án A - B - C - D:</span>
                      <div className="flex items-center gap-2 font-normal">
                        <span className="font-semibold text-slate-600">Đáp án đúng:</span>
                        {!q.correctAnswer && (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                            (Chưa chọn)
                          </span>
                        )}
                        <div className="flex items-center gap-1.5">
                          {(['A', 'B', 'C', 'D'] as const).map((key) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => updateQuestion(originalIdx, { correctAnswer: key })}
                              className={`w-8 h-8 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                                q.correctAnswer === key
                                  ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-200'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                              }`}
                            >
                              {key}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      {(q.options || []).map((opt) => (
                        <div
                          key={opt.key}
                          className={`p-3 rounded-2xl border flex items-center gap-3 transition ${
                            q.correctAnswer === opt.key
                              ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-300'
                              : 'bg-slate-50/70 border-slate-200'
                          }`}
                        >
                          <span
                            className={`font-black text-sm w-5 shrink-0 ${
                              q.correctAnswer === opt.key ? 'text-emerald-700' : 'text-slate-500'
                            }`}
                          >
                            {opt.key}.
                          </span>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => updateOptionText(originalIdx, opt.key, e.target.value)}
                            className="w-full bg-transparent text-slate-800 text-xs sm:text-sm focus:outline-none"
                          />
                          <div className="shrink-0 text-slate-600 pl-2.5 border-l border-slate-200 max-w-[130px] truncate text-xs">
                            <MathText text={opt.text} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dạng Trả lời ngắn số (short_numeric) */}
                {q.type === 'short_numeric' && (
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-emerald-900 text-sm">Đáp án số:</span>
                      <input
                        type="text"
                        value={q.correctAnswer || ''}
                        onChange={(e) =>
                          updateQuestion(originalIdx, { correctAnswer: e.target.value })
                        }
                        placeholder="VD: 48, 6.25, 0"
                        className="bg-white border border-emerald-300 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-emerald-900 w-40 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      />
                    </div>
                    <span className="text-slate-500 text-xs">
                      (Chấp nhận số nguyên, số thập phân hoặc danh sách số cách nhau dấu chấm phẩy)
                    </span>
                  </div>
                )}

                {/* Dạng Điền khuyết (short_blanks) */}
                {q.type === 'short_blanks' && (
                  <div className="bg-purple-50/50 border border-purple-200 rounded-2xl p-4 space-y-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="font-extrabold text-purple-900 text-sm">Đáp án điền khuyết:</span>
                        <input
                          type="text"
                          value={q.correctAnswer || ''}
                          onChange={(e) =>
                            updateQuestion(originalIdx, { correctAnswer: e.target.value })
                          }
                          placeholder="VD: 1 - 2 hoặc 2 - 4 - 1"
                          className="bg-white border border-purple-300 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-purple-900 w-48 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 font-semibold">Số chỗ trống:</span>
                        <input
                          type="number"
                          value={q.blankCount || 2}
                          onChange={(e) =>
                            updateQuestion(originalIdx, {
                              blankCount: parseInt(e.target.value, 10) || 1,
                            })
                          }
                          className="bg-white border border-purple-300 rounded-lg px-2 py-1 text-xs w-14 text-center text-slate-800 font-bold"
                        />
                      </div>
                    </div>

                    {/* Blank pool */}
                    <div className="pt-2.5 border-t border-purple-200/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-purple-900">
                          Ngân hàng từ / cụm từ lựa chọn (Blank Pool):
                        </span>
                        <button
                          type="button"
                          onClick={() => addBlankPoolItem(originalIdx)}
                          className="text-xs text-purple-700 hover:text-purple-900 font-extrabold cursor-pointer"
                        >
                          + Thêm từ lựa chọn
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(q.blankPool || []).map((bp, bpIdx) => (
                          <div
                            key={bp.index || bpIdx}
                            className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-purple-200 shadow-2xs"
                          >
                            <span className="font-black text-purple-700">({bp.index})</span>
                            <input
                              type="text"
                              value={bp.text}
                              onChange={(e) =>
                                updateBlankPoolItem(originalIdx, bpIdx, e.target.value)
                              }
                              className="w-full bg-transparent text-slate-800 text-xs focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Dạng Khái niệm (short_text) */}
                {q.type === 'short_text' && (
                  <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="font-extrabold text-amber-900 text-sm">Từ khoá / Khái niệm:</span>
                      <input
                        type="text"
                        value={q.correctAnswer || ''}
                        onChange={(e) =>
                          updateQuestion(originalIdx, { correctAnswer: e.target.value })
                        }
                        placeholder="VD: Thực tiễn, Vi phạm pháp luật"
                        className="bg-white border border-amber-300 rounded-xl px-4 py-2 text-sm font-bold text-amber-950 w-72 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                      />
                    </div>
                    <span className="text-slate-500 text-xs">
                      (Hệ thống chấm điểm so khớp từ khoá hoặc AI)
                    </span>
                  </div>
                )}

                {/* Hướng dẫn giải / Căn cứ trích dẫn */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="block text-xs font-bold text-slate-600">
                    Hướng dẫn giải / Căn cứ pháp lý trích dẫn:
                  </span>
                  <input
                    type="text"
                    value={q.explanation || ''}
                    onChange={(e) =>
                      updateQuestion(originalIdx, { explanation: e.target.value })
                    }
                    placeholder="Nhập lời giải hoặc căn cứ điều luật..."
                    className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-[#0f2d22] focus:bg-white transition"
                  />
                  {q.explanation && (
                    <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <MathText text={q.explanation} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ParsedExamPreview;
