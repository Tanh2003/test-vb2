'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  FileText,
  Upload,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Globe,
  Lock,
  RefreshCw,
  Search,
  Sparkles,
  Layers,
  Clock,
  ArrowRight,
  ExternalLink,
  BookOpen,
  Calendar,
  UserCheck,
  AlertTriangle,
  Loader2,
  Tag,
} from 'lucide-react';
import Header from '@/components/common/Header';
import { PAPER_META, PaperCode } from '@/types/exam';
import { BlogPost } from '@/app/api/blogs/route';

interface CandidateInfo {
  uid?: string;
  id?: string;
  email?: string;
  sbd?: string;
  username?: string;
  fullName?: string;
  role?: string;
}

interface ExamItem {
  id: string;
  title: string;
  paperCode: string;
  examCode: string;
  subject?: string;
  duration?: number;
  totalQuestions?: number;
  ownerId?: string;
  ownerName?: string;
  isPublic?: boolean;
  pdfFileUrl?: string;
  updatedAt?: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [candidate, setCandidate] = useState<CandidateInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'exams' | 'blogs'>('exams');

  // Exams State
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [examSearch, setExamSearch] = useState('');
  const [filterExamCa, setFilterExamCa] = useState<'ALL' | 'CA1' | 'CA2' | 'CA3' | 'CA4'>('ALL');
  const [filterExamScope, setFilterExamScope] = useState<'ALL' | 'PUBLIC' | 'PRIVATE'>('ALL');
  const [togglingExamId, setTogglingExamId] = useState<string | null>(null);

  // Blogs State
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [isLoadingBlogs, setIsLoadingBlogs] = useState(true);
  const [blogSearch, setBlogSearch] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Partial<BlogPost> | null>(null);
  const [isSavingBlog, setIsSavingBlog] = useState(false);

