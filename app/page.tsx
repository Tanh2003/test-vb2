'use client';

import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  PlayCircle,
  History,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Clock,
  Award,
  Sparkles,
  LogIn,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-72 bg-gradient-to-b from-red-600/10 via-blue-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 shadow-sm shadow-red-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold tracking-wider text-red-400 uppercase">
                Hội đồng Tuyển sinh
              </span>
              <h2 className="text-sm font-bold text-slate-100">Cổng Luyện Thi VB2 CAND</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              Phiên bản 2026
            </span>
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30 transition active:scale-[0.98] cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng ký</span>
            </button>
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30 transition active:scale-[0.98] cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col justify-center">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <GraduationCap className="w-4 h-4" />
            Khóa Thi Tuyển Sinh Đào Tạo Trực Tuyến
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white uppercase leading-snug">
            Luyện Thi Văn Bằng 2 CAND - Năm 2026
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-300 to-amber-500 mt-1">
              (Mã Đề CA1: Toán Cao Cấp & Tự Luận)
            </span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed">
            &ldquo;Bản lĩnh &bull; Trí tuệ &bull; Kỷ cương &bull; Vì an ninh Tổ quốc&rdquo;
            <br />
            Chúc các đồng chí ôn luyện vững vàng, nắm chắc kiến thức và tự tin đạt kết quả cao nhất!
          </p>

          {/* Quick Info Tags */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Thời gian: <strong>150 phút</strong></span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Thang điểm: <strong>100 điểm</strong> (30đ TL + 70đ TN)</span>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Bắt đầu Luyện đề */}
          <div className="relative group bg-slate-900/90 border-2 border-red-500/40 hover:border-red-500 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 shadow-xl shadow-red-950/30 hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center border border-red-500/30">
                <PlayCircle className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-red-400">Trọng tâm</span>
                <h3 className="text-xl font-bold text-white mt-0.5">Thi thử & Luyện đề CA1</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Làm bài thi đánh giá năng lực 150 phút gồm Phần Tự luận (30đ) và 50 câu Trắc nghiệm Toán cao cấp (70đ).
              </p>
            </div>
            <button
              onClick={() => router.push('/select-exam')}
              className="mt-6 w-full py-3 px-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 font-bold rounded-xl text-white shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <span>Vào Phòng Thi</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: Lịch sử & Kết quả */}
          <div className="group bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 shadow-lg hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <History className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Theo dõi tiến độ</span>
                <h3 className="text-xl font-bold text-white mt-0.5">Lịch sử Luyện đề</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Xem lại điểm số các bài thi thử đã làm, đối chiếu đáp án chi tiết và điểm xét tuyển quy đổi.
              </p>
            </div>
            <button
              onClick={() => router.push('/result')}
              className="mt-6 w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <span>Xem Lịch Sử</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 3: Ôn tập & Tra cứu */}
          <div className="group bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 shadow-lg hover:-translate-y-1">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <BookOpen className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Tài liệu học tập</span>
                <h3 className="text-xl font-bold text-white mt-0.5">Ngân hàng Ôn tập</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Xem nhanh hệ thống câu hỏi, công thức toán học LaTeX và đáp án.
              </p>
            </div>
            <button
              onClick={() => router.push('/import')}
              className="mt-6 w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <span>Vào Kho Ôn Tập</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        Phần mềm Hỗ trợ Luyện thi Văn Bằng 2 CAND &bull; Mã Đề CA1 &bull; Năm 2026
      </footer>
    </div>
  );
}
