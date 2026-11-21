'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Upload, BookOpen, Clock, FileText } from 'lucide-react';

interface Candidate {
  fullName?: string;
  username?: string;
  sbd?: string;
  email?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [activeCaTab, setActiveCaTab] = useState<'ALL' | 'CA1' | 'CA2' | 'CA3' | 'CA4'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

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

  const freeExams = [
    {
      id: 'CA1-FREE-01',
      title: '[TÊN ĐỀ MIỄN PHÍ 1]',
      meta: 'CA1 · 50 câu · 150 phút',
      tag: 'Miễn phí',
    },
    {
      id: 'CA1-FREE-02',
      title: '[TÊN ĐỀ MIỄN PHÍ 2]',
      meta: 'CA1 · 50 câu · 150 phút',
      tag: 'Miễn phí',
    },
    {
      id: 'CA1-FREE-03',
      title: '[TÊN ĐỀ MIỄN PHÍ 3]',
      meta: 'CA1 · 50 câu · 150 phút',
      tag: 'Miễn phí',
    },
  ];

  const caCategories = [
    { code: 'CA1', desc: '[CÁCH UPLOAD CA1]', count: 0 },
    { code: 'CA2', desc: '[CÁCH UPLOAD CA2]', count: 0 },
    { code: 'CA3', desc: '[CÁCH UPLOAD CA3]', count: 0 },
    { code: 'CA4', desc: '[CÁCH UPLOAD CA4]', count: 0 },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8f7] text-slate-800 font-sans flex flex-col justify-between">
      {/* 1. HEADER & HERO SECTION (XANH RÊU CAND) */}
      <div className="bg-[#0f2d22] text-white">
        {/* Top Navbar */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between border-b border-emerald-900/60">
          {/* Logo & Brand */}
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
                Văn bằng 2 Công an
              </div>
            </div>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-4 sm:gap-8 text-xs sm:text-sm font-medium">
            <Link href="/" className="text-white font-semibold underline underline-offset-4 decoration-amber-400">
              Thư viện đề
            </Link>
            <Link href="/import" className="text-emerald-100/80 hover:text-white transition">
              Upload đề
            </Link>
            <Link href="/result" className="text-emerald-100/80 hover:text-white transition">
              Lịch sử làm đề
            </Link>
            {candidate ? (
              <Link
                href="/profile"
                className="text-amber-300 hover:text-amber-200 font-semibold uppercase tracking-wider text-xs sm:text-sm pl-2 transition"
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

        {/* Hero Banner */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-1">
              VĂN BẰNG 2 · CÔNG AN
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
              Thư viện đề của bạn
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80">
              Làm thử bộ đề miễn phí hoặc tải đề PDF của bạn lên để làm online.
            </p>
          </div>
          <div>
            <button
              onClick={() => router.push('/import')}
              className="px-6 py-2.5 rounded-xl bg-[#c1121f] hover:bg-[#a50f1a] font-bold text-white text-sm shadow-md shadow-red-950/30 transition active:scale-[0.98] cursor-pointer"
            >
              Upload đề
            </button>
          </div>
        </div>
      </div>

      {/* 2. BODY CONTENT (BACKGROUND SÁNG) */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 flex-1">
        {/* Notice Banner */}
        <div className="bg-[#fffbeb] border border-amber-200/90 rounded-2xl p-4 text-xs sm:text-sm text-amber-900 font-medium">
          Bạn còn 2/2 lượt tải đề miễn phí. Từ lần thứ 3, phí [PHÍ] đ cho mỗi đề.
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tìm bộ đề
            </label>
            <input
              type="text"
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
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#0f2d22] transition"
            >
              <option value="ALL">Tất cả</option>
              <option value="FREE">Bộ đề miễn phí</option>
              <option value="USER">Đề của bạn</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Trạng thái
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#0f2d22] transition"
            >
              <option value="ALL">Tất cả</option>
              <option value="TODO">Chưa làm</option>
              <option value="DONE">Đã hoàn thành</option>
            </select>
          </div>
        </div>

        {/* Section 1: Bộ đề miễn phí */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4">
            Bộ đề miễn phí
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {freeExams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {exam.title}
                    </h3>
                    <span className="shrink-0 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      {exam.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-6">{exam.meta}</p>
                </div>
                <button
                  onClick={() => router.push('/select-exam')}
                  className="w-full py-2.5 rounded-xl bg-[#0f2d22] hover:bg-[#184232] text-white font-semibold text-sm transition active:scale-[0.98] cursor-pointer"
                >
                  Làm bài
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Đề của bạn */}
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Đề của bạn
          </h2>

          {/* Ca Tabs Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {(['ALL', 'CA1', 'CA2', 'CA3', 'CA4'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveCaTab(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                  activeCaTab === tab
                    ? 'bg-[#0f2d22] text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab === 'ALL' ? 'Tất cả' : tab}
              </button>
            ))}
          </div>

          {/* Empty State Banner */}
          <div className="bg-white rounded-2xl p-10 border border-slate-200/80 shadow-sm text-center">
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Bạn chưa có đề nào
            </h3>
            <p className="text-xs text-slate-500">
              Chọn ca bên dưới để upload đề PDF đầu tiên.
            </p>
          </div>

          {/* 4 Ca Upload Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {caCategories.map((ca) => (
              <div
                key={ca.code}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-bold text-slate-900">
                      {ca.code}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {ca.count} đề
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-5">{ca.desc}</p>
                </div>
                <button
                  onClick={() => router.push(`/import?ca=${ca.code}`)}
                  className="w-full py-2.5 rounded-xl bg-[#c1121f] hover:bg-[#a50f1a] text-white font-semibold text-xs sm:text-sm shadow-sm transition active:scale-[0.98] cursor-pointer"
                >
                  Upload đề {ca.code}
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 3. FOOTER */}
      <footer className="bg-[#0a2018] text-emerald-100/60 text-xs py-6 px-4 text-center mt-12 border-t border-emerald-950">
        [THÔNG TIN LIÊN HỆ / HỖ TRỢ]
      </footer>
    </div>
  );
}
