'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GoogleLoginButton from '@/components/GoogleLoginButton';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Star,
  PenTool,
  MessageSquare,
  Loader2,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ thông tin đăng nhập.');
      return;
    }
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      localStorage.setItem(
        'candidate_info',
        JSON.stringify({
          sbd: email.includes('@') ? email.split('@')[0].toUpperCase() : email.toUpperCase(),
          fullName: 'ĐỒNG CHÍ THÍ SINH',
          email,
          examCode: 'CA1',
        })
      );
      setIsLoading(false);
      router.push('/select-exam');
    }, 600);
  };


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-red-600/10 blur-[120px] pointer-events-none rounded-full" />

      {/* Main Container Card */}
      <div className="w-full max-w-4xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 relative z-10">
        {/* Left Side: Branding & Features */}
        <div className="bg-gradient-to-br from-red-950/40 via-slate-900 to-slate-950 p-8 sm:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800/80">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 shadow-lg shadow-red-600/20">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-red-400 block">
                  Bộ Công An
                </span>
                <span className="text-sm font-extrabold text-white tracking-tight">
                  VB2 CAND PORTAL
                </span>
              </div>
            </div>

            {/* Headline */}
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-3">
              Chinh phục ước mơ
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-8">
              Hệ thống ôn luyện và thi thử trực tuyến tuyển sinh Văn bằng 2 CAND (Mã đề CA1, CA2...).
            </p>

            {/* Feature Bullets */}
            <div className="space-y-4 text-xs sm:text-sm text-slate-300">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4 fill-amber-400" />
                </div>
                <span>Lộ trình ôn luyện & sinh đề cá nhân hoá</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
                  <PenTool className="w-4 h-4" />
                </div>
                <span>Ngân hàng đề thi thử bám sát cấu trúc Bộ CA</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span>Trợ lý AI hỗ trợ giải chi tiết & chấm tự luận</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/80 text-[11px] text-slate-500">
            Bản quyền © 2026 Hội đồng Tuyển sinh Văn bằng 2 CAND
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-between bg-slate-900/60">
          <div>
            {/* Form Header */}
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Đăng nhập</h1>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Trang chủ</span>
              </Link>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mb-6">
              Chào mừng đồng chí quay lại! Tiếp tục lộ trình luyện thi của mình.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email / Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email / Số báo danh
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com hoặc SBD"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => alert('Vui lòng liên hệ Hội đồng tuyển sinh để khôi phục mật khẩu.')}
                  className="text-xs text-red-400 hover:text-red-300 transition font-medium"
                >
                  Quên mật khẩu?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 font-bold rounded-xl text-sm text-white shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Đăng nhập</span>}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-5 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <span className="relative bg-slate-900 px-3 text-xs text-slate-500 uppercase tracking-wider">
                hoặc
              </span>
            </div>

            {/* Google Login Button */}
            <GoogleLoginButton />
          </div>

          {/* Footer Register Link */}
          <div className="mt-6 text-center text-xs text-slate-400">
            Bạn chưa có tài khoản?{' '}
            <button
              type="button"
              onClick={() => alert('Hệ thống tuyển sinh hiện đang mở đợt đăng ký theo kế hoạch của Bộ Công An.')}
              className="text-red-400 hover:text-red-300 font-bold transition ml-1"
            >
              Đăng ký ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
