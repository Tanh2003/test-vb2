'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Cloud,
  ExternalLink,
  Trash2,
  PlayCircle,
  Clock,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronUp,
  Search,
  Layers,
  Sparkles,
  BookOpen,
  ArrowRight,
  Loader2,
  Calendar,
  Lock,
  Globe,
} from 'lucide-react';
import { PAPER_META, PaperCode } from '@/types/exam';

interface CandidateInfo {
  uid?: string;
  id?: string;
  email?: string;
  sbd?: string;
  username?: string;
  fullName?: string;
}

interface UploadedExamItem {
  id: string;
  paperCode?: string;
  examCode?: string;
  title?: string;
  examTitle?: string;
  subject?: string;
  duration?: number;
  durationMinutes?: number;
  totalQuestions?: number;
  ownerId?: string;
  userId?: string;
  ownerName?: string;
  ownerEmail?: string;
  isPublic?: boolean;
  pdfFileUrl?: string;
  pdfFileName?: string;
  b2FileId?: string;
  answerPdfFileUrl?: string;
  answerPdfFileName?: string;
  b2UploadedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  questions?: Array<{
    number: number;
    type: string;
    stem?: string;
    correctAnswer?: string;
  }>;
  essay?: {
    prompt?: string;
    citation?: string;
    minWords?: number;
    maxPoints?: number;
  };
}

