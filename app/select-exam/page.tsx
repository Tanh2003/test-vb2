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
  FileText,
  Cloud,
  ExternalLink,
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
  ownerId?: string;
  userId?: string;
  ownerName?: string;
  isPublic?: boolean;
  pdfFileUrl?: string;
  answerPdfFileUrl?: string;
}

interface CandidateInfo {
  uid?: string;
  id?: string;
  email?: string;
  sbd?: string;
  username?: string;
  fullName?: string;
}

export default function SelectExamPage() {
  const router = useRouter();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [candidate, setCandidate] = useState<CandidateInfo | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'CA1' | 'CA2' | 'CA3' | 'CA4'>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'USER' | 'SYSTEM'>('ALL');

  // Load candidate info
  useEffect(() => {
    try {
      const stored = localStorage.getItem('candidate_info');
      if (stored) {
        setCandidate(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const currentUserId = candidate?.uid || candidate?.id || candidate?.sbd || candidate?.email || '';

  const fetchExams = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = currentUserId
        ? `/api/exams?userId=${encodeURIComponent(currentUserId)}`
        : '/api/exams';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (Array.isArray(data)) {
        setExams(data);
      } else {
        setExams([]);
      }
    } catch {
      setExams([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      try {
        const url = currentUserId
          ? `/api/exams?userId=${encodeURIComponent(currentUserId)}`
          : '/api/exams';
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (!ignore) {
          if (Array.isArray(data)) {
            setExams(data);
          } else {
            setExams([]);
          }
        }
      } catch {
        if (!ignore) {
          setExams([]);
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
  }, [currentUserId]);

  const filteredExams = exams.filter((e) => {
    // Lọc theo Ca (CA1/CA2/CA3/CA4)
    if (selectedFilter !== 'ALL') {
      const code = (e.paperCode || e.examCode)?.toUpperCase();
      if (code !== selectedFilter) return false;
    }

    // Lọc theo Nguồn đề (Cá nhân / Đề công khai)
    const isOwner = Boolean(
      currentUserId && (e.ownerId === currentUserId || e.userId === currentUserId)
    );
    if (scopeFilter === 'USER') {
      return isOwner;
    }
    if (scopeFilter === 'SYSTEM') {
      return e.isPublic === true;
    }

    return true;
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
            {candidate ? (
              <>
                <Link
                  href="/upload-history"
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-100 transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-300" />
                  <span>Lịch sử upload</span>
                </Link>
                <Link
                  href="/import"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#c1121f] hover:bg-[#a50f1a] text-white transition cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload đề mới</span>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-300 hover:text-amber-200 transition"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/signup"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#c1121f] hover:bg-[#a50f1a] text-white transition shadow-sm active:scale-[0.98]"
                >
                  Đăng ký
                </Link>
              </div>
            )}
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
        {/* Banner thông tin tài khoản đang đăng nhập */}
        {candidate ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#0f2d22] text-amber-300 font-extrabold flex items-center justify-center shrink-0">
                {(candidate.fullName || candidate.username || 'U')[0].toUpperCase()}
              </div>
              <div>
                <div className="font-extrabold text-[#0f2d22] flex items-center gap-2">
                  <span>Tài khoản: {candidate.fullName || candidate.username || 'Thí sinh'}</span>
                  <span className="font-mono text-[11px] bg-emerald-200/80 text-emerald-950 font-bold px-2 py-0.5 rounded-lg">
                    ID: {currentUserId}
                  </span>
                </div>
                <p className="text-emerald-800 text-xs mt-0.5">
                  Đang hiển thị các đề thi bạn đã upload độc quyền cùng với các đề mẫu chuẩn của Bộ Công An.
                </p>
              </div>
            </div>
            <Link
              href="/import"
              className="shrink-0 text-xs font-bold text-white bg-[#0f2d22] hover:bg-[#184232] px-3.5 py-1.5 rounded-xl transition self-start sm:self-auto flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload thêm đề</span>
            </Link>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="text-amber-900 font-medium">
                Bạn chưa đăng nhập. Chỉ đề mẫu công khai được hiển thị.{' '}
                <Link href="/login" className="font-bold underline text-amber-950 hover:text-black">
                  Đăng nhập
                </Link>{' '}
                để xem và làm các đề thi riêng của bạn.
              </span>
            </div>
          </div>
        )}

        {/* Bộ lọc 4 mã đề & Nguồn đề */}
        <div className="space-y-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            {/* Lọc nguồn đề */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-semibold mr-1">Nguồn:</span>
              <button
                onClick={() => setScopeFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  scopeFilter === 'ALL'
                    ? 'bg-[#0f2d22] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Tất cả ({exams.length})
              </button>
              {currentUserId && (
                <button
                  onClick={() => setScopeFilter('USER')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    scopeFilter === 'USER'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  ⭐ Đề của bạn (
                  {
                    exams.filter(
                      (e) => e.ownerId === currentUserId || e.userId === currentUserId
                    ).length
                  }
                  )
                </button>
              )}
              <button
                onClick={() => setScopeFilter('SYSTEM')}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  scopeFilter === 'SYSTEM'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Đề chuẩn Bộ CA
              </button>
            </div>

            <span className="text-xs text-slate-500 font-bold">
              Hiển thị {filteredExams.length} đề thi
            </span>
          </div>

          {/* Lọc 4 mã Ca */}
          <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
            <span className="text-slate-500 font-semibold mr-1">Mã đề:</span>
            {(['ALL', 'CA1', 'CA2', 'CA3', 'CA4'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedFilter(tab)}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  selectedFilter === tab
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab === 'ALL' ? 'Tất cả mã đề' : `${tab} - ${PAPER_META[tab]?.subject || ''}`}
              </button>
            ))}
          </div>
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
              Chưa có đề thi nào trong hệ thống
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
              {currentUserId
                ? 'Bạn chưa có đề thi nào được lưu trên tài khoản này. Hãy upload đề thi PDF mới để bắt đầu ôn luyện.'
                : 'Hiện tại chưa có đề thi công khai nào. Vui lòng đăng nhập để xem đề thi cá nhân của bạn.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/import"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#c1121f] hover:bg-[#a50f1a] text-white shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Upload đề PDF mới</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Danh sách thẻ đề thi (Nền trắng sang trọng) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam) => {
              const pCode = ((exam.paperCode || exam.examCode)?.toUpperCase() as PaperCode) || 'CA1';
              const subjectName = exam.subject || PAPER_META[pCode]?.subject || 'Môn thi chuyên ngành';
              const isMyExam = Boolean(
                currentUserId && (exam.ownerId === currentUserId || exam.userId === currentUserId)
              );

              return (
                <div
                  key={exam.id}
                  className={`group bg-white border rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 ${
                    isMyExam
                      ? 'border-amber-300 ring-1 ring-amber-300/60'
                      : 'border-slate-200/90 hover:border-emerald-700/50'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-[#0f2d22] text-amber-400 shadow-2xs tracking-wider">
                        MÃ ĐỀ: {pCode}
                      </span>
                      {isMyExam ? (
                        <span className="flex items-center gap-1 text-[11px] font-extrabold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full">
                          ⭐ Đề của bạn
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          Chuẩn Bộ CA
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        {subjectName}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-800 transition leading-snug line-clamp-2 mt-0.5">
                        {exam.title}
                      </h3>
                    </div>

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

                    {/* Liên kết file PDF trên Backblaze B2 nếu có */}
                    {exam.pdfFileUrl && (
                      <div className="pt-2 flex items-center justify-between text-[11px] text-emerald-800 bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                        <span className="flex items-center gap-1 font-semibold text-emerald-950">
                          <Cloud className="w-3.5 h-3.5 text-emerald-700" /> File PDF gốc (B2)
                        </span>
                        <a
                          href={exam.pdfFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Xem PDF</span>
                        </a>
                      </div>
                    )}
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
