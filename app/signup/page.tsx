'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError('Vui lòng điền đầy đủ Tên tài khoản, Gmail và Mật khẩu.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // 1. Gọi API Backend để đăng ký tài khoản và lưu trực tiếp vào Firebase Auth & Firestore
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          password,
          phone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Đăng ký tài khoản thất bại.');
      }

      // 2. Xác thực phiên trên Client bằng Custom Token từ Server
      if (data.customToken) {
        try {
          const userCredential = await signInWithCustomToken(auth, data.customToken);
          const idToken = await userCredential.user.getIdToken();

          // Thiết lập Session Cookie bảo mật 5 ngày
          await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken,
              username,
              phone,
            }),
          });
        } catch (authErr) {
          console.warn('Session cookie sync warning:', authErr);
        }
      }

      // 3. Lưu thông tin thí sinh vào LocalStorage phục vụ hiển thị nhanh
      const userInfo = data.user || {
        sbd: username.toUpperCase(),
        fullName: username,
        email,
        phone: phone || '',
        examCode: 'CA1',
      };

      localStorage.setItem('candidate_info', JSON.stringify(userInfo));

      // 4. Chuyển hướng tới Trang chủ
      router.push('/');
      router.refresh();
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err?.message || 'Có lỗi xảy ra trong quá trình đăng ký.');
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
            <div className="text-xs text-slate-200/90 font-medium">
              Văn bằng 2 Công an
            </div>
          </div>
        </div>

        {/* Nội dung trung tâm */}
        <div className="my-auto py-12 sm:py-16 max-w-lg z-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-[1.25] mb-5 tracking-tight">
            Tạo tài khoản để tải đề lên và làm bài online
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/80 font-normal">
            Đăng ký xong là dùng được 2 lượt tải đề miễn phí.
          </p>
        </div>

        {/* Footer ca thi */}
        <div className="text-xs sm:text-sm text-emerald-100/60 font-semibold tracking-widest z-10">
          CA1 · CA2 · CA3 · CA4
        </div>
      </div>

      {/* Cột phải: Form Đăng ký dạng Card */}
      <div className="bg-[#f7f8f7] flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-[430px] bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8 sm:p-10">
          {/* Tiêu đề */}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f2d22] mb-6">
            Đăng ký tài khoản
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* Form đăng ký */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Tên tài khoản
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0f2d22] focus:ring-1 focus:ring-[#0f2d22] text-slate-800 text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Số điện thoại (không bắt buộc)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0f2d22] focus:ring-1 focus:ring-[#0f2d22] text-slate-800 text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Gmail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0f2d22] focus:ring-1 focus:ring-[#0f2d22] text-slate-800 text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Mật khẩu
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0f2d22] focus:ring-1 focus:ring-[#0f2d22] text-slate-800 text-sm transition"
              />
            </div>

            {/* Nút Đăng ký đỏ */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-[#c1121f] hover:bg-[#a50f1a] font-bold rounded-xl text-sm sm:text-base text-white shadow-md shadow-red-700/20 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý đăng ký...</span>
                </span>
              ) : (
                'Đăng ký'
              )}
            </button>
          </form>

          {/* Link chuyển về Đăng nhập */}
          <div className="mt-6 text-center text-xs sm:text-sm text-slate-600">
            Đã có tài khoản?{' '}
            <Link
              href="/login"
              className="font-bold text-[#0f2d22] hover:underline cursor-pointer"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
