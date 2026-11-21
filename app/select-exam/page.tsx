'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  HelpCircle,
  PlayCircle,
  FileText,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface ExamItem {
  id: string;
  examCode: string;
  title: string;
  totalQuestions: number;
  duration: number; // số phút, vd: 150
}

const MOCK_SAMPLE_EXAM: ExamItem = {
  id: 'ca1-sample-01',
  examCode: 'CA1',
  title: 'Đề Thi Thử Tuyển Sinh Văn Bằng 2 CAND - Chuẩn Cấu Trúc Đề Gốc',
  totalQuestions: 51,
  duration: 150,
};

export default function SelectExamPage() {
  const router = useRouter();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/exams');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setExams(Array.isArray(data) ? data : []);
    } catch {
      setExams([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleLoadSample = () => {
    setExams([MOCK_SAMPLE_EXAM]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
              title="Quay lại trang chủ"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                Ngân Hàng Đề Thi
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-white">
                DANH SÁCH ĐỀ THI LUYỆN TẬP
              </h1>
            </div>
          </div>
          <button
            onClick={fetchExams}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 animate-pulse space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="h-6 w-20 bg-slate-800 rounded-full" />
                  <div className="h-5 w-16 bg-slate-800 rounded-md" />
                </div>
                <div className="h-6 w-3/4 bg-slate-800 rounded" />
                <div className="space-y-2 py-2">
                  <div className="h-4 w-1/2 bg-slate-800/80 rounded" />
                  <div className="h-4 w-2/3 bg-slate-800/80 rounded" />
                </div>
                <div className="h-10 w-full bg-slate-800 rounded-xl" />
              </div>
            ))}
          </div>
        ) : exams.length === 0 ? (
          /* Empty / Error State */
          <div className="max-w-md mx-auto text-center py-16 px-4 bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xl">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Chưa có đề thi nào trong hệ thống
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Hệ thống hiện tại chưa tải danh sách đề từ cơ sở dữ liệu. Bạn có thể tải ngay đề mẫu chuẩn CA1 để bắt đầu luyện tập.
            </p>
            <button
              onClick={handleLoadSample}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-600/30 transition cursor-pointer active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Tải đề mẫu CA1</span>
            </button>
          </div>
        ) : (
          /* Exams Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="group bg-slate-900 border border-slate-800 hover:border-red-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 shadow-lg hover:shadow-red-950/20 hover:-translate-y-1"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-red-600/20 text-red-400 border border-red-500/30 tracking-wider">
                      MÃ ĐỀ: {exam.examCode}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Chuẩn Bộ CA
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-red-400 transition leading-snug line-clamp-2">
                    {exam.title}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
                    <div className="flex items-center gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>{exam.duration} Phút</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                      <HelpCircle className="w-4 h-4 text-blue-400" />
                      <span>{exam.totalQuestions} Câu hỏi</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => router.push(`/exam?id=${exam.id}`)}
                  className="mt-6 w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-md shadow-red-600/30 flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.98]"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Vào Thi Ngay</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
