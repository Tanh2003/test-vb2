'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Upload,
  Clock,
  FileText,
  AlertCircle,
  PlayCircle,
  Sparkles,
  BookOpen,
  Calendar,
  ChevronRight,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { PaperCode, PAPER_META } from '@/types/exam';
import Header from '@/components/common/Header';
import { BlogPost } from '@/app/api/blogs/route';

interface Candidate {
  fullName?: string;
  username?: string;
  sbd?: string;
  email?: string;
  uid?: string;
  id?: string;
  role?: string;
}

interface ExamDoc {
  id: string;
  title: string;
  paperCode: string;
  examCode: string;
  subject?: string;
  totalQuestions?: number;
  duration?: number;
  durationMinutes?: number;
  ownerId?: string;
  userId?: string;
  ownerName?: string;
  isPublic?: boolean;
}

export default function HomePage() {
  const router = useRouter();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [userExams, setUserExams] = useState<ExamDoc[]>([]);
  const [publicExams, setPublicExams] = useState<ExamDoc[]>([]);
  const [isLoadingUserExams, setIsLoadingUserExams] = useState(true);
  const [isLoadingPublicExams, setIsLoadingPublicExams] = useState(true);
  const [activeCaTab, setActiveCaTab] = useState<'ALL' | 'CA1' | 'CA2' | 'CA3' | 'CA4'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'FREE' | 'USER'>('ALL');
  const [latestBlogs, setLatestBlogs] = useState<BlogPost[]>([]);
  const [isLoadingBlogs, setIsLoadingBlogs] = useState(true);

  // Load candidate info từ localStorage
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
  const currentUserEmail = candidate?.email || '';
  const isAdmin = Boolean(
    candidate?.role === 'admin' ||
    candidate?.username?.toLowerCase() === 'admin' ||
    candidate?.sbd?.toUpperCase() === 'ADMIN'
  );

  // Tải danh sách bài viết blog mới nhất từ Admin
  const fetchLatestBlogs = useCallback(async () => {
    setIsLoadingBlogs(true);
    try {
      const res = await fetch('/api/blogs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLatestBlogs(data.slice(0, 3));
        }
      }
    } catch {
      setLatestBlogs([]);
    } finally {
      setIsLoadingBlogs(false);
    }
  }, []);

  // 1. Tải đề thi CÁ NHÂN từ Firebase (của người nào người đó xem)
  const fetchUserExams = useCallback(async () => {
    if (!currentUserId && !currentUserEmail) {
      setUserExams([]);
      setIsLoadingUserExams(false);
      return;
    }

    setIsLoadingUserExams(true);
    try {
      const params = new URLSearchParams();
      params.set('userOnly', 'true');
      if (currentUserId) params.set('userId', currentUserId);
      if (currentUserEmail) params.set('email', currentUserEmail);

      const res = await fetch(`/api/exams?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setUserExams(data);
        } else {
          setUserExams([]);
        }
      } else {
        setUserExams([]);
      }
    } catch (err) {
      console.error('Lỗi lấy đề thi cá nhân:', err);
      setUserExams([]);
    } finally {
      setIsLoadingUserExams(false);
    }
  }, [currentUserId, currentUserEmail]);

  // 2. Tải đề thi MIỄN PHÍ / CÔNG KHAI từ Firebase (do Admin tự đăng)
  const fetchPublicExams = useCallback(async () => {
    setIsLoadingPublicExams(true);
    try {
      const res = await fetch('/api/exams?isPublic=true');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPublicExams(data);
        } else {
          setPublicExams([]);
        }
      } else {
        setPublicExams([]);
      }
    } catch (err) {
      console.error('Lỗi lấy đề thi công khai:', err);
      setPublicExams([]);
    } finally {
      setIsLoadingPublicExams(false);
    }
  }, []);

  useEffect(() => {
    fetchUserExams();
    fetchPublicExams();
    fetchLatestBlogs();
  }, [fetchUserExams, fetchPublicExams, fetchLatestBlogs]);

  const caCategories = [
    {
      code: 'CA1' as PaperCode,
      subject: 'Toán cao cấp',
      desc: 'Tự luận Xã hội (30đ) & Toán cao cấp (70đ: 45 trắc nghiệm + 5 trả lời ngắn)',
    },
    {
      code: 'CA2' as PaperCode,
      subject: 'Kinh tế vĩ mô',
      desc: 'Tự luận Xã hội (30đ) & Kinh tế vĩ mô (70đ: 45 trắc nghiệm + 5 trả lời ngắn)',
    },
    {
      code: 'CA3' as PaperCode,
      subject: 'Triết học Mác - Lênin',
      desc: 'Tự luận Xã hội (30đ) & Triết học Mác - Lênin (70đ: 54 trắc nghiệm + 6 điền khuyết)',
    },
    {
      code: 'CA4' as PaperCode,
      subject: 'Nhà nước và pháp luật',
      desc: 'Tự luận Xã hội (30đ) & Nhà nước và pháp luật (70đ: 54 trắc nghiệm + 6 tình huống)',
    },
  ];

  // Lọc đề của bạn theo mã Ca và tìm kiếm
  const filteredUserExams = userExams.filter((exam) => {
    if (activeCaTab !== 'ALL') {
      const code = (exam.paperCode || exam.examCode)?.toUpperCase();
      if (code !== activeCaTab) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = exam.title?.toLowerCase().includes(q);
      const matchSubj = exam.subject?.toLowerCase().includes(q);
      const matchCode = (exam.paperCode || exam.examCode)?.toLowerCase().includes(q);
      if (!matchTitle && !matchSubj && !matchCode) return false;
    }
    return true;
  });

  // Lọc đề công khai
  const filteredPublicExams = publicExams.filter((exam) => {
    if (activeCaTab !== 'ALL') {
      const code = (exam.paperCode || exam.examCode)?.toUpperCase();
      if (code !== activeCaTab) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = exam.title?.toLowerCase().includes(q);
      const matchSubj = exam.subject?.toLowerCase().includes(q);
      const matchCode = (exam.paperCode || exam.examCode)?.toLowerCase().includes(q);
      if (!matchTitle && !matchSubj && !matchCode) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f7f8f7] text-slate-800 font-sans flex flex-col justify-between">
      {/* 1. HEADER (Shared Component) */}
      <Header />

      {/* Hero Banner */}
      <div className="bg-[#0f2d22] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-1">
              VĂN BẰNG 2 &bull; CÔNG AN NHÂN DÂN
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
              Thư viện đề của bạn
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80">
              Hệ thống lưu trữ đề thi cá nhân bảo mật theo từng tài khoản và ngân hàng đề thi chuẩn Bộ Công An.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                href="/admin"
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-md transition active:scale-[0.98] flex items-center gap-1.5"
              >
                <span>⚙️ Bảng Quản trị Admin</span>
              </Link>
            )}
            <button
              onClick={() => {
                if (!candidate) {
                  router.push('/login?redirect=/import');
                } else {
                  router.push('/import');
                }
              }}
              className="px-6 py-2.5 rounded-xl bg-[#c1121f] hover:bg-[#a50f1a] font-bold text-white text-sm shadow-md transition active:scale-[0.98] cursor-pointer flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Upload đề mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. BODY CONTENT (BACKGROUND SÁNG) */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 flex-1">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tìm bộ đề
            </label>
            <input
              type="text"
              placeholder="Nhập tên đề thi, mã đề CA1 - CA4..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#0f2d22] transition"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nguồn đề
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#0f2d22] transition"
            >
              <option value="ALL">Tất cả</option>
              <option value="USER">Đề của bạn</option>
              <option value="FREE">Đề miễn phí (Admin)</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mã ca thi
            </label>
            <select
              value={activeCaTab}
              onChange={(e) => setActiveCaTab(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#0f2d22] transition"
            >
              <option value="ALL">Tất cả các ca</option>
              <option value="CA1">CA1 - Toán cao cấp</option>
              <option value="CA2">CA2 - Kinh tế vĩ mô</option>
              <option value="CA3">CA3 - Triết học Mác - Lênin</option>
              <option value="CA4">CA4 - Nhà nước và pháp luật</option>
            </select>
          </div>
        </div>

        {/* SECTION 2: ĐỀ CỦA BẠN (Dữ liệu thực tế từ Firebase) */}
        {(sourceFilter === 'ALL' || sourceFilter === 'USER') && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#0f2d22]">
                    Đề của bạn
                  </h2>
                  <span className="text-xs font-black text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                    {userExams.length} đề thi
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {candidate
                    ? `Danh sách đề thi do tài khoản ${candidate.fullName || candidate.username || 'của bạn'} tải lên`
                    : 'Đăng nhập để xem danh sách các đề thi của bạn'}
                </p>
              </div>

              {/* Ca Tabs Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {(['ALL', 'CA1', 'CA2', 'CA3', 'CA4'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveCaTab(tab)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeCaTab === tab
                        ? 'bg-[#0f2d22] text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {tab === 'ALL' ? 'Tất cả' : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Trạng thái Loading hoặc Danh sách đề của bạn */}
            {isLoadingUserExams ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200 animate-pulse space-y-3">
                    <div className="h-5 bg-slate-200 rounded w-1/3" />
                    <div className="h-6 bg-slate-200 rounded w-3/4" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-10 bg-slate-200 rounded-xl w-full pt-2" />
                  </div>
                ))}
              </div>
            ) : filteredUserExams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredUserExams.map((exam) => {
                  const pCode = ((exam.paperCode || exam.examCode || 'CA1') as string).toUpperCase() as PaperCode;
                  const subjectName = exam.subject || PAPER_META[pCode]?.subject || 'Môn thi chuyên ngành';

                  return (
                    <div
                      key={exam.id}
                      className="group bg-white rounded-3xl p-6 border-2 border-amber-300 ring-2 ring-amber-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black px-3 py-1 rounded-xl bg-[#0f2d22] text-amber-300 shadow-2xs tracking-wider">
                            MÃ ĐỀ: {pCode}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-extrabold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full">
                            ⭐ Đề của bạn
                          </span>
                        </div>

                        <div>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                            {subjectName}
                          </span>
                          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-900 leading-snug line-clamp-2 mt-0.5">
                            {exam.title}
                          </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200/80 font-semibold">
                            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>{exam.duration || exam.durationMinutes || 150} Phút</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200/80 font-semibold">
                            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>{exam.totalQuestions || 50} Câu hỏi</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/exam?id=${exam.id}&ca=${pCode}`)}
                          className="flex-1 py-3 px-4 bg-[#c1121f] hover:bg-[#a50f1a] text-white font-bold rounded-xl text-sm shadow-sm flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.98]"
                        >
                          <PlayCircle className="w-4 h-4" />
                          <span>Vào làm bài ngay</span>
                        </button>
                        <button
                          onClick={() => {
                            const dest = `/import?ca=${pCode}`;
                            if (!candidate) {
                              router.push(`/login?redirect=${encodeURIComponent(dest)}`);
                            } else {
                              router.push(dest);
                            }
                          }}
                          className="px-3 py-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
                          title="Tải đề khác cho mã này"
                        >
                          Upload lại
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Khối Banner khi chưa có đề thi */
              <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
                    {activeCaTab === 'ALL'
                      ? 'Bạn chưa có đề nào trong mục Đề của bạn'
                      : `Bạn chưa upload đề thi nào cho mã ${activeCaTab} (${PAPER_META[activeCaTab]?.subject || ''})`}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                    {candidate
                      ? 'Tải lên file đề PDF của bạn để bắt đầu làm bài trực tuyến.'
                      : 'Hãy đăng nhập để lưu trữ và quản lý các đề thi cá nhân của bạn.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      const dest = `/import${activeCaTab !== 'ALL' ? `?ca=${activeCaTab}` : ''}`;
                      if (!candidate) {
                        router.push(`/login?redirect=${encodeURIComponent(dest)}`);
                      } else {
                        router.push(dest);
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#c1121f] hover:bg-[#a50f1a] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center gap-2 cursor-pointer transition active:scale-[0.98]"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload đề PDF {activeCaTab !== 'ALL' ? activeCaTab : ''}</span>
                  </button>
                  {!candidate && (
                    <Link
                      href="/login?redirect=/import"
                      className="px-5 py-2.5 rounded-xl bg-[#0f2d22] hover:bg-[#184232] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center gap-2 cursor-pointer transition"
                    >
                      Đăng nhập ngay
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* 4 Ca Upload Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {caCategories.map((ca) => {
                const count = userExams.filter(
                  (e) => (e.paperCode || e.examCode)?.toUpperCase() === ca.code
                ).length;

                return (
                  <div
                    key={ca.code}
                    className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-slate-300 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-extrabold text-slate-900">
                          {ca.code} &bull; {ca.subject}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {count > 0 ? `${count} đề của bạn` : '0 đề'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-5 leading-relaxed">{ca.desc}</p>
                    </div>
                    <button
                      onClick={() => {
                        const dest = `/import?ca=${ca.code}`;
                        if (!candidate) {
                          router.push(`/login?redirect=${encodeURIComponent(dest)}`);
                        } else {
                          router.push(dest);
                        }
                      }}
                      className="w-full py-2.5 rounded-xl bg-[#0f2d22] hover:bg-[#184232] text-white font-bold text-xs sm:text-sm shadow-xs transition active:scale-[0.98] cursor-pointer"
                    >
                      Upload đề {ca.code}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 1: BỘ ĐỀ MIỄN PHÍ (Chỉ hiển thị đề công khai do Admin đăng lên Firebase) */}
        {(sourceFilter === 'ALL' || sourceFilter === 'FREE') && (
          <div className="space-y-4 pt-4 border-t border-slate-200/80">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    Bộ đề miễn phí (Đề công khai do Admin đăng)
                  </h2>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                    Mở toàn Web
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Các đề thi chuẩn được Ban Quản trị đăng tải công khai cho toàn bộ thí sinh
                </p>
              </div>
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-xl transition flex items-center gap-1"
                  >
                    <span>⚙️ Quản lý Đề Công Khai (Admin)</span>
                  </Link>
                )}
                <Link
                  href="/select-exam"
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline"
                >
                  Xem tất cả ngân hàng đề &rarr;
                </Link>
              </div>
            </div>

            {isLoadingPublicExams ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200 animate-pulse space-y-3">
                    <div className="h-5 bg-slate-200 rounded w-1/3" />
                    <div className="h-6 bg-slate-200 rounded w-3/4" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredPublicExams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {filteredPublicExams.map((exam) => {
                  const pCode = ((exam.paperCode || exam.examCode || 'CA1') as string).toUpperCase();
                  return (
                    <div
                      key={exam.id}
                      className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-2">
                            {exam.title}
                          </h3>
                          <span className="shrink-0 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Miễn phí
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-6">
                          {pCode} &bull; {exam.totalQuestions || 50} câu &bull; {exam.duration || 150} phút
                        </p>
                      </div>
                      <button
                        onClick={() => router.push(`/exam?id=${exam.id}&ca=${pCode}`)}
                        className="w-full py-2.5 rounded-xl bg-[#0f2d22] hover:bg-[#184232] text-white font-bold text-sm transition active:scale-[0.98] cursor-pointer"
                      >
                        Làm bài ngay
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-xs sm:text-sm text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">Chưa có đề thi mẫu công khai nào.</p>
                <p>Các bộ đề thi chuẩn sẽ được Ban Quản trị cập nhật trực tiếp lên hệ thống.</p>
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: TIN TỨC & BÀI VIẾT BLOG CỦA ADMIN */}
        <div className="space-y-4 pt-6 border-t border-slate-200/80">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  Tin tức & Cẩm nang ôn thi mới nhất
                </h2>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Ban Quản Trị
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Thông báo tuyển sinh, bí quyết làm bài tự luận và cẩm nang ôn thi trực tiếp từ Admin
              </p>
            </div>
            <Link
              href="/blog"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1"
            >
              <span>Xem tất cả tin tức</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoadingBlogs ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-3xl p-5 border border-slate-200 animate-pulse space-y-3">
                  <div className="h-32 bg-slate-200 rounded-2xl w-full" />
                  <div className="h-5 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : latestBlogs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {latestBlogs.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition"
                >
                  <div>
                    {b.coverImage && (
                      <div className="h-36 w-full relative overflow-hidden bg-slate-100">
                        <img
                          src={b.coverImage}
                          alt={b.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4 space-y-1.5">
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                        {b.category === 'TIN_TUYEN_SINH'
                          ? 'Tin Tuyển Sinh'
                          : b.category === 'KINH_NGHIEM_THI'
                          ? 'Kinh Nghiệm'
                          : 'Quy Chế'}
                      </span>
                      <h3 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2 hover:text-emerald-900">
                        <Link href={`/blog/${b.slug || b.id}`}>{b.title}</Link>
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {b.summary}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 mt-2">
                    <span className="text-[11px]">{new Date(b.createdAt).toLocaleDateString('vi-VN')}</span>
                    <Link
                      href={`/blog/${b.slug || b.id}`}
                      className="font-bold text-[#0f2d22] hover:text-emerald-950 flex items-center gap-0.5 text-xs"
                    >
                      <span>Đọc tiếp</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </main>

      {/* 3. FOOTER */}
      <footer className="bg-[#0a2018] text-emerald-100/60 text-xs py-6 px-4 text-center mt-12 border-t border-emerald-950">
        Hệ Thống Luyện Thi Trực Tuyến Tuyển Sinh Văn Bằng 2 Công An Nhân Dân &bull; Chuẩn hoá cấu trúc 4 mã đề CA1 - CA2 - CA3 - CA4
      </footer>
    </div>
  );
}
