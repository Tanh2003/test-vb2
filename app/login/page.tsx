'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import GoogleLoginButton from '@/components/GoogleLoginButton';
import { Loader2, Eye, EyeOff } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !password) {
      setError('Vui lòng nhập tên tài khoản hoặc Gmail và mật khẩu.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // 1. Gọi API xác thực trực tiếp từ Firebase (Firestore & Firebase Auth)
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account: account.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Đăng nhập không thành công.');
      }

      // 2. Lưu hồ sơ thí sinh lấy trực tiếp từ Firebase vào LocalStorage
      localStorage.setItem('candidate_info', JSON.stringify(data.user));

      // 3. Chuyển hướng về trang yêu cầu (hoặc Trang chủ)
      router.push(redirectUrl);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 font-sans">
      {/* Cột trái: Thương hiệu CAND & Thông điệp */}
      <div className="bg-[#0f2d22] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Header Logo */}
        <div className="flex items-center gap-3.5 z-10">
          <div className="w-10 h-10 sm:w-11 sm:h-11 relative flex items-center justify-center shrink-0">
            <Image
              src="/logo.png"
              alt="Logo Thi Online VB2 CAND"
              width={48}
              height={48}
              className="w-full h-full object-contain drop-shadow shrink-0"
              priority
            />
          </div>
          <div>
            <div className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-amber-400 leading-tight">
              THI ONLINE VB2
            </div>
            <div className="text-xs text-slate-200/90 font-medium">
              Văn bằng 2 Công an
            </div>
          </div>
        </div>

        {/* Nội dung trung tâm */}
        <div className="my-auto py-12 sm:py-16 max-w-lg z-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-[1.25] mb-5 tracking-tight">
            Tải đề PDF của bạn lên, thi online theo từng ca
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/80 font-normal">
            Hai lượt tải đề đầu tiên miễn phí.
          </p>
        </div>

        {/* Footer ca thi */}
        <div className="text-xs sm:text-sm text-emerald-100/60 font-semibold tracking-widest z-10">
          CA1 · CA2 · CA3 · CA4
        </div>
      </div>

      {/* Cột phải: Form Đăng nhập dạng Card */}
      <div className="bg-[#f7f8f7] flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-[430px] bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8 sm:p-10">
          {/* Tiêu đề */}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f2d22] mb-6">
            Đăng nhập
          </h2>

          {redirectUrl !== '/' && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
              Vui lòng đăng nhập để tiếp tục truy cập tính năng upload đề thi.
            </div>
          )}

          {/* Nút Đăng nhập bằng Google */}
          <GoogleLoginButton variant="light" redirectTo={redirectUrl} />

          {/* Dòng phân cách */}
          <div className="my-6 text-center text-xs sm:text-sm text-slate-500 font-normal">
            hoặc đăng nhập bằng tài khoản
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* Form đăng nhập tài khoản */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Tên tài khoản hoặc Gmail
              </label>
              <input
                type="text"
                required
                 placeholder="Nhập tên tài khoản hoặc Gmail"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0f2d22] focus:ring-1 focus:ring-[#0f2d22] text-slate-800 text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full px-4 py-2.5 sm:py-3 pr-11 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0f2d22] focus:ring-1 focus:ring-[#0f2d22] text-slate-800 text-sm transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 cursor-pointer transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => alert('Vui lòng liên hệ Hội đồng tuyển sinh để khôi phục mật khẩu.')}
                  className="text-xs font-semibold text-[#0f2d22] hover:underline cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>
            </div>

            {/* Nút Đăng nhập đỏ */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-[#c1121f] hover:bg-[#a50f1a] font-bold rounded-xl text-sm sm:text-base text-white shadow-md shadow-red-700/20 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực...</span>
                </span>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          {/* Link Đăng ký */}
          <div className="mt-6 text-center text-xs sm:text-sm text-slate-600">
            Chưa có tài khoản?{' '}
            <Link
              href={redirectUrl !== '/' ? `/signup?redirect=${encodeURIComponent(redirectUrl)}` : '/signup'}
              className="font-bold text-[#0f2d22] hover:underline cursor-pointer"
            >
              Đăng ký
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f8f7] flex items-center justify-center p-4 text-sm font-semibold text-slate-600">
          Đang tải trang đăng nhập...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
