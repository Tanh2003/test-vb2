'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2, Eye, EyeOff, Mail, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  // State các trường thông tin đăng ký
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // State hiển thị mật khẩu
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // State luồng xác thực: 'form' (Nhập thông tin) -> 'otp' (Xác nhận OTP)
  const [step, setStep] = useState<'form' | 'otp'>('form');

  // State cho mã OTP 6 chữ số
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Đếm ngược thời gian gửi lại mã OTP (60s)
  const [countdown, setCountdown] = useState<number>(60);

  // Loading & Thông báo lỗi / thành công
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Hiệu ứng đếm ngược khi ở bước OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Tự động focus vào ô OTP đầu tiên khi chuyển sang bước OTP
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // ==========================================================
  // BƯỚC 1: XỬ LÝ GỬI MÃ OTP ĐẾN GMAIL THÍ SINH
  // ==========================================================
  const handleInitiateSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!username || !email || !password || !confirmPassword) {
      setError('Vui lòng điền đầy đủ Tên tài khoản, Gmail, Mật khẩu và Nhập lại mật khẩu.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Địa chỉ Gmail không đúng định dạng. Vui lòng kiểm tra lại.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp. Vui lòng kiểm tra lại.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Không thể gửi mã OTP.');
      }

      // Gửi OTP thành công -> Chuyển sang màn hình nhập OTP 6 số
      setStep('otp');
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      setSuccessMsg('Mã OTP đã được gửi đến hộp thư Gmail của bạn.');
    } catch (err: any) {
      console.error('Send OTP error:', err);
      setError(err?.message || 'Có lỗi xảy ra khi gửi mã xác thực OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================
  // XỬ LÝ NHẬP 6 Ô SỐ OTP (Tự động chuyển ô, Backspace, Paste)
  // ==========================================================
  const handleOtpChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '');
    const char = cleanVal.slice(-1); // Lấy ký tự số cuối cùng vừa nhập

    const newOtp = [...otp];
    newOtp[index] = char;
    setOtp(newOtp);

    // Tự động focus sang ô kế tiếp
    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Nếu đã điền đủ 6 số, tự động kích hoạt kiểm tra
    if (newOtp.every((digit) => digit !== '')) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pastedData[i] || '';
    }
    setOtp(newOtp);

    // Focus vào ô tiếp theo hoặc ô cuối cùng
    const nextIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[nextIndex]?.focus();

    // Nếu paste đủ 6 số, tự động xác thực
    if (pastedData.length === 6) {
      handleVerifyOtp(pastedData);
    }
  };

  // ==========================================================
  // BƯỚC 2: XÁC THỰC MÃ OTP VÀ TẠO TÀI KHOẢN
  // ==========================================================
  const handleVerifyOtp = async (otpCodeToVerify?: string) => {
    const fullOtp = otpCodeToVerify || otp.join('');
    if (fullOtp.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số mã OTP.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: fullOtp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Xác thực OTP không thành công.');
      }

      setSuccessMsg('Xác thực email thành công! Đang đăng nhập...');

      // 1. Tự động đăng nhập Client bằng Firebase Custom Token
      if (data.customToken) {
        try {
          const userCredential = await signInWithCustomToken(auth, data.customToken);
          const idToken = await userCredential.user.getIdToken();

          // Thiết lập Session Cookie bảo mật
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

      // 2. Lưu hồ sơ thí sinh vào LocalStorage
      const userInfo = data.user || {
        sbd: username.toUpperCase(),
        fullName: username,
        email: email.trim().toLowerCase(),
        phone: phone || '',
        examCode: 'CA1',
        isVerified: true,
      };
      localStorage.setItem('candidate_info', JSON.stringify(userInfo));

      // 3. Chuyển hướng tới trang yêu cầu hoặc Trang chủ
      setTimeout(() => {
        router.push(redirectUrl);
        router.refresh();
      }, 700);
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      setError(err?.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================
  // GỬI LẠI MÃ OTP KHI HẾT 60S
  // ==========================================================
  const handleResendOtp = async () => {
    if (countdown > 0 || isLoading) return;

    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể gửi lại mã OTP.');
      }

      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      setSuccessMsg('Mã OTP mới đã được gửi tới email của bạn!');
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi gửi lại mã OTP.');
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
            {step === 'form'
              ? 'Tạo tài khoản để tải đề lên và làm bài online'
              : 'Xác thực email đăng ký tài khoản an toàn'}
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/80 font-normal">
            {step === 'form'
              ? 'Đăng ký xong là dùng được 2 lượt tải đề miễn phí.'
              : 'Hệ thống gửi mã OTP xác nhận về Gmail để bảo vệ tài khoản của bạn.'}
          </p>
        </div>

        {/* Footer ca thi */}
        <div className="text-xs sm:text-sm text-emerald-100/60 font-semibold tracking-widest z-10">
          CA1 · CA2 · CA3 · CA4
        </div>
      </div>

      {/* Cột phải: Form Đăng ký hoặc Form OTP */}
      <div className="bg-[#f7f8f7] flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8 sm:p-10 transition-all">
          
          {/* ==================================================== */}
          {/* GIAO DIỆN BƯỚC 1: ĐIỀN THÔNG TIN ĐĂNG KÝ */}
          {/* ==================================================== */}
          {step === 'form' && (
            <>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f2d22] mb-6">
                Đăng ký tài khoản
              </h2>

              {redirectUrl !== '/' && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
                  Đăng ký tài khoản để bắt đầu lưu trữ và upload đề thi riêng của bạn.
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleInitiateSignup} className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                    Tên tài khoản
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="VD: nguyenvana"
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
                    placeholder="VD: 0912345678"
                    className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0f2d22] focus:ring-1 focus:ring-[#0f2d22] text-slate-800 text-sm transition"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                    Gmail xác thực
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="VD: nguyenvana@gmail.com"
                    className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0f2d22] focus:ring-1 focus:ring-[#0f2d22] text-slate-800 text-sm transition"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Hệ thống sẽ gửi mã OTP 6 số đến Gmail này để kích hoạt.
                  </p>
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
                      placeholder="Tối thiểu 6 ký tự"
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
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                    Nhập lại mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu trên"
                      className="w-full px-4 py-2.5 sm:py-3 pr-11 rounded-xl border border-slate-300 focus:outline-none focus:border-[#0f2d22] focus:ring-1 focus:ring-[#0f2d22] text-slate-800 text-sm transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 cursor-pointer transition-colors"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Ẩn mật khẩu nhập lại' : 'Hiện mật khẩu nhập lại'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 bg-[#c1121f] hover:bg-[#a50f1a] font-bold rounded-xl text-sm sm:text-base text-white shadow-md shadow-red-700/20 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang gửi mã xác thực OTP...</span>
                    </span>
                  ) : (
                    'Tiếp tục & Nhận mã OTP'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-xs sm:text-sm text-slate-600">
                Đã có tài khoản?{' '}
                <Link
                  href={redirectUrl !== '/' ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login'}
                  className="font-bold text-[#0f2d22] hover:underline cursor-pointer"
                >
                  Đăng nhập
                </Link>
              </div>
            </>
          )}

          {/* ==================================================== */}
          {/* GIAO DIỆN BƯỚC 2: NHẬP MÃ OTP 6 CHỮ SỐ */}
          {/* ==================================================== */}
          {step === 'otp' && (
            <div>
              {/* Nút quay lại */}
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setError('');
                  setSuccessMsg('');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0f2d22] mb-5 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại chỉnh sửa thông tin</span>
              </button>

              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 border border-emerald-200">
                <Mail className="w-6 h-6 text-emerald-800" />
              </div>

              <h2 className="text-2xl font-extrabold text-[#0f2d22] mb-2">
                Xác thực mã OTP
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
                Mã xác thực gồm 6 chữ số đã được gửi tới địa chỉ Gmail{' '}
                <strong className="text-slate-900 font-bold">{email}</strong>. Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam/Rác).
              </p>

              {successMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
                  {error}
                </div>
              )}

              {/* 6 Ô NHẬP SỐ OTP */}
              <div className="flex justify-between gap-2 sm:gap-2.5 mb-6">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-xl border transition focus:outline-none ${
                      digit
                        ? 'border-emerald-600 bg-emerald-50/50 text-[#0f2d22] ring-1 ring-emerald-500'
                        : 'border-slate-300 bg-white text-slate-800 focus:border-[#0f2d22] focus:ring-1 focus:ring-[#0f2d22]'
                    }`}
                  />
                ))}
              </div>

              {/* Nút Xác nhận */}
              <button
                type="button"
                onClick={() => handleVerifyOtp()}
                disabled={isLoading || otp.some((d) => !d)}
                className="w-full py-3 px-4 bg-[#0f2d22] hover:bg-[#163f30] font-bold rounded-xl text-sm sm:text-base text-white shadow-md shadow-emerald-950/20 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang kiểm tra OTP...</span>
                  </span>
                ) : (
                  'Xác nhận & Hoàn tất đăng ký'
                )}
              </button>

              {/* Đồng hồ đếm ngược & Gửi lại mã */}
              <div className="mt-5 text-center text-xs sm:text-sm">
                {countdown > 0 ? (
                  <span className="text-slate-500 font-medium">
                    Gửi lại mã OTP sau{' '}
                    <strong className="text-[#0f2d22] font-bold font-mono">
                      {countdown}s
                    </strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 font-bold text-[#0f2d22] hover:text-[#c1121f] cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Gửi lại mã OTP</span>
                  </button>
                )}
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep('form');
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Nhập nhầm Gmail? Bấm vào đây để đổi địa chỉ email
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f7f8f7]">
          <Loader2 className="w-8 h-8 text-[#0f2d22] animate-spin" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