  // 1. Kiểm tra quyền Admin
  useEffect(() => {
    try {
      const stored = localStorage.getItem('candidate_info');
      if (stored) {
        const user = JSON.parse(stored);
        setCandidate(user);
        const checkAdmin =
          user.role === 'admin' ||
          user.username?.toLowerCase() === 'admin' ||
          user.sbd?.toUpperCase() === 'ADMIN' ||
          user.email?.toLowerCase().includes('admin');

        setIsAdmin(Boolean(checkAdmin));
      } else {
        setIsAdmin(false);
      }
    } catch {
      setIsAdmin(false);
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  // 2. Tải danh sách đề thi (Admin thấy tất cả đề)
  const fetchExams = useCallback(async () => {
    setIsLoadingExams(true);
    try {
      const res = await fetch('/api/exams', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setExams(data);
        }
      }
    } catch (e) {
      console.error('Lỗi lấy danh sách đề:', e);
    } finally {
      setIsLoadingExams(false);
    }
  }, []);

  // 3. Tải danh sách bài viết Blog (cả bài draft & published)
  const fetchBlogs = useCallback(async () => {
    setIsLoadingBlogs(true);
    try {
      const res = await fetch('/api/blogs?adminOnly=true', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setBlogs(data);
        }
      }
    } catch (e) {
      console.error('Lỗi lấy danh sách blog:', e);
    } finally {
      setIsLoadingBlogs(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchExams();
      fetchBlogs();
    }
  }, [isAdmin, fetchExams, fetchBlogs]);

  // Thao tác: Bật/Tắt trạng thái Công Khai của Đề thi
  const handleToggleExamPublic = async (exam: ExamItem) => {
    const nextPublic = !exam.isPublic;
    const confirmMsg = nextPublic
      ? `Bạn có chắc muốn đặt đề thi "${exam.title}" thành CÔNG KHAI?\n\nTất cả thí sinh trên web đều sẽ thấy và làm được đề này mà không cần đăng nhập.`
      : `Chuyển đề thi "${exam.title}" về chế độ RIÊNG TƯ?\n\nChỉ tài khoản chủ sở hữu mới nhìn thấy.`;

    if (!confirm(confirmMsg)) return;

    setTogglingExamId(exam.id);
    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...exam,
          isPublic: nextPublic,
        }),
      });

      if (res.ok) {
        setExams((prev) =>
          prev.map((item) =>
            item.id === exam.id ? { ...item, isPublic: nextPublic } : item
          )
        );
      } else {
        alert('Không thể cập nhật trạng thái đề thi.');
      }
    } catch (e) {
      console.error(e);
      alert('Lỗi cập nhật đề thi.');
    } finally {
      setTogglingExamId(null);
    }
  };

  // Thao tác: Xoá đề thi
  const handleDeleteExam = async (exam: ExamItem) => {
    if (!confirm(`Xoá vĩnh viễn đề thi "${exam.title}"?`)) return;

    try {
      const res = await fetch(`/api/exams?id=${encodeURIComponent(exam.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setExams((prev) => prev.filter((item) => item.id !== exam.id));
      } else {
        alert('Xoá đề thi thất bại.');
      }
    } catch {
      alert('Lỗi khi xoá đề thi.');
    }
  };

  // Thao tác: Mở modal soạn thảo Blog
  const handleOpenNewBlog = () => {
    setEditingBlog({
      title: '',
      category: 'TIN_TUYEN_SINH',
      summary: '',
      content: '',
      coverImage: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80',
      author: candidate?.fullName || candidate?.username || 'Ban Quản Trị',
      authorRole: 'Admin',
      isPublished: true,
      featured: false,
    });
    setIsEditorOpen(true);
  };

  const handleEditBlog = (post: BlogPost) => {
    setEditingBlog(post);
    setIsEditorOpen(true);
  };

  // Thao tác: Lưu bài viết Blog
  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlog?.title || !editingBlog?.content) {
      alert('Vui lòng nhập tiêu đề và nội dung bài viết!');
      return;
    }

    setIsSavingBlog(true);
    try {
      const res = await fetch('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingBlog),
      });

      if (!res.ok) {
        throw new Error('Lỗi lưu bài viết');
      }

      const resData = await res.json();
      const savedPost = resData.blog;

      setBlogs((prev) => {
        const idx = prev.findIndex((p) => p.id === savedPost.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = savedPost;
          return next;
        }
        return [savedPost, ...prev];
      });

      setIsEditorOpen(false);
      setEditingBlog(null);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu bài viết');
    } finally {
      setIsSavingBlog(false);
    }
  };

  // Thao tác: Xoá bài viết Blog
  const handleDeleteBlog = async (post: BlogPost) => {
    if (!confirm(`Bạn có chắc muốn xoá bài viết "${post.title}"?`)) return;

    try {
      const res = await fetch(`/api/blogs?id=${encodeURIComponent(post.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setBlogs((prev) => prev.filter((p) => p.id !== post.id));
      } else {
        alert('Không thể xoá bài viết.');
      }
    } catch {
      alert('Lỗi kết nối khi xoá bài viết.');
    }
  };

  // Lọc danh sách đề thi
  const filteredExams = exams.filter((e) => {
    const code = (e.paperCode || e.examCode)?.toUpperCase();
    if (filterExamCa !== 'ALL' && code !== filterExamCa) return false;
    if (filterExamScope === 'PUBLIC' && !e.isPublic) return false;
    if (filterExamScope === 'PRIVATE' && e.isPublic) return false;
    if (examSearch.trim()) {
      const q = examSearch.toLowerCase();
      const matchTitle = (e.title || '').toLowerCase().includes(q);
      const matchOwner = (e.ownerName || '').toLowerCase().includes(q);
      const matchCode = (code || '').toLowerCase().includes(q);
      return matchTitle || matchOwner || matchCode;
    }
    return true;
  });

  // Lọc danh sách blog
  const filteredBlogs = blogs.filter((b) => {
    if (blogSearch.trim()) {
      const q = blogSearch.toLowerCase();
      return (
        b.title.toLowerCase().includes(q) ||
        (b.summary || '').toLowerCase().includes(q) ||
        (b.author || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Số lượng thống kê
  const publicExamsCount = exams.filter((e) => e.isPublic).length;
  const publishedBlogsCount = blogs.filter((b) => b.isPublished).length;

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#f7f8f7] flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-800" />
      </div>
    );
  }

  // Nếu không phải admin, hiển thị bảng từ chối quyền
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#f7f8f7] flex flex-col justify-between font-sans">
        <Header />
        <div className="max-w-md w-full mx-auto my-auto p-6 bg-white rounded-3xl border border-red-200 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Khu vực Quản trị viên</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              Bạn đang đăng nhập bằng tài khoản thí sinh thông thường ({candidate?.fullName || candidate?.username || 'Chưa đăng nhập'}). Chỉ tài khoản có quyền <strong>Admin</strong> mới được truy cập trang này.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/login?redirect=/admin"
              className="py-2.5 px-4 rounded-xl bg-[#0f2d22] text-white font-bold text-xs hover:bg-[#184232] transition"
            >
              Đăng nhập tài khoản Admin
            </Link>
            <button
              onClick={() => {
                // Tùy chọn chuyển đổi quyền admin nhanh cho phiên test hiện tại
                if (candidate) {
                  const upgraded = { ...candidate, role: 'admin' };
                  localStorage.setItem('candidate_info', JSON.stringify(upgraded));
                  setCandidate(upgraded);
                  setIsAdmin(true);
                } else {
                  router.push('/login?redirect=/admin');
                }
              }}
              className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
            >
              Kích hoạt quyền Admin (Chế độ thử nghiệm)
            </button>
          </div>
        </div>
        <footer className="bg-[#0a2018] text-emerald-100/60 text-xs py-4 text-center">
          onthivb2.io.vn &bull; Khu vực quản trị CAND
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8f7] text-slate-800 font-sans flex flex-col justify-between">
      {/* 1. HEADER CHUNG */}
      <Header />

      {/* 2. ADMIN HERO BANNER */}
      <section className="bg-[#0f2d22] text-white py-8 border-b border-emerald-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>BẢNG ĐIỀU KHIỂN QUẢN TRỊ VIÊN (ADMIN DASHBOARD)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Quản Trị Hệ Thống Thi Online VB2
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80">
              Quản lý đề thi công khai cho toàn hệ thống & Viết bài tin tức, cẩm nang tuyển sinh CAND.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/import?public=true"
              className="px-4 py-2.5 rounded-xl bg-[#c1121f] hover:bg-[#a50f1a] text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-2 cursor-pointer active:scale-[0.98]"
              title="Upload đề thi mới và tự động đặt làm Đề Công Khai cho toàn Web"
            >
              <Upload className="w-4 h-4" />
              <span>Upload đề công khai mới</span>
            </Link>
            <button
              onClick={handleOpenNewBlog}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Viết bài Blog mới</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. MAIN DASHBOARD CONTENT */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6 flex-1">
        {/* Hàng 4 thẻ số liệu thống kê */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Tổng số đề trên hệ thống
            </span>
            <div className="text-2xl font-black text-[#0f2d22]">
              {exams.length}{' '}
              <span className="text-xs text-slate-500 font-semibold">đề thi</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Đề công khai (Web)
            </span>
            <div className="text-2xl font-black text-emerald-700 flex items-center gap-1.5">
              <Globe className="w-5 h-5 text-emerald-600" />
              <span>{publicExamsCount}</span>
              <span className="text-xs text-slate-500 font-semibold">đề mở</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Bài viết Blog đã đăng
            </span>
            <div className="text-2xl font-black text-blue-700 flex items-center gap-1.5">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>{publishedBlogsCount}</span>
              <span className="text-xs text-slate-500 font-semibold">bài viết</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Quyền hạn đăng nhập
            </span>
            <div className="text-base font-black text-amber-700 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-amber-600" />
              <span>Quản trị viên (Admin)</span>
            </div>
          </div>
        </div>

        {/* Thanh chuyển tab quản trị */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('exams')}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'exams'
                ? 'bg-[#0f2d22] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Quản Lý Đề Thi Công Khai ({exams.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('blogs')}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'blogs'
                ? 'bg-[#0f2d22] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Quản Lý & Viết Bài Blog ({blogs.length})</span>
          </button>
        </div>

        {/* =========================================================================
         * TAB 1: QUẢN LÝ ĐỀ THI CÔNG KHAI
         * ========================================================================= */}
        {activeTab === 'exams' && (
          <div className="space-y-4">
            {/* Bộ lọc đề thi */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Lọc phạm vi */}
                <button
                  onClick={() => setFilterExamScope('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    filterExamScope === 'ALL'
                      ? 'bg-[#0f2d22] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({exams.length})
                </button>
                <button
                  onClick={() => setFilterExamScope('PUBLIC')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1 ${
                    filterExamScope === 'PUBLIC'
                      ? 'bg-emerald-800 text-white'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Đề công khai ({publicExamsCount})</span>
                </button>
                <button
                  onClick={() => setFilterExamScope('PRIVATE')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1 ${
                    filterExamScope === 'PRIVATE'
                      ? 'bg-amber-800 text-white'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Đề riêng tư ({exams.length - publicExamsCount})</span>
                </button>
              </div>

              {/* Ô tìm kiếm đề */}
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={examSearch}
                  onChange={(e) => setExamSearch(e.target.value)}
                  placeholder="Tìm tên đề, mã ca, người upload..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0f2d22] bg-slate-50"
                />
              </div>
            </div>

            {/* Danh sách đề thi */}
            {isLoadingExams ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-200">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-800 mx-auto" />
                <p className="text-xs text-slate-500 mt-2 font-medium">Đang tải danh sách đề thi...</p>
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500">
                Không tìm thấy đề thi nào phù hợp với bộ lọc.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExams.map((exam) => {
                  const pCode = ((exam.paperCode || exam.examCode)?.toUpperCase() as PaperCode) || 'CA1';
                  const isPublic = Boolean(exam.isPublic);

                  return (
                    <div
                      key={exam.id}
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <span className="w-11 h-11 rounded-xl bg-[#0f2d22] text-amber-300 font-extrabold flex flex-col items-center justify-center text-xs shrink-0 shadow-2xs">
                          <span className="text-[9px] text-emerald-300/80">MÃ</span>
                          <span className="text-xs font-black">{pCode}</span>
                        </span>

                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug truncate">
                              {exam.title}
                            </h3>
                            {isPublic ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                                <Globe className="w-3 h-3 text-emerald-700" /> Đang công khai (Toàn trang)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                <Lock className="w-3 h-3 text-slate-500" /> Riêng tư (Chỉ tài khoản sở hữu)
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>Môn: <strong>{exam.subject || PAPER_META[pCode]?.subject}</strong></span>
                            <span>Thời gian: {exam.duration || 150} phút</span>
                            <span>Số câu: {exam.totalQuestions || 50} câu</span>
                            <span>Người đăng: {exam.ownerName || exam.ownerId || 'Hệ thống'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Nút hành động của Admin */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        {/* Nút bật/tắt công khai */}
                        <button
                          onClick={() => handleToggleExamPublic(exam)}
                          disabled={togglingExamId === exam.id}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            isPublic
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}
                          title="Thay đổi quyền xem đề thi này cho toàn bộ học viên"
                        >
                          {togglingExamId === exam.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isPublic ? (
                            <Lock className="w-3.5 h-3.5 text-amber-700" />
                          ) : (
                            <Globe className="w-3.5 h-3.5 text-emerald-700" />
                          )}
                          <span>{isPublic ? 'Chuyển về Riêng tư' : 'Công khai cho toàn Web'}</span>
                        </button>

                        {/* Nút làm bài thử */}
                        <Link
                          href={`/exam?id=${exam.id}&ca=${pCode}`}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0f2d22] hover:bg-[#184232] text-white flex items-center gap-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <span>Xem đề</span>
                        </Link>

                        {/* Nút xem PDF nếu có */}
                        {exam.pdfFileUrl && (
                          <a
                            href={exam.pdfFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                            title="Xem tệp PDF đề thi gốc"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        {/* Nút xoá */}
                        <button
                          onClick={() => handleDeleteExam(exam)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          title="Xoá đề thi này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
         * TAB 2: QUẢN LÝ & VIẾT BÀI BLOG / TIN TỨC
         * ========================================================================= */}
        {activeTab === 'blogs' && (
          <div className="space-y-4">
            {/* Thanh công cụ bài viết */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={blogSearch}
                  onChange={(e) => setBlogSearch(e.target.value)}
                  placeholder="Tìm kiếm bài viết..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0f2d22] bg-slate-50"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchBlogs()}
                  disabled={isLoadingBlogs}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBlogs ? 'animate-spin' : ''}`} />
                  <span>Làm mới</span>
                </button>
                <button
                  onClick={handleOpenNewBlog}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#c1121f] hover:bg-[#a50f1a] text-white flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Soạn bài viết mới</span>
                </button>
              </div>
            </div>

            {/* Danh sách bài viết */}
            {isLoadingBlogs ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-200">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-800 mx-auto" />
                <p className="text-xs text-slate-500 mt-2 font-medium">Đang tải danh sách bài viết...</p>
              </div>
            ) : filteredBlogs.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500 space-y-3">
                <p>Chưa có bài viết blog nào.</p>
                <button
                  onClick={handleOpenNewBlog}
                  className="px-4 py-2 rounded-xl bg-[#0f2d22] text-white text-xs font-bold"
                >
                  Viết bài đầu tiên ngay
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredBlogs.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition"
                  >
                    <div>
                      {/* Ảnh bìa */}
                      {post.coverImage && (
                        <div className="h-40 w-full overflow-hidden relative bg-slate-100">
                          <img
                            src={post.coverImage}
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 left-3 flex items-center gap-1.5">
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#0f2d22] text-amber-300 shadow-xs">
                              {post.category === 'TIN_TUYEN_SINH'
                                ? 'Tin Tuyển Sinh'
                                : post.category === 'KINH_NGHIEM_THI'
                                ? 'Kinh Nghiệm'
                                : 'Quy Chế Ôn Thi'}
                            </span>
                            {post.isPublished ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                                Đã xuất bản
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                Bản nháp
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="p-5 space-y-2">
                        <h3 className="font-extrabold text-base text-slate-900 leading-snug line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                          {post.summary}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 pt-0 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-2">
                      <span className="text-[11px]">
                        {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/blog/${post.slug || post.id}`}
                          target="_blank"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-800 hover:bg-slate-100 transition"
                          title="Xem bài viết phía người dùng"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleEditBlog(post)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                          title="Chỉnh sửa bài viết"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBlog(post)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          title="Xoá bài viết"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* =========================================================================
       * MODAL SOẠN THẢO BÀI VIẾT BLOG
       * ========================================================================= */}
      {isEditorOpen && editingBlog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-5 my-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-800" />
                <h3 className="text-lg font-black text-slate-900">
                  {editingBlog.id ? 'Chỉnh Sửa Bài Viết' : 'Soạn Bài Viết Mới Cho Web'}
                </h3>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBlog} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tiêu đề bài viết (Bắt buộc)
                </label>
                <input
                  type="text"
                  required
                  value={editingBlog.title || ''}
                  onChange={(e) => setEditingBlog({ ...editingBlog, title: e.target.value })}
                  placeholder="Nhập tiêu đề tin tuyển sinh hoặc cẩm nang ôn thi..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0f2d22]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chuyên mục</label>
                  <select
                    value={editingBlog.category || 'TIN_TUYEN_SINH'}
                    onChange={(e) =>
                      setEditingBlog({ ...editingBlog, category: e.target.value as any })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0f2d22] bg-white"
                  >
                    <option value="TIN_TUYEN_SINH">Tin tức tuyển sinh CAND</option>
                    <option value="KINH_NGHIEM_THI">Kinh nghiệm & Bí quyết ôn thi</option>
                    <option value="QUY_CHE_ON_THI">Quy chế & Cấu trúc bài thi</option>
                    <option value="THONG_BAO">Thông báo chung</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tác giả</label>
                  <input
                    type="text"
                    value={editingBlog.author || 'Ban Quản Trị Tuyển Sinh CAND'}
                    onChange={(e) => setEditingBlog({ ...editingBlog, author: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0f2d22]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Đường dẫn ảnh bìa (Cover Image URL)</label>
                <input
                  type="text"
                  value={editingBlog.coverImage || ''}
                  onChange={(e) => setEditingBlog({ ...editingBlog, coverImage: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0f2d22]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tóm tắt ngắn (Summary)</label>
                <textarea
                  rows={2}
                  value={editingBlog.summary || ''}
                  onChange={(e) => setEditingBlog({ ...editingBlog, summary: e.target.value })}
                  placeholder="Đoạn mô tả ngắn hiển thị ở trang danh sách..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0f2d22]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nội dung chi tiết bài viết (Markdown / Văn bản)
                </label>
                <textarea
                  rows={9}
                  required
                  value={editingBlog.content || ''}
                  onChange={(e) => setEditingBlog({ ...editingBlog, content: e.target.value })}
                  placeholder="Nhập nội dung bài viết. Hỗ trợ tiêu đề ##, danh sách -, in đậm **chữ**..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0f2d22] font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editingBlog.isPublished !== false}
                    onChange={(e) =>
                      setEditingBlog({ ...editingBlog, isPublished: e.target.checked })
                    }
                    className="w-4 h-4 accent-emerald-700"
                  />
                  <span className="font-bold text-slate-800">Xuất bản bài viết cho toàn bộ người dùng xem</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(editingBlog.featured)}
                    onChange={(e) =>
                      setEditingBlog({ ...editingBlog, featured: e.target.checked })
                    }
                    className="w-4 h-4 accent-emerald-700"
                  />
                  <span className="font-bold text-slate-800">Ghim lên đầu trang (Featured)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition"
                >
                  Huỷ bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSavingBlog}
                  className="px-6 py-2 rounded-xl bg-[#c1121f] hover:bg-[#a50f1a] text-white font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingBlog ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu và Xuất Bản</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. FOOTER */}
      <footer className="bg-[#0a2018] text-emerald-100/60 text-xs py-6 px-4 text-center mt-12 border-t border-emerald-950">
        Hệ Thống Luyện Thi Trực Tuyến Tuyển Sinh Văn Bằng 2 CAND &bull; Bảng điều khiển Quản trị viên
      </footer>
    </div>
  );
}
