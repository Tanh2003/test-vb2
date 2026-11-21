'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

interface GoogleLoginButtonProps {
  className?: string;
  variant?: 'light' | 'dark';
  redirectTo?: string;
}

export default function GoogleLoginButton({
  className = '',
  variant = 'light',
  redirectTo = '/',
}: GoogleLoginButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Đăng nhập máy chủ thất bại.');
      }

      localStorage.setItem(
        'candidate_info',
        JSON.stringify({
          sbd: result.user.email?.split('@')[0].toUpperCase() || 'CAND-USER',
          fullName: result.user.displayName || 'ĐỒNG CHÍ THÍ SINH',
          email: result.user.email || '',
          examCode: 'CA1',
        })
      );

      router.push(redirectTo);
      router.refresh();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setError(err?.message || 'Có lỗi xảy ra khi đăng nhập bằng Google.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const baseStyle =
    variant === 'light'
      ? 'bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 shadow-sm'
      : 'bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200';

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className={`w-full py-2.5 sm:py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2.5 transition active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${baseStyle} ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            <span>Đang xử lý...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Đăng nhập bằng Google</span>
          </>
        )}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-500 text-center">{error}</p>
      )}
    </div>
  );
}
