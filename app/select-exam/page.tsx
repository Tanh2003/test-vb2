'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  HelpCircle,
  PlayCircle,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Plus,
  BookOpen,
} from 'lucide-react';
import { PAPER_META, PaperCode } from '@/types/exam';

interface ExamItem {
  id: string;
  examCode: string;
  paperCode?: string;
  title: string;
  subject?: string;
  totalQuestions: number;
  duration: number; // số phút, vd: 150
}

const DEFAULT_SAMPLE_EXAMS: ExamItem[] = [
  {
    id: 'ca1-sample-01',
    examCode: 'CA1',
    paperCode: 'CA1',
    subject: 'Toán cao cấp',
    title: 'Đề minh hoạ Tuyển sinh VB2 CAND - Mã đề CA1 (Toán cao cấp)',
    totalQuestions: 50,
    duration: 150,
  },
  {
    id: 'ca2-sample-01',
    examCode: 'CA2',
    paperCode: 'CA2',
    subject: 'Kinh tế vĩ mô',
    title: 'Đề minh hoạ Tuyển sinh VB2 CAND - Mã đề CA2 (Kinh tế vĩ mô)',
    totalQuestions: 50,
    duration: 150,
  },
  {
    id: 'ca3-sample-01',
    examCode: 'CA3',
    paperCode: 'CA3',
    subject: 'Triết học Mác - Lênin',
    title: 'Đề minh hoạ Tuyển sinh VB2 CAND - Mã đề CA3 (Triết học Mác - Lênin)',
    totalQuestions: 60,
    duration: 150,
  },
  {
    id: 'ca4-sample-01',
    examCode: 'CA4',
    paperCode: 'CA4',
    subject: 'Nhà nước và pháp luật',
    title: 'Đề minh hoạ Tuyển sinh VB2 CAND - Mã đề CA4 (Nhà nước và pháp luật)',
    totalQuestions: 60,
    duration: 150,
  },
];

export default function SelectExamPage() {
  const router = useRouter();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'CA1' | 'CA2' | 'CA3' | 'CA4'>('ALL');

  const fetchExams = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/exams');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setExams(data);
      } else {
        setExams(DEFAULT_SAMPLE_EXAMS);
      }
    } catch {
      setExams(DEFAULT_SAMPLE_EXAMS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      try {
        const res = await fetch('/api/exams');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (!ignore) {
          if (Array.isArray(data) && data.length > 0) {
            setExams(data);
          } else {
            setExams(DEFAULT_SAMPLE_EXAMS);
          }
        }
      } catch {
        if (!ignore) {
          setExams(DEFAULT_SAMPLE_EXAMS);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };
    run();
    return () => {
      ignore = true;
    };
  }, []);

  const handleLoadSamples = () => {
    setExams(DEFAULT_SAMPLE_EXAMS);
  };

  const filteredExams = exams.filter((e) => {
    if (selectedFilter === 'ALL') return true;
    return (e.paperCode || e.examCode)?.toUpperCase() === selectedFilter;
  });

  return (
    <div className="min-h-screen bg-[#f7f8f7] text-slate-800 font-sans flex flex-col justify-between">
      {/* 1. HEADER (XANH RÊU CAND ĐẶC TRƯNG) */}
      <header className="bg-[#0f2d22] text-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between border-b border-emerald-900/60">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-emerald-950/80 text-emerald-100 hover:text-white hover:bg-emerald-900 transition cursor-pointer"
              title="Quay lại trang chủ"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                NGÂN HÀNG ĐỀ THI TRỰC TUYẾN
              </span>
              <h1 className="text-base sm:text-lg font-extrabold text-white leading-tight">
                DANH SÁCH ĐỀ THI TUYỂN SINH VB2 CAND
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/import"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#c1121f] hover:bg-[#a50f1a] text-white transition cursor-pointer shadow-sm active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Upload đề mới</span>
            </Link>
            <button
              onClick={() => fetchExams()}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-100 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT (NỀN SÁNG ĐẸP MẮT) */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Bộ lọc 4 mã đề */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {(['ALL', 'CA1', 'CA2', 'CA3', 'CA4'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedFilter(tab)}
                className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer ${
                  selectedFilter === tab
                    ? 'bg-[#0f2d22] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab === 'ALL' ? 'Tất cả mã đề' : `${tab} - ${PAPER_META[tab]?.subject || ''}`}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 font-bold">
            Hiển thị {filteredExams.length} đề thi
          </span>
        </div>

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white border border-slate-200 rounded-3xl p-6 animate-pulse space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="h-6 w-20 bg-slate-200 rounded-full" />
                  <div className="h-5 w-24 bg-slate-200 rounded-md" />
                </div>
                <div className="h-6 w-3/4 bg-slate-200 rounded" />
                <div className="space-y-2 py-2">
                  <div className="h-4 w-1/2 bg-slate-200 rounded" />
                  <div className="h-4 w-2/3 bg-slate-200 rounded" />
                </div>
                <div className="h-10 w-full bg-slate-200 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredExams.length === 0 ? (
          /* Empty / Error State */
          <div className="max-w-md mx-auto text-center py-16 px-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Chưa có đề thi nào phù hợp bộ lọc
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
              Bạn có thể tải ngay bộ đề mẫu 4 ca chuẩn Bộ Công An 2026 hoặc upload đề PDF mới để bắt đầu ôn thi.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleLoadSamples}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#0f2d22] hover:bg-[#184232] text-white shadow-sm transition cursor-pointer active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Nạp bộ đề mẫu 4 Ca</span>
              </button>
              <Link
                href="/import"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Upload đề PDF</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Danh sách thẻ đề thi (Nền trắng sang trọng) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam) => {
              const pCode = ((exam.paperCode || exam.examCode)?.toUpperCase() as PaperCode) || 'CA1';
              const subjectName = exam.subject || PAPER_META[pCode]?.subject || 'Môn thi chuyên ngành';

              return (
                <div
                  key={exam.id}
                  className="group bg-white border border-slate-200/90 hover:border-emerald-700/50 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-[#0f2d22] text-amber-400 shadow-2xs tracking-wider">
                        MÃ ĐỀ: {pCode}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        {subjectName}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-800 transition leading-snug line-clamp-2">
                      {exam.title}
                    </h3>

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                      <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-semibold">{exam.duration || 150} Phút</span>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                        <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-semibold">{exam.totalQuestions || 50} Câu hỏi</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push(`/exam?id=${exam.id}&ca=${pCode}`)}
                    className="mt-6 w-full py-3 px-4 bg-[#c1121f] hover:bg-[#a50f1a] text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.98]"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Vào Thi Ngay</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 3. FOOTER */}
      <footer className="bg-[#0a2018] text-emerald-100/60 text-xs py-6 px-4 text-center mt-12 border-t border-emerald-950">
        Hệ Thống Luyện Thi Trực Tuyến Tuyển Sinh Văn Bằng 2 CAND &bull; 4 Mã đề chuẩn hoá CA1 - CA2 - CA3 - CA4
      </footer>
    </div>
  );
}
