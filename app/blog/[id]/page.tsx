'use client';

import { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  User,
  ArrowLeft,
  Share2,
  BookOpen,
  Award,
  Sparkles,
  ChevronRight,
  Loader2,
  AlertCircle,
  Tag,
} from 'lucide-react';
import Header from '@/components/common/Header';
import { BlogPost } from '@/app/api/blogs/route';

interface PageProps {
  params: Promise<{ id: string }>;
}

function BlogDetailInner({ id: postId }: { id: string }) {
  const router = useRouter();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    const fetchPost = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/blogs?id=${encodeURIComponent(postId)}`);
        if (res.ok) {
          const data = await res.json();
          setPost(data);
        }

        // Tải thêm các bài viết liên quan
        const listRes = await fetch('/api/blogs');
        if (listRes.ok) {
          const allList = await listRes.json();
          if (Array.isArray(allList)) {
            setRelatedPosts(allList.filter((p) => p.id !== postId && p.slug !== postId).slice(0, 3));
          }
        }
      } catch (err) {
        console.error('Lỗi tải bài viết:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Đã sao chép liên kết bài viết vào bộ nhớ tạm!');
    }
  };

  const renderContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={idx} className="h-4" />;
      }

      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-lg font-bold text-slate-900 mt-5 mb-2">
            {trimmed.replace('### ', '')}
          </h3>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-xl font-extrabold text-[#0f2d22] mt-7 mb-3 border-b border-emerald-950/10 pb-2">
            {trimmed.replace('## ', '')}
          </h2>
        );
      }
      if (trimmed.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-2xl font-black text-[#0f2d22] mt-8 mb-4">
            {trimmed.replace('# ', '')}
          </h1>
        );
      }

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <li key={idx} className="ml-5 list-disc text-slate-700 leading-relaxed text-sm sm:text-base my-1">
            {trimmed.substring(2)}
          </li>
        );
      }

      return (
        <p key={idx} className="text-slate-700 leading-relaxed text-sm sm:text-base my-2 font-normal">
          {trimmed}
        </p>
      );
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f8f7] flex flex-col justify-between font-sans">
        <Header />
        <div className="my-auto text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-800 mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Đang tải nội dung bài viết...</p>
        </div>
        <footer className="bg-[#0a2018] text-emerald-100/60 text-xs py-4 text-center">
          onthivb2.io.vn
        </footer>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#f7f8f7] flex flex-col justify-between font-sans">
        <Header />
        <div className="my-auto max-w-md mx-auto text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Không tìm thấy bài viết</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Bài viết này không tồn tại hoặc đã bị gỡ bỏ khỏi hệ thống.
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0f2d22] text-white text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại trang tin tức</span>
          </Link>
        </div>
        <footer className="bg-[#0a2018] text-emerald-100/60 text-xs py-4 text-center">
          onthivb2.io.vn
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8f7] text-slate-800 font-sans flex flex-col justify-between">
      {/* 1. HEADER */}
      <Header />

      {/* 2. MAIN POST CONTAINER */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 flex-1">
        {/* Navigation & Breadcrumb */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 font-bold text-[#0f2d22] hover:text-emerald-950 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Danh sách bài viết</span>
          </Link>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition cursor-pointer shadow-2xs"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-800" />
            <span>Chia sẻ bài viết</span>
          </button>
        </div>

        {/* Khối Tiêu đề & Metadata */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
              {post.category === 'TIN_TUYEN_SINH'
                ? 'Tin Tuyển Sinh CAND'
                : post.category === 'KINH_NGHIEM_THI'
                ? 'Kinh Nghiệm Ôn Thi'
                : 'Quy Chế & Đề Thi'}
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {new Date(post.createdAt).toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight">
            {post.title}
          </h1>

          <div className="p-4 bg-emerald-50/70 border-l-4 border-emerald-700 rounded-r-2xl text-xs sm:text-sm text-emerald-950 font-medium leading-relaxed">
            {post.summary}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium pt-1">
            <div className="w-7 h-7 rounded-full bg-[#0f2d22] text-amber-300 font-bold flex items-center justify-center text-xs">
              AD
            </div>
            <span>Tác giả: <strong>{post.author}</strong></span>
          </div>
        </div>

        {/* Ảnh bìa lớn */}
        <div className="rounded-3xl overflow-hidden shadow-md max-h-[440px] w-full bg-slate-100 border border-slate-200">
          <img
            src={post.coverImage || '/blog-default.png'}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Nội dung chi tiết bài viết */}
        <article className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm text-slate-800 leading-relaxed space-y-4">
          {renderContent(post.content)}
        </article>

        {/* Khối Kêu gọi Thí sinh Thi thử */}
        <div className="bg-[#0f2d22] text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-lg">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>LUYỆN ĐỀ CHUẨN BỘ CÔNG AN 2026</span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white">
              Vào làm bài thi thử trực tuyến 150 phút ngay
            </h3>
            <p className="text-xs text-emerald-100/80">
              Áp dụng ngay các bí quyết vừa đọc vào 4 mã đề CA1 - CA2 - CA3 - CA4 với hệ thống chấm điểm tự động.
            </p>
          </div>

          <Link
            href="/select-exam"
            className="shrink-0 px-6 py-3 rounded-xl bg-[#c1121f] hover:bg-[#a50f1a] font-bold text-white text-xs sm:text-sm shadow-md transition active:scale-[0.98] text-center"
          >
            Làm bài thi ngay &rarr;
          </Link>
        </div>

        {/* Các bài viết liên quan */}
        {relatedPosts.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              Bài viết cùng chuyên mục
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedPosts.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/blog/${rel.slug || rel.id}`}
                  className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition space-y-2 group block"
                >
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-900 leading-snug line-clamp-2">
                    {rel.title}
                  </h4>
                  <span className="text-[11px] text-slate-400 block">
                    {new Date(rel.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 3. FOOTER */}
      <footer className="bg-[#0a2018] text-emerald-100/60 text-xs py-6 px-4 text-center mt-12 border-t border-emerald-950">
        Hệ Thống Luyện Thi Trực Tuyến Tuyển Sinh Văn Bằng 2 CAND &bull; onthivb2.io.vn
      </footer>
    </div>
  );
}

function BlogDetailParamsWrapper({ params }: PageProps) {
  const resolved = use(params);
  return <BlogDetailInner id={resolved.id} />;
}

export default function BlogDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f8f7] flex items-center justify-center p-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-800" />
        </div>
      }
    >
      <BlogDetailParamsWrapper params={params} />
    </Suspense>
  );
}
