'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import {
  FileText,
  Calendar,
  User,
  ArrowRight,
  Search,
  Sparkles,
  Tag,
  Loader2,
  BookOpen,
  ChevronRight,
  Award,
} from 'lucide-react';
import Header from '@/components/common/Header';
import { BlogPost } from '@/app/api/blogs/route';

export default function BlogListingPage() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBlogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const url =
        selectedCategory !== 'ALL'
          ? `/api/blogs?category=${encodeURIComponent(selectedCategory)}`
          : '/api/blogs';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setBlogs(data);
        }
      }
    } catch (e) {
      console.error('Lỗi lấy bài viết:', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  const categories = [
    { key: 'ALL', label: 'Tất cả bài viết' },
    { key: 'TIN_TUYEN_SINH', label: 'Tin tuyển sinh CAND' },
    { key: 'KINH_NGHIEM_THI', label: 'Kinh nghiệm làm bài' },
    { key: 'QUY_CHE_ON_THI', label: 'Quy chế & Cấu trúc đề' },
  ];

  const filteredBlogs = blogs.filter((b) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = b.title.toLowerCase().includes(q);
      const matchSummary = (b.summary || '').toLowerCase().includes(q);
      return matchTitle || matchSummary;
    }
    return true;
  });

  const featuredPost = filteredBlogs.find((b) => b.featured) || filteredBlogs[0];
  const regularPosts = featuredPost
    ? filteredBlogs.filter((b) => b.id !== featuredPost.id)
    : filteredBlogs;

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'TIN_TUYEN_SINH':
        return 'bg-blue-100 text-blue-900 border-blue-200';
      case 'KINH_NGHIEM_THI':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      case 'QUY_CHE_ON_THI':
        return 'bg-amber-100 text-amber-900 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'TIN_TUYEN_SINH':
        return 'Tin Tuyển Sinh';
      case 'KINH_NGHIEM_THI':
        return 'Kinh Nghiệm Ôn Thi';
      case 'QUY_CHE_ON_THI':
        return 'Quy Chế & Đề Thi';
      default:
        return 'Thông Báo';
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8f7] text-slate-800 font-sans flex flex-col justify-between">
      {/* 1. HEADER CHUNG */}
      <Header />

      {/* 2. HERO BANNER */}
      <section className="bg-[#0f2d22] text-white py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/80 border border-emerald-700/60 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>CẨM NANG & TIN TỨC TUYỂN SINH VB2 CAND</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Tin Tức Tuyển Sinh & Bí Quyết Ôn Luyện
          </h1>

          <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl font-normal leading-relaxed">
            Cập nhật chỉ tiêu, quy chế tuyển sinh chính thức của Bộ Công An cùng các bài viết hướng dẫn chuyên sâu từ đội ngũ giảng viên và thủ khoa các năm trước.
          </p>
        </div>
      </section>

      {/* 3. MAIN CONTENT */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 flex-1">
        {/* Bộ lọc chuyên mục & Tìm kiếm */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setSelectedCategory(c.key)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  selectedCategory === c.key
                    ? 'bg-[#0f2d22] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm bài viết..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0f2d22] bg-white shadow-xs"
            />
          </div>
        </div>

        {/* Trạng thái tải bài viết */}
        {isLoading ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-slate-200">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-800 mx-auto" />
            <p className="text-xs text-slate-500 mt-2 font-medium">Đang tải danh sách bài viết...</p>
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs sm:text-sm">
            Chưa có bài viết nào trong chuyên mục này.
          </div>
        ) : (
          <div className="space-y-8">
            {/* BÀI VIẾT NỔI BẬT LỚN (FEATURED) */}
            {featuredPost && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 hover:shadow-md transition">
                <div className="lg:col-span-7 h-64 sm:h-80 lg:h-full relative overflow-hidden bg-slate-100">
                  <img
                    src={featuredPost.coverImage || '/blog-tuyen-sinh.png'}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-[#c1121f] text-white shadow-xs flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Bài viết nổi bật</span>
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getCategoryBadge(
                        featuredPost.category
                      )}`}
                    >
                      {getCategoryLabel(featuredPost.category)}
                    </span>

                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      <Link
                        href={`/blog/${featuredPost.slug || featuredPost.id}`}
                        className="hover:text-emerald-900 transition"
                      >
                        {featuredPost.title}
                      </Link>
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-4">
                      {featuredPost.summary}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-700">{featuredPost.author}</span>
                    </div>

                    <Link
                      href={`/blog/${featuredPost.slug || featuredPost.id}`}
                      className="px-4 py-2 rounded-xl bg-[#0f2d22] hover:bg-[#184232] text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-[0.98]"
                    >
                      <span>Đọc bài viết</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* DANH SÁCH BÀI VIẾT THƯỜNG (GRID 3 CỘT) */}
            {regularPosts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regularPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition duration-200"
                  >
                    <div>
                      <div className="h-44 w-full relative overflow-hidden bg-slate-100">
                        <img
                          src={post.coverImage || '/blog-default.png'}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 left-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-xs ${getCategoryBadge(
                              post.category
                            )}`}
                          >
                            {getCategoryLabel(post.category)}
                          </span>
                        </div>
                      </div>

                      <div className="p-5 space-y-2.5">
                        <h3 className="font-extrabold text-base text-slate-900 leading-snug line-clamp-2 hover:text-emerald-900 transition">
                          <Link href={`/blog/${post.slug || post.id}`}>
                            {post.title}
                          </Link>
                        </h3>

                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                          {post.summary}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 pt-0 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-2">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                      </span>

                      <Link
                        href={`/blog/${post.slug || post.id}`}
                        className="font-bold text-[#0f2d22] hover:text-emerald-900 flex items-center gap-1 text-xs"
                      >
                        <span>Chi tiết</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 4. FOOTER */}
      <footer className="bg-[#0a2018] text-emerald-100/60 text-xs py-6 px-4 text-center mt-12 border-t border-emerald-950">
        Hệ Thống Luyện Thi Trực Tuyến Tuyển Sinh Văn Bằng 2 CAND &bull; Cẩm nang & Tin tức tuyển sinh
      </footer>
    </div>
  );
}