function UploadHistoryContent() {
  const router = useRouter();
  const [exams, setExams] = useState<UploadedExamItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [candidate, setCandidate] = useState<CandidateInfo | null>(null);
  const [selectedCa, setSelectedCa] = useState<'ALL' | 'CA1' | 'CA2' | 'CA3' | 'CA4'>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

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

  // Lấy danh sách đề thi đã upload của tài khoản
  const fetchUploadedExams = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Lấy danh sách từ CSDL Firebase (lọc theo userId)
      const url = currentUserId
        ? `/api/exams?userId=${encodeURIComponent(currentUserId)}&userOnly=true`
        : '/api/exams?userOnly=true';
      const res = await fetch(url, { cache: 'no-store' });
      let serverExams: UploadedExamItem[] = [];
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          serverExams = data;
        }
      }

      // 2. Lấy thêm từ LocalStorage (đề vừa upload hoặc lưu offline)
      let localExams: UploadedExamItem[] = [];
      try {
        const raw = localStorage.getItem('user_uploaded_exams_list');
        if (raw) {
          localExams = JSON.parse(raw);
        }
      } catch (err) {
        console.error(err);
      }

      // 3. Hợp nhất dữ liệu, ưu tiên dữ liệu mới nhất
      const examMap = new Map<string, UploadedExamItem>();
      for (const item of serverExams) {
        if (item && item.id) examMap.set(item.id, item);
      }
      for (const item of localExams) {
        if (item && item.id) {
          if (!examMap.has(item.id)) {
            examMap.set(item.id, item);
          } else {
            // Merge dữ liệu
            examMap.set(item.id, { ...examMap.get(item.id)!, ...item });
          }
        }
      }

      const mergedList = Array.from(examMap.values());
      // Sắp xếp theo ngày cập nhật mới nhất
      mergedList.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.b2UploadedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.b2UploadedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      setExams(mergedList);
    } catch (error) {
      console.error('Lỗi tải danh sách upload:', error);
      setExams([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchUploadedExams();
  }, [fetchUploadedExams]);

  // Xoá đề thi
  const handleDeleteExam = async (exam: UploadedExamItem) => {
    const confirmDelete = confirm(
      `Bạn có chắc chắn muốn xoá đề thi "${exam.title || exam.id}" khỏi hệ thống không?\n\nHành động này không thể hoàn tác.`
    );
    if (!confirmDelete) return;

    setIsDeletingId(exam.id);
    try {
      const res = await fetch(`/api/exams?id=${encodeURIComponent(exam.id)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Mã lỗi: ${res.status}`);
      }

      // Cập nhật state & LocalStorage
      setExams((prev) => prev.filter((item) => item.id !== exam.id));
      try {
        const raw = localStorage.getItem('user_uploaded_exams_list');
        if (raw) {
          const list = JSON.parse(raw).filter((item: any) => item.id !== exam.id);
          localStorage.setItem('user_uploaded_exams_list', JSON.stringify(list));
        }
        localStorage.removeItem(`exam_current_${exam.id}`);
      } catch (e) {
        console.error(e);
      }

      if (expandedExamId === exam.id) {
        setExpandedExamId(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Không thể xoá đề thi: ${msg}`);
    } finally {
      setIsDeletingId(null);
    }
  };

  // Toggle xem chi tiết
  const toggleExpand = (id: string) => {
    setExpandedExamId((prev) => (prev === id ? null : id));
  };

  // Lọc danh sách đề thi theo mã đề và từ khoá
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const pCode = ((exam.paperCode || exam.examCode)?.toUpperCase() as PaperCode) || 'CA1';
      if (selectedCa !== 'ALL' && pCode !== selectedCa) {
        return false;
      }
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const titleMatch = (exam.title || exam.examTitle || '').toLowerCase().includes(kw);
        const codeMatch = pCode.toLowerCase().includes(kw);
        const fileNameMatch = (exam.pdfFileName || '').toLowerCase().includes(kw);
        return titleMatch || codeMatch || fileNameMatch;
      }
      return true;
    });
  }, [exams, selectedCa, searchKeyword]);

  // Thống kê số lượng theo mã đề
  const stats = useMemo(() => {
    const total = exams.length;
    const ca1 = exams.filter((e) => (e.paperCode || e.examCode)?.toUpperCase() === 'CA1').length;
    const ca2 = exams.filter((e) => (e.paperCode || e.examCode)?.toUpperCase() === 'CA2').length;
    const ca3 = exams.filter((e) => (e.paperCode || e.examCode)?.toUpperCase() === 'CA3').length;
    const ca4 = exams.filter((e) => (e.paperCode || e.examCode)?.toUpperCase() === 'CA4').length;
    const withPdf = exams.filter((e) => Boolean(e.pdfFileUrl)).length;
    return { total, ca1, ca2, ca3, ca4, withPdf };
  }, [exams]);

  return (
    <div className="min-h-screen bg-[#f7f8f7] text-slate-800 font-sans flex flex-col justify-between">
      {/* 1. HEADER CHUẨN XANH RÊU CAND */}
      <header className="bg-[#0f2d22] text-white sticky top-0 z-40 shadow-sm border-b border-emerald-900/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 relative flex items-center justify-center shrink-0">
              <svg viewBox="0 0 36 42" className="w-full h-full drop-shadow">
                <path
                  d="M18 1L33 6.5V20C33 30 26 38 18 41C10 38 3 30 3 20V6.5L18 1Z"
                  fill="#C1121F"
                  stroke="#FBBF24"
                  strokeWidth="2.5"
                />
                <polygon
                  points="18,10 20.8,16.5 27.5,17 22.5,21.5 24,28 18,24.5 12,28 13.5,21.5 8.5,17 15.2,16.5"
                  fill="#FBBF24"
                />
              </svg>
            </div>
            <div>
              <div className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-amber-400 leading-tight">
                THI ONLINE VB2
              </div>
              <div className="text-[11px] text-slate-200/90 font-medium">
                Văn bằng 2 Công an nhân dân
              </div>
            </div>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-4 sm:gap-7 text-xs sm:text-sm font-medium">
            <Link href="/" className="text-emerald-100/80 hover:text-white transition">
              Thư viện đề
            </Link>
            <Link href="/import" className="text-emerald-100/80 hover:text-white transition">
              Upload đề
            </Link>
            <Link
              href="/upload-history"
              className="text-white font-semibold underline underline-offset-4 decoration-amber-400"
            >
              Lịch sử upload
            </Link>
            <Link href="/select-exam" className="text-emerald-100/80 hover:text-white transition">
              Ngân hàng đề thi
            </Link>
            <Link href="/result" className="text-emerald-100/80 hover:text-white transition">
              Lịch sử làm đề
            </Link>
            {candidate ? (
              <Link
                href="/profile"
                className="text-amber-300 hover:text-amber-200 font-semibold uppercase text-xs sm:text-sm pl-2 transition"
              >
                [{candidate.fullName || candidate.sbd || candidate.username || 'TÀI KHOẢN'}]
              </Link>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3 pl-2">
                <Link
                  href="/login"
                  className="text-amber-300 hover:text-amber-200 font-semibold text-xs sm:text-sm transition"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/signup"
                  className="px-3.5 py-1.5 rounded-xl bg-[#c1121f] hover:bg-[#a50f1a] text-white font-bold text-xs sm:text-sm shadow-sm transition active:scale-[0.98]"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 flex-1">
        {/* Banner tiêu đề */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 mb-2 border border-emerald-200">
              <Cloud className="w-3.5 h-3.5 text-emerald-700" />
              <span>QUẢN LÝ LƯU TRỮ ĐỀ THI & ĐÁM MÂY BACKBLAZE B2</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f2d22]">
              Lịch Sử Upload Đề Thi
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Xem lại danh sách các đề thi bạn đã bóc tách bằng AI và lưu trữ tệp PDF trên Backblaze B2 (Bucket:{' '}
              <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-emerald-900 font-bold">
                file-vb2
              </code>
              ).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchUploadedExams()}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
            <Link
              href="/import"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#c1121f] hover:bg-[#a50f1a] text-white flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Upload đề mới</span>
            </Link>
          </div>
        </div>

        {/* Thông tin tài khoản upload */}
        {candidate && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-950 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                Đang hiển thị đề thi của tài khoản:{' '}
                <strong>{candidate.fullName || candidate.username || 'Thí sinh'}</strong> (ID:{' '}
                <span className="font-mono text-emerald-900 font-bold">
                  {candidate.uid || candidate.id || candidate.sbd || candidate.email}
                </span>
                )
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200">
              Chỉ tài khoản của bạn xem được
            </span>
          </div>
        )}

        {/* Thẻ Thống kê nhanh */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Tổng số đề</span>
            <span className="text-xl font-extrabold text-[#0f2d22]">{stats.total}</span>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Mã CA1 (Toán)</span>
            <span className="text-xl font-extrabold text-blue-700">{stats.ca1}</span>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Mã CA2 (Kinh tế)</span>
            <span className="text-xl font-extrabold text-emerald-700">{stats.ca2}</span>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Mã CA3 (Triết)</span>
            <span className="text-xl font-extrabold text-purple-700">{stats.ca3}</span>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Mã CA4 (Pháp luật)</span>
            <span className="text-xl font-extrabold text-amber-700">{stats.ca4}</span>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Đã lưu PDF (B2)</span>
            <span className="text-xl font-extrabold text-teal-700 flex items-center gap-1">
              <Cloud className="w-4 h-4 text-teal-600" />
              {stats.withPdf}
            </span>
          </div>
        </div>

        {/* Thanh công cụ: Bộ lọc mã đề & Tìm kiếm */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs bộ lọc */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            {(['ALL', 'CA1', 'CA2', 'CA3', 'CA4'] as const).map((code) => (
              <button
                key={code}
                onClick={() => setSelectedCa(code)}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  selectedCa === code
                    ? 'bg-[#0f2d22] text-amber-300 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {code === 'ALL' ? 'Tất cả mã đề' : `${code} - ${PAPER_META[code]?.subject || ''}`}
              </button>
            ))}
          </div>

          {/* Ô tìm kiếm */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm kiếm tên đề, file..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0f2d22] bg-slate-50"
            />
          </div>
        </div>

        {/* DANH SÁCH LỊCH SỬ UPLOAD */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-700 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">
              Đang tải danh sách lịch sử upload đề thi...
            </p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4 px-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-100">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Chưa có đề thi nào trong lịch sử upload
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {selectedCa !== 'ALL'
                  ? `Không tìm thấy đề thi thuộc mã ${selectedCa}. Hãy thử chọn mã khác hoặc upload đề mới.`
                  : 'Bạn chưa tải lên đề thi nào. Bấm nút bên dưới để chọn mã đề và upload tệp PDF đầu tiên.'}
              </p>
            </div>
            <Link
              href="/import"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#c1121f] hover:bg-[#a50f1a] text-white font-bold text-xs shadow-sm transition active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Upload đề PDF ngay</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredExams.map((exam, index) => {
              const pCode = ((exam.paperCode || exam.examCode)?.toUpperCase() as PaperCode) || 'CA1';
              const subjectInfo = PAPER_META[pCode];
              const isExpanded = expandedExamId === exam.id;
              const titleText = exam.title || exam.examTitle || `Đề thi ${pCode}`;
              const durationMin = exam.duration || exam.durationMinutes || 150;
              const questionCount = exam.totalQuestions || exam.questions?.length || subjectInfo?.expectedQuestions || 50;

              // Format ngày giờ
              const timeDisplay = exam.updatedAt || exam.b2UploadedAt || exam.createdAt;
              const formattedDate = timeDisplay
                ? new Date(timeDisplay).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Mới lưu';

              return (
                <div
                  key={exam.id || index}
                  className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md ${
                    isExpanded ? 'border-[#0f2d22] ring-1 ring-[#0f2d22]/30' : 'border-slate-200'
                  }`}
                >
                  {/* Dòng tóm tắt chính */}
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Huy hiệu mã đề */}
                      <div className="shrink-0">
                        <span className="w-12 h-12 rounded-xl bg-[#0f2d22] text-amber-300 font-extrabold flex flex-col items-center justify-center text-xs shadow-xs">
                          <span className="text-[10px] text-emerald-300/80 leading-none">MÃ</span>
                          <span className="text-sm font-black leading-tight">{pCode}</span>
                        </span>
                      </div>

                      {/* Tiêu đề & Metadata */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-extrabold text-base text-slate-900 leading-snug truncate">
                            {titleText}
                          </h3>
                          {exam.isPublic ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                              <Globe className="w-3 h-3" /> Công khai
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                              <Lock className="w-3 h-3" /> Riêng tư (Chỉ bạn)
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                          <span className="font-semibold text-emerald-800">
                            {subjectInfo?.subject || 'Môn thi VB2'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {durationMin} phút
                          </span>
                          <span className="flex items-center gap-1">
                            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                            {questionCount} câu hỏi
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Upload: {formattedDate}
                          </span>
                        </div>

                        {/* Trạng thái lưu trữ Backblaze B2 */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                          {exam.pdfFileUrl ? (
                            <span className="inline-flex items-center gap-1 text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200 font-medium">
                              <Cloud className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span>
                                Đã lưu PDF trên <strong>Backblaze B2</strong> ({exam.pdfFileName || 'exam.pdf'})
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Chưa có tệp PDF đính kèm</span>
                          )}
                          {exam.answerPdfFileUrl && (
                            <span className="inline-flex items-center gap-1 text-blue-800 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 font-medium">
                              <CheckCircle2 className="w-3 h-3 text-blue-600" />
                              <span>Có PDF đáp án</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Nhóm nút hành động */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                      {/* Nút Xem PDF trên B2 */}
                      {exam.pdfFileUrl && (
                        <a
                          href={exam.pdfFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1 transition"
                          title="Mở xem file PDF đề thi gốc trên Backblaze B2"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Xem PDF gốc</span>
                        </a>
                      )}

                      {/* Nút Vào thi ngay */}
                      <button
                        type="button"
                        onClick={() => router.push(`/exam?id=${exam.id}&ca=${pCode}`)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#c1121f] hover:bg-[#a50f1a] text-white flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-[0.98]"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Vào Thi Ngay</span>
                      </button>

                      {/* Nút Xem chi tiết / Ẩn chi tiết */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(exam.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1 ${
                          isExpanded
                            ? 'bg-[#0f2d22] text-amber-300 border-[#0f2d22]'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span>{isExpanded ? 'Đóng chi tiết' : 'Xem chi tiết'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Nút Xoá đề */}
                      <button
                        type="button"
                        onClick={() => handleDeleteExam(exam)}
                        disabled={isDeletingId === exam.id}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Xoá đề thi này"
                      >
                        {isDeletingId === exam.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* VÙNG XEM CHI TIẾT KHI MỞ RỘNG (ACCORDION) */}
                  {isExpanded && (
                    <div className="border-t border-slate-200/80 bg-slate-50/70 p-4 sm:p-6 rounded-b-2xl space-y-5 text-xs">
                      {/* 1. Thông tin kỹ thuật & Liên kết Backblaze */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                        <div className="space-y-1.5">
                          <span className="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">
                            Thông tin kỹ thuật đề thi
                          </span>
                          <div className="text-slate-600 space-y-1 font-mono text-[11px]">
                            <div>ID đề thi: <strong>{exam.id}</strong></div>
                            <div>Mã môn: <strong>{pCode}</strong> ({subjectInfo?.subject})</div>
                            <div>Tài khoản sở hữu: <strong>{exam.ownerId || exam.userId || 'Chưa định danh'}</strong></div>
                            <div>Thời gian làm bài: <strong>{durationMin} phút</strong></div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">
                            Lưu trữ đám mây Backblaze B2
                          </span>
                          <div className="text-slate-600 space-y-1 text-[11px]">
                            <div>Bucket lưu trữ: <code className="bg-emerald-100 text-emerald-900 font-bold px-1 rounded">file-vb2</code></div>
                            {exam.pdfFileUrl ? (
                              <div className="flex items-center gap-2 pt-1">
                                <a
                                  href={exam.pdfFileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-800 hover:text-emerald-950 font-bold underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Tải / Xem file PDF Đề thi</span>
                                </a>
                              </div>
                            ) : (
                              <div className="text-slate-400">Không có tệp PDF</div>
                            )}
                            {exam.answerPdfFileUrl && (
                              <div>
                                <a
                                  href={exam.answerPdfFileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-800 hover:text-blue-950 font-bold underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Tải / Xem file PDF Đáp án</span>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 2. Chi tiết Phần I: Tự luận */}
                      {exam.essay && (
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                              <BookOpen className="w-4 h-4 text-emerald-700" />
                              <span>Phần I: Tự luận xã hội (30 điểm)</span>
                            </span>
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                              Tối thiểu {exam.essay.minWords || 500} từ
                            </span>
                          </div>
                          <div className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-line text-xs font-serif">
                            {exam.essay.prompt || 'Không có đề bài tự luận.'}
                          </div>
                          {exam.essay.citation && (
                            <p className="text-[11px] text-slate-500 italic">
                              Nguồn trích dẫn: {exam.essay.citation}
                            </p>
                          )}
                        </div>
                      )}

                      {/* 3. Chi tiết Phần II: Bảng ma trận đáp án 1..50 / 1..60 */}
                      {exam.questions && exam.questions.length > 0 && (
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                              <span>Bảng đáp án câu hỏi trắc nghiệm & điền khuyết ({exam.questions.length} câu)</span>
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">
                              Phần II: 70 điểm
                            </span>
                          </div>

                          <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 gap-1.5">
                            {exam.questions.map((q) => {
                              const ans = q.correctAnswer || '?';
                              const isMcq = q.type === 'mcq';
                              return (
                                <div
                                  key={q.number}
                                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center flex flex-col items-center justify-center"
                                  title={`Câu ${q.number} - Đáp án: ${ans}`}
                                >
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    C.{q.number}
                                  </span>
                                  <span
                                    className={`text-xs font-black ${
                                      ans === '?'
                                        ? 'text-red-500'
                                        : isMcq
                                        ? 'text-emerald-800'
                                        : 'text-blue-700 truncate max-w-full px-0.5'
                                    }`}
                                  >
                                    {ans}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Nút hành động trong chi tiết */}
                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/exam?id=${exam.id}&ca=${pCode}`)}
                          className="px-4 py-2 bg-[#c1121f] hover:bg-[#a50f1a] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                        >
                          <PlayCircle className="w-4 h-4" />
                          <span>Làm bài thi thử ngay</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 3. FOOTER */}
      <footer className="bg-[#0a2018] text-emerald-100/60 text-xs py-6 px-4 text-center mt-12 border-t border-emerald-950">
        Hệ Thống Luyện Thi Trực Tuyến Tuyển Sinh Văn Bằng 2 Công An Nhân Dân &bull; Lịch sử upload và lưu trữ đề thi Backblaze B2
      </footer>
    </div>
  );
}

export default function UploadHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f8f7] flex items-center justify-center text-slate-500 text-sm">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-700 mr-2" />
          <span>Đang tải lịch sử upload đề thi...</span>
        </div>
      }
    >
      <UploadHistoryContent />
    </Suspense>
  );
}
