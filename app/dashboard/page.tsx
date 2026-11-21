'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, BookOpen, Upload, LogOut, User, Award, Clock } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [candidate, setCandidate] = useState<{
    fullName?: string;
    email?: string;
    sbd?: string;
    examCode?: string;
  } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('candidate_info');
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error(e);
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      {/* Background Glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-600/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-5xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 shadow-md">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Bảng điều khiển thí sinh</h1>
              <p className="text-xs text-slate-400">Hệ thống Luyện thi Tuyển sinh Văn bằng 2 CAND</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-200">
                {candidate?.fullName || 'Đồng chí Thí sinh'}
              </div>
              <div className="text-[11px] text-slate-400">
                {candidate?.email || 'Tài khoản CAND'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-red-950/40 hover:text-red-400 border border-slate-700 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isLoggingOut ? 'Đang thoát...' : 'Đăng xuất'}</span>
            </button>
          </div>
        </header>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Số báo danh</div>
              <div className="text-base font-bold text-white">{candidate?.sbd || 'Chưa định danh'}</div>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Mã đề mục tiêu</div>
              <div className="text-base font-bold text-amber-400">CA1 (Toán & TLXH)</div>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Thời gian làm bài</div>
              <div className="text-base font-bold text-emerald-400">150 phút / 100 điểm</div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/select-exam"
            className="p-6 rounded-2xl bg-gradient-to-br from-red-950/30 to-slate-900 border border-red-900/40 hover:border-red-500/60 transition group"
          >
            <div className="w-12 h-12 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Vào phòng thi thử</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Lựa chọn các đề thi chuẩn CA1 từ Ngân hàng đề thi để làm bài thi trực tuyến tính giờ và tự động chấm điểm.
            </p>
            <span className="text-xs font-semibold text-red-400 group-hover:underline">
              Bắt đầu luyện thi →
            </span>
          </Link>

          <Link
            href="/import"
            className="p-6 rounded-2xl bg-gradient-to-br from-blue-950/30 to-slate-900 border border-blue-900/40 hover:border-blue-500/60 transition group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Quản trị & Bóc tách đề thi PDF</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Tải file đề thi PDF và kích hoạt AI Gemini phân tích, chuẩn hóa công thức Toán LaTeX và lưu vào cơ sở dữ liệu.
            </p>
            <span className="text-xs font-semibold text-blue-400 group-hover:underline">
              Mở trang Import →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
