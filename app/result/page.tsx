'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Clock,
  RotateCcw,
  BookOpen,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Award,
  Sparkles,
  FileText,
  Eye,
  History,
  Check,
  TrendingUp,
  Printer,
  ChevronRight,
  Trash2,
  Cloud,
  Database,
  RefreshCw,
} from 'lucide-react';
import MathText from '@/components/common/MathText';
import { SubmissionResult, SubmissionDetail, PaperCode, PAPER_META } from '@/types/exam';

function formatSeconds(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m} phút ${s < 10 ? '0' : ''}${s} giây`;
}

function getClassificationStyle(classification: string) {
  switch (classification) {
    case 'Xuất sắc':
      return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    case 'Giỏi':
      return 'bg-blue-50 text-blue-800 border-blue-300';
    case 'Khá':
      return 'bg-amber-50 text-amber-800 border-amber-300';
    case 'Trung bình':
      return 'bg-orange-50 text-orange-800 border-orange-300';
    default:
      return 'bg-red-50 text-red-800 border-red-300';
  }
}

function getPaperCodeBadge(code: PaperCode) {
  switch (code) {
    case 'CA1':
      return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    case 'CA2':
      return 'bg-blue-100 text-blue-900 border-blue-300';
    case 'CA3':
      return 'bg-purple-100 text-purple-900 border-purple-300';
    case 'CA4':
      return 'bg-amber-100 text-amber-900 border-amber-300';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-300';
  }
}

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const submissionId = searchParams.get('id');

  // Chế độ xem: 'list' (danh sách các đề đã làm) hoặc 'detail' (xem chi tiết 1 bài thi)
  const [viewMode, setViewMode] = useState<'list' | 'detail'>(submissionId ? 'detail' : 'list');

  const [currentResult, setCurrentResult] = useState<SubmissionResult | null>(null);
  const [historyList, setHistoryList] = useState<SubmissionResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Bộ lọc theo mã đề ở chế độ danh sách
  const [selectedPaperFilter, setSelectedPaperFilter] = useState<string>('ALL');

  // Bộ lọc câu hỏi ở chế độ chi tiết
  const [filterType, setFilterType] = useState<'ALL' | 'CORRECT' | 'WRONG' | 'UNANSWERED'>('ALL');
  const [expandedEssay, setExpandedEssay] = useState(false);

  const [candidateId, setCandidateId] = useState('');
  const [candidateName, setCandidateName] = useState('');

  // 1. Tải dữ liệu lịch sử thi (Ưu tiên Firebase Realtime Database)
  const loadData = async () => {
    setIsLoading(true);

    let cId = '';
    let cSbd = '';
    try {
      const candStr = localStorage.getItem('candidate_info');
      if (candStr) {
        const c = JSON.parse(candStr);
        cId = c.uid || c.id || c.sbd || c.email || '';
        cSbd = c.sbd || '';
        setCandidateId(cId);
        setCandidateName(c.fullName || c.name || '');
      }
    } catch {}

    const historyMap = new Map<string, SubmissionResult>();

    // A. Đọc trực tiếp từ Firebase (nguồn lưu trữ đám mây chính thức)
    try {
      const url = cId
        ? `/api/submissions?userId=${encodeURIComponent(cId)}`
        : '/api/submissions';
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          list.forEach((item) => {
            if (item && item.id) {
              historyMap.set(item.id, { ...item, savedToFirebase: true });
            }
          });
        }
      }
    } catch (err) {
      console.warn('Lỗi tải lịch sử từ Firebase:', err);
    }

    // B. Đọc localStorage (đồng bộ bài thi ngoại tuyến chưa gửi lên Firebase)
    try {
      const rawHistory = localStorage.getItem('submissions_history');
      if (rawHistory) {
        const arr = JSON.parse(rawHistory);
        if (Array.isArray(arr)) {
          arr.forEach((item) => {
            if (item && item.id) {
              const isMatch = !cId || !item.candidateId || item.candidateId === cId || item.sbd === cSbd || (item as any).userId === cId;
              if (isMatch) {
                if (!historyMap.has(item.id)) {
                  historyMap.set(item.id, item);
                  // Tự động đồng bộ lên Firebase nếu chưa có
                  fetch('/api/submissions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item),
                  }).catch(() => {});
                }
              }
            }
          });
        }
      }
    } catch {}

    const all = Array.from(historyMap.values()).sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    setHistoryList(all);

    // Nếu có param ?id= trên URL, tìm bài làm đó để mở chi tiết
    if (submissionId) {
      let found = all.find((item) => item.id === submissionId);
      if (!found) {
        // Tải trực tiếp từ Firebase theo ID bài nộp
        try {
          const resSingle = await fetch(`/api/submissions?id=${encodeURIComponent(submissionId)}`, {
            cache: 'no-store',
          });
          if (resSingle.ok) {
            found = await resSingle.json();
          }
        } catch {}
      }

      if (found) {
        setCurrentResult(found);
        setViewMode('detail');
      } else {
        // Thử đọc từ localStorage riêng lẻ
        try {
          const single = localStorage.getItem(`submission_${submissionId}`);
          if (single) {
            const parsed = JSON.parse(single);
            setCurrentResult(parsed);
            setViewMode('detail');
          } else {
            setViewMode('list');
          }
        } catch {
          setViewMode('list');
        }
      }
    } else {
      // Luôn mặc định mở giao diện danh sách đề đã làm
      setCurrentResult(null);
      setViewMode('list');
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [submissionId]);

  // Xoá bài thi khỏi Firebase & LocalStorage
  const handleDeleteSubmission = async (sub: SubmissionResult, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = confirm(`Bạn có chắc chắn muốn xoá kết quả bài thi "${sub.examTitle}" khỏi hệ thống Firebase không?`);
    if (!ok) return;

    try {
      await fetch(`/api/submissions?id=${encodeURIComponent(sub.id)}`, {
        method: 'DELETE',
      });
      setHistoryList((prev) => prev.filter((item) => item.id !== sub.id));
      try {
        const raw = localStorage.getItem('submissions_history');
        if (raw) {
          const list = JSON.parse(raw).filter((item: any) => item.id !== sub.id);
          localStorage.setItem('submissions_history', JSON.stringify(list));
        }
        localStorage.removeItem(`submission_${sub.id}`);
      } catch {}

      if (currentResult?.id === sub.id) {
        setViewMode('list');
        setCurrentResult(null);
      }
    } catch (err) {
      console.error('Lỗi xoá bài thi:', err);
    }
  };

  // Lọc danh sách đề đã làm
  const filteredHistory = useMemo(() => {
    if (selectedPaperFilter === 'ALL') return historyList;
    return historyList.filter((item) => item.paperCode === selectedPaperFilter);
  }, [historyList, selectedPaperFilter]);

  // Thống kê tổng quan
  const stats = useMemo(() => {
    if (historyList.length === 0) return null;
    const totalExams = historyList.length;
    const maxScore = Math.max(...historyList.map((h) => h.totalScore));
    const avgScore =
      historyList.reduce((acc, cur) => acc + cur.totalScore, 0) / totalExams;
    const passedCount = historyList.filter((h) => h.totalScore >= 50).length;
    return {
      totalExams,
      maxScore: Number(maxScore.toFixed(1)),
      avgScore: Number(avgScore.toFixed(1)),
      passRate: Number(((passedCount / totalExams) * 100).toFixed(0)),
    };
  }, [historyList]);

  // Bộ lọc câu hỏi chi tiết
  const filteredDetails = useMemo(() => {
    return (
      currentResult?.details?.filter((d) => {
        if (filterType === 'CORRECT') return d.isCorrect;
        if (filterType === 'WRONG') return !d.isCorrect && Boolean(d.userAnswer);
        if (filterType === 'UNANSWERED') return !d.userAnswer;
        return true;
      }) || []
    );
  }, [currentResult, filterType]);

  // Chuyển sang xem chi tiết 1 bài thi
  const handleViewDetail = (item: SubmissionResult) => {
    setCurrentResult(item);
    setViewMode('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Quay lại danh sách đề đã làm
  const handleBackToList = () => {
    setCurrentResult(null);
    setViewMode('list');
    router.push('/result', { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#f7f8f7] text-slate-800 font-sans flex flex-col justify-between">
      {/* ===== 1. HEADER (XANH RÊU CAND) ===== */}
      <header className="bg-[#0f2d22] text-white sticky top-0 z-40 shadow-sm border-b border-emerald-900/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {viewMode === 'detail' ? (
              <button
                onClick={handleBackToList}
                className="p-2 rounded-xl bg-emerald-950/80 text-emerald-100 hover:text-white hover:bg-emerald-900 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                title="Quay lại danh sách đề đã làm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Danh sách lịch sử</span>
              </button>
            ) : (
              <Link
                href="/select-exam"
                className="p-2 rounded-xl bg-emerald-950/80 text-emerald-100 hover:text-white hover:bg-emerald-900 transition cursor-pointer"
                title="Về ngân hàng đề"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
            )}

            <div>
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block">
                {viewMode === 'detail' ? 'CHI TIẾT BÀI THI' : 'LỊCH SỬ LÀM BÀI THI'}
              </span>
              <h1 className="text-base sm:text-lg font-extrabold text-white leading-tight">
                {viewMode === 'detail' && currentResult
                  ? currentResult.examTitle
                  : 'DANH SÁCH ĐỀ ĐÃ LÀM'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs sm:text-sm font-medium">
            {viewMode === 'detail' && (
              <button
                onClick={handleBackToList}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-900/70 hover:bg-emerald-900 text-white font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-amber-400" />
                <span>Xem danh sách ({historyList.length})</span>
              </button>
            )}
            <Link href="/" className="text-emerald-100/80 hover:text-white transition">
              Thư viện đề
            </Link>
            <Link
              href="/select-exam"
              className="text-emerald-100/80 hover:text-white transition"
            >
              Ngân hàng đề
            </Link>
            {candidateId ? (
              <>
                <Link href="/import" className="text-emerald-100/80 hover:text-white transition">
                  Upload đề
                </Link>
                <Link href="/upload-history" className="text-emerald-100/80 hover:text-white transition">
                  Lịch sử upload
                </Link>
                <Link href="/profile" className="text-amber-300 hover:text-amber-200 font-semibold uppercase text-xs transition">
                  [{candidateName || 'TÀI KHOẢN'}]
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-amber-300 hover:text-amber-200 font-semibold text-xs sm:text-sm transition">
                  Đăng nhập
                </Link>
                <Link href="/signup" className="px-3 py-1 rounded-xl bg-[#c1121f] hover:bg-[#a50f1a] text-white font-bold text-xs transition">
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===== 2. MAIN CONTAINER ===== */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 flex-1">
        {isLoading ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-700">Đang nạp dữ liệu lịch sử làm bài...</p>
          </div>
        ) : viewMode === 'list' ? (
          /* =========================================================================
           * GIAO DIỆN 1: DANH SÁCH ĐỀ ĐÃ LÀM (KHÔNG MỞ SẴN CHI TIẾT)
           * ========================================================================= */
          <div className="space-y-6">
            {/* Banner tiêu đề & Thống kê nhanh */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-50 text-[#0f2d22]">
                    <History className="w-5 h-5 text-emerald-800" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    Lịch sử làm bài thi của bạn
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500">
                  {candidateName ? `Thí sinh: ${candidateName} • ` : ''}
                  Tổng hợp kết quả các lần thi thử trực tuyến. Chọn một đề bên dưới để xem lại chi tiết bài làm và đáp án.
                </p>
              </div>

              {/* Nút thao tác */}
              <div className="flex items-center gap-2.5 self-start md:self-auto">
                <button
                  onClick={() => loadData()}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm border border-slate-200 flex items-center gap-2 transition cursor-pointer"
                  title="Tải lại và đồng bộ kết quả từ Firebase"
                >
                  <RefreshCw className={`w-4 h-4 text-emerald-700 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Đồng bộ Firebase</span>
                </button>

                <Link
                  href="/select-exam"
                  className="px-5 py-2.5 rounded-xl bg-[#c1121f] hover:bg-[#a50f1a] text-white font-bold text-xs sm:text-sm shadow-md shadow-red-950/20 flex items-center gap-2 transition active:scale-[0.98]"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Thi đề mới</span>
                </Link>
              </div>
            </div>

            {/* 4 Thẻ số liệu thống kê */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Tổng số bài đã làm
                  </span>
                  <div className="text-2xl font-black text-slate-900">
                    {stats.totalExams}{' '}
                    <span className="text-xs text-slate-500 font-semibold">lượt thi</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Điểm cao nhất
                  </span>
                  <div className="text-2xl font-black text-emerald-700">
                    {stats.maxScore}{' '}
                    <span className="text-xs text-slate-500 font-semibold">/ 100đ</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Điểm trung bình
                  </span>
                  <div className="text-2xl font-black text-blue-700">
                    {stats.avgScore}{' '}
                    <span className="text-xs text-slate-500 font-semibold">/ 100đ</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Tỷ lệ đạt chuẩn (&ge; 50đ)
                  </span>
                  <div className="text-2xl font-black text-amber-700">
                    {stats.passRate}%
                  </div>
                </div>
              </div>
            )}

            {/* Bộ lọc theo mã đề */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                { code: 'ALL', label: 'Tất cả đề' },
                { code: 'CA1', label: 'CA1 • Toán cao cấp' },
                { code: 'CA2', label: 'CA2 • Kinh tế vĩ mô' },
                { code: 'CA3', label: 'CA3 • Triết học' },
                { code: 'CA4', label: 'CA4 • Nhà nước & PL' },
              ].map((tab) => {
                const count =
                  tab.code === 'ALL'
                    ? historyList.length
                    : historyList.filter((h) => h.paperCode === tab.code).length;

                return (
                  <button
                    key={tab.code}
                    onClick={() => setSelectedPaperFilter(tab.code)}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      selectedPaperFilter === tab.code
                        ? 'bg-[#0f2d22] text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        selectedPaperFilter === tab.code
                          ? 'bg-emerald-950 text-amber-300'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* DANH SÁCH BÀI ĐÃ LÀM */}
            {filteredHistory.length === 0 ? (
              <div className="text-center py-16 px-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4 max-w-lg mx-auto">
                <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center">
                  <History className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedPaperFilter === 'ALL'
                    ? 'Bạn chưa có bài thi nào trong lịch sử'
                    : `Chưa có bài thi nào thuộc mã đề ${selectedPaperFilter}`}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Hãy vào Ngân hàng đề thi để bắt đầu làm bài thi thử trực tuyến. Kết quả sẽ được lưu và thống kê tự động tại đây.
                </p>
                <div className="pt-2">
                  <Link
                    href="/select-exam"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0f2d22] hover:bg-[#184232] text-white font-bold text-xs transition"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Chọn đề thi ngay</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredHistory.map((item, index) => {
                  const meta = PAPER_META[item.paperCode] || PAPER_META.CA1;
                  const isFirst = index === 0;

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 hover:border-emerald-600/60 transition-all shadow-xs hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5 group"
                    >
                      {/* Cột 1: Thông tin đề thi */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-xl text-xs font-black border ${getPaperCodeBadge(
                              item.paperCode
                            )}`}
                          >
                            {item.paperCode}
                          </span>
                          <span className="text-xs font-bold text-slate-600">
                            {meta.subject}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Cloud className="w-3 h-3 text-emerald-600" />
                            Firebase
                          </span>
                          {isFirst && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200">
                              Mới nhất
                            </span>
                          )}
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-900 transition leading-snug">
                          {item.examTitle}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(item.submittedAt).toLocaleString('vi-VN')}
                          </span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Thời gian: {formatSeconds(item.timeSpentSeconds)}
                          </span>
                          <span>&bull;</span>
                          <span>SBD: <strong>{item.sbd}</strong></span>
                        </div>
                      </div>

                      {/* Cột 2: Chi tiết điểm từng phần */}
                      <div className="flex flex-wrap items-center gap-3 py-2 px-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            Tự luận (30đ)
                          </span>
                          <span className="font-bold text-slate-800">
                            {item.essayScore.toFixed(1)}đ{' '}
                            <span className="text-[11px] text-slate-500 font-normal">
                              ({item.essayWordCount} từ)
                            </span>
                          </span>
                        </div>
                        <div className="w-px h-7 bg-slate-200" />
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            Trắc nghiệm (70đ)
                          </span>
                          <span className="font-bold text-slate-800">
                            {item.objectiveScore.toFixed(1)}đ{' '}
                            <span className="text-[11px] text-slate-500 font-normal">
                              (Đúng {item.correctCount}/{item.totalQuestions})
                            </span>
                          </span>
                        </div>
                        <div className="w-px h-7 bg-slate-200" />
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            Độ chính xác
                          </span>
                          <span className="font-bold text-blue-700">
                            {item.totalQuestions > 0
                              ? ((item.correctCount / item.totalQuestions) * 100).toFixed(0)
                              : 0}
                            %
                          </span>
                        </div>
                      </div>

                      {/* Cột 3: Điểm tổng & Nút xem chi tiết */}
                      <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                        {/* Hộp điểm tổng */}
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                              TỔNG ĐIỂM
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase inline-block ${getClassificationStyle(
                                item.classification
                              )}`}
                            >
                              {item.classification}
                            </span>
                          </div>
                          <div className="w-14 h-14 rounded-2xl bg-[#0f2d22] text-amber-300 flex flex-col items-center justify-center font-black shadow-sm shrink-0">
                            <span className="text-xl leading-none font-mono">
                              {item.totalScore.toFixed(1)}
                            </span>
                            <span className="text-[8px] text-slate-300 uppercase tracking-tighter mt-0.5 font-bold">
                              / 100đ
                            </span>
                          </div>
                        </div>

                        {/* Các nút bấm thao tác */}
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                          <button
                            onClick={() => handleViewDetail(item)}
                            className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-[#0f2d22] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition cursor-pointer active:scale-[0.98] whitespace-nowrap"
                          >
                            <Eye className="w-4 h-4 text-emerald-300" />
                            <span>Xem chi tiết bài làm</span>
                          </button>

                          <button
                            onClick={() =>
                              router.push(`/exam?id=${item.examId}&ca=${item.paperCode}`)
                            }
                            className="p-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                            title="Làm lại đề thi này"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>

                          <button
                            onClick={(e) => handleDeleteSubmission(item, e)}
                            className="p-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 transition cursor-pointer"
                            title="Xoá kết quả này khỏi Firebase"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* =========================================================================
           * GIAO DIỆN 2: CHI TIẾT 1 BÀI THI (CHỈ MỞ KHI BẤM "XEM CHI TIẾT")
           * ========================================================================= */
          currentResult && (
            <div className="space-y-6">
              {/* Thanh điều hướng quay lại danh sách đề đã làm */}
              <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
                <button
                  onClick={handleBackToList}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Quay lại danh sách đề đã làm</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      router.push(
                        `/exam?id=${currentResult.examId}&ca=${currentResult.paperCode}`
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-[#c1121f] hover:bg-[#a50f1a] text-white font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Làm lại đề này</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="p-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                    title="In bảng điểm"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => handleDeleteSubmission(currentResult, e)}
                    className="p-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 transition cursor-pointer"
                    title="Xoá kết quả này khỏi Firebase"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* THẺ TỔNG QUAN ĐIỂM SỐ CHUẨN BỘ CÔNG AN (100 ĐIỂM) */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-[#0f2d22] text-amber-300">
                        MÃ ĐỀ: {currentResult.paperCode}
                      </span>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        {currentResult.subject}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Cloud className="w-3 h-3 text-emerald-600" />
                        Đã lưu an toàn trên Firebase
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      {currentResult.examTitle}
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                      <span>
                        Thí sinh: <strong>{currentResult.candidateName}</strong> (SBD:{' '}
                        {currentResult.sbd})
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(currentResult.submittedAt).toLocaleString('vi-VN')}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatSeconds(currentResult.timeSpentSeconds)}
                      </span>
                    </div>
                  </div>

                  {/* Khối Điểm tổng lớn */}
                  <div className="flex items-center gap-4 self-start md:self-auto bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="text-right">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block">
                        TỔNG ĐIỂM THI
                      </span>
                      <span className="text-xs font-bold text-emerald-800">
                        Xếp loại: <strong>{currentResult.classification}</strong>
                      </span>
                    </div>
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0f2d22] text-amber-400 flex flex-col items-center justify-center font-black shadow-md">
                      <span className="text-2xl sm:text-3xl leading-none">
                        {currentResult.totalScore.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-slate-300 font-bold uppercase mt-0.5">
                        / 100 ĐIỂM
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4 Thẻ thành phần điểm số */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      Phần I: Tự luận (30đ)
                    </span>
                    <div className="text-xl font-black text-slate-900">
                      {currentResult.essayScore.toFixed(1)}{' '}
                      <span className="text-xs text-slate-500 font-normal">/ 30</span>
                    </div>
                    <span className="text-[11px] font-medium text-emerald-700 block">
                      {currentResult.essayWordCount} từ (
                      {currentResult.essayWordCount >= 500 ? 'Đạt' : 'Chưa đủ 500 từ'})
                    </span>
                  </div>

                  <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      Phần II: Khách quan (70đ)
                    </span>
                    <div className="text-xl font-black text-slate-900">
                      {currentResult.objectiveScore.toFixed(1)}{' '}
                      <span className="text-xs text-slate-500 font-normal">/ 70</span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-600 block">
                      Đúng {currentResult.correctCount}/{currentResult.totalQuestions} câu
                    </span>
                  </div>

                  <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      Tỷ lệ chính xác
                    </span>
                    <div className="text-xl font-black text-blue-700">
                      {currentResult.totalQuestions > 0
                        ? (
                            (currentResult.correctCount / currentResult.totalQuestions) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </div>
                    <span className="text-[11px] font-medium text-slate-600 block">
                      Sai: {currentResult.incorrectCount} &bull; Bỏ qua:{' '}
                      {currentResult.unansweredCount}
                    </span>
                  </div>

                  <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      Thời gian làm bài
                    </span>
                    <div className="text-xl font-black text-amber-700">
                      {Math.round(currentResult.timeSpentSeconds / 60)} phút
                    </div>
                    <span className="text-[11px] font-medium text-slate-600 block">
                      Quy định: {currentResult.durationMinutes} phút
                    </span>
                  </div>
                </div>
              </div>

              {/* PHẦN I: XEM LẠI BÀI TỰ LUẬN & ĐÁNH GIÁ */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-600" />
                    <h3 className="text-base font-extrabold text-[#0f2d22]">
                      Phần I: Tự luận Nghị luận Xã hội (Điểm:{' '}
                      {currentResult.essayScore.toFixed(1)}/30)
                    </h3>
                  </div>
                  <button
                    onClick={() => setExpandedEssay(!expandedEssay)}
                    className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {expandedEssay ? 'Thu gọn bài làm' : 'Xem toàn bộ bài làm'}
                    {expandedEssay ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Nhận xét chấm tự luận */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs sm:text-sm text-emerald-950 leading-relaxed">
                  <strong>Nhận xét & Thang điểm:</strong> {currentResult.essayFeedback}
                </div>

                {/* Nội dung bài viết */}
                {expandedEssay && (
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed font-serif whitespace-pre-wrap">
                    {currentResult.essayText || 'Thí sinh không nhập nội dung bài tự luận.'}
                  </div>
                )}
              </div>

              {/* PHẦN II: CHI TIẾT TỪNG CÂU HỎI & LỜI GIẢI */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm">
                  <div>
                    <h3 className="text-base font-extrabold text-[#0f2d22]">
                      Phần II: Bảng phân tích chi tiết từng câu hỏi
                    </h3>
                    <p className="text-xs text-slate-500">
                      Đối chiếu câu trả lời của bạn với đáp án chính thức và lời giải chi tiết
                    </p>
                  </div>

                  {/* Bộ lọc câu hỏi */}
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <button
                      onClick={() => setFilterType('ALL')}
                      className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                        filterType === 'ALL'
                          ? 'bg-[#0f2d22] text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Tất cả ({currentResult.details?.length || 0})
                    </button>
                    <button
                      onClick={() => setFilterType('CORRECT')}
                      className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                        filterType === 'CORRECT'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      Đúng ({currentResult.correctCount})
                    </button>
                    <button
                      onClick={() => setFilterType('WRONG')}
                      className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                        filterType === 'WRONG'
                          ? 'bg-red-700 text-white'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      Sai ({currentResult.incorrectCount})
                    </button>
                    <button
                      onClick={() => setFilterType('UNANSWERED')}
                      className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                        filterType === 'UNANSWERED'
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Chưa làm ({currentResult.unansweredCount})
                    </button>
                  </div>
                </div>

                {/* Danh sách các câu hỏi chi tiết */}
                <div className="space-y-4">
                  {filteredDetails.map((q) => {
                    return (
                      <div
                        key={q.questionNumber}
                        className={`bg-white rounded-3xl p-6 border transition shadow-sm ${
                          q.isCorrect
                            ? 'border-emerald-200 ring-1 ring-emerald-200/50'
                            : !q.userAnswer
                            ? 'border-slate-200'
                            : 'border-red-200 ring-1 ring-red-200/50'
                        }`}
                      >
                        {/* Tiêu đề câu hỏi */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-[#0f2d22] px-2.5 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200">
                              Câu {q.questionNumber}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 uppercase">
                              {q.type === 'mcq'
                                ? 'Trắc nghiệm đơn'
                                : q.type === 'short_numeric'
                                ? 'Trả lời ngắn (Số)'
                                : q.type === 'short_blanks'
                                ? 'Điền khuyết (Blank)'
                                : 'Trả lời ngắn (Tình huống)'}
                            </span>
                          </div>

                          {q.isCorrect ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Đúng
                            </span>
                          ) : !q.userAnswer ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                              Chưa làm
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs font-bold text-red-800 bg-red-50 px-2.5 py-1 rounded-full border border-red-300">
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                              Sai
                            </span>
                          )}
                        </div>

                        {/* Đề bài (hỗ trợ công thức LaTeX) */}
                        <div className="text-sm text-slate-900 leading-relaxed font-medium mb-4">
                          <MathText text={q.stem} />
                        </div>

                        {/* Phương án lựa chọn MCQ */}
                        {q.type === 'mcq' &&
                          Array.isArray(q.options) &&
                          q.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                              {q.options.map((opt) => {
                                const isUserChoice = q.userAnswer === opt.key;
                                const isCorrectChoice = q.correctAnswer === opt.key;

                                let optStyle =
                                  'border-slate-200 bg-slate-50/50 text-slate-700';
                                if (isCorrectChoice) {
                                  optStyle =
                                    'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-500';
                                } else if (isUserChoice && !q.isCorrect) {
                                  optStyle =
                                    'border-red-400 bg-red-50 text-red-950 font-semibold';
                                }

                                return (
                                  <div
                                    key={opt.key}
                                    className={`p-3 rounded-2xl border text-xs sm:text-sm flex items-start gap-2.5 ${optStyle}`}
                                  >
                                    <span className="font-extrabold shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-white border border-slate-300">
                                      {opt.key}
                                    </span>
                                    <div className="leading-relaxed flex-1">
                                      <MathText text={opt.text} />
                                    </div>
                                    {isCorrectChoice && (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                    )}
                                    {isUserChoice && !q.isCorrect && (
                                      <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                        {/* Câu trả lời đối chiếu (cho dạng Trả lời ngắn / Điền khuyết) */}
                        {q.type !== 'mcq' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs sm:text-sm">
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                              <span className="font-bold text-slate-500 block text-[11px] uppercase mb-1">
                                Câu trả lời của bạn:
                              </span>
                              <span
                                className={`font-mono font-bold ${
                                  q.isCorrect ? 'text-emerald-800' : 'text-red-700'
                                }`}
                              >
                                {q.userAnswer || '(Không trả lời)'}
                              </span>
                            </div>
                            <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-300">
                              <span className="font-bold text-emerald-900 block text-[11px] uppercase mb-1">
                                Đáp án chính thức:
                              </span>
                              <span className="font-mono font-bold text-emerald-950">
                                {q.correctAnswer || '(Chưa có key)'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Lời giải chi tiết */}
                        {q.explanation && (
                          <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl text-xs sm:text-sm text-slate-800 space-y-1">
                            <span className="font-extrabold text-amber-900 block text-[11px] uppercase">
                              Lời giải chi tiết:
                            </span>
                            <div className="leading-relaxed">
                              <MathText text={q.explanation} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Nút quay lại danh sách ở chân trang */}
              <div className="text-center pt-4">
                <button
                  onClick={handleBackToList}
                  className="px-6 py-3 rounded-2xl bg-[#0f2d22] hover:bg-[#184232] text-white font-bold text-xs sm:text-sm shadow-sm transition cursor-pointer inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Quay lại danh sách các đề đã làm</span>
                </button>
              </div>
            </div>
          )
        )}
      </main>

      {/* ===== 3. FOOTER ===== */}
      <footer className="bg-[#0a2018] text-emerald-100/60 text-xs py-5 px-4 text-center mt-12 border-t border-emerald-950">
        Hệ Thống Luyện Thi Trực Tuyến Tuyển Sinh Văn Bằng 2 Công An Nhân Dân &bull; Chuẩn hoá cấu trúc 4 mã đề CA1 - CA2 - CA3 - CA4
      </footer>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f8f7] flex items-center justify-center text-slate-500 text-sm font-semibold">
          Đang nạp kết quả thi...
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
