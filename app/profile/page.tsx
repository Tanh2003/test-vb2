'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  User,
  Mail,
  Phone,
  Shield,
  Award,
  LogOut,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface CandidateProfile {
  uid?: string;
  username?: string;
  fullName: string;
  email: string;
  phone: string;
  sbd: string;
  examCode: string;
  freeUploadsRemaining: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile>({
    uid: '',
    username: 'admin',
    fullName: 'admin',
    email: 'thisinh@cand.edu.vn',
    phone: '',
    sbd: 'ADMIN',
    examCode: 'CA1',
    freeUploadsRemaining: 2,
  });

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let currentEmail = '';
    let currentUid = '';

    try {
      const stored = localStorage.getItem('candidate_info');
      if (stored) {
        const data = JSON.parse(stored);
        currentEmail = data.email || '';
        currentUid = data.uid || '';
        setProfile((prev) => ({
          ...prev,
          uid: data.uid || prev.uid,
          username: data.username || data.fullName || prev.username,
          fullName: data.fullName || data.username || prev.fullName,
          email: data.email || prev.email,
          phone: data.phone || prev.phone,
          sbd: data.sbd || prev.sbd,
          examCode: data.examCode || prev.examCode,
          freeUploadsRemaining: data.freeUploadsRemaining ?? 2,
        }));
      } else {
        router.replace('/login?redirect=/profile');
        return;
      }
    } catch (e) {
      console.error(e);
      router.replace('/login?redirect=/profile');
      return;
    }

    // Đồng bộ trực tiếp dữ liệu mới nhất từ CSDL Firebase
    const syncProfileFromFirebase = async () => {
      try {
        const param = currentUid
          ? `?uid=${encodeURIComponent(currentUid)}`
          : currentEmail
          ? `?email=${encodeURIComponent(currentEmail)}`
          : '';
        const res = await fetch(`/api/auth/profile${param}`);
        if (res.ok) {
          const result = await res.json();
          if (result.user) {
            const u = result.user;
            setProfile((prev) => ({
              ...prev,
              uid: u.uid || prev.uid,
              username: u.username || prev.username,
              fullName: u.fullName || u.username || prev.fullName,
              email: u.email || prev.email,
              phone: u.phone || '',
              sbd: u.sbd || prev.sbd,
              examCode: u.examCode || prev.examCode,
              freeUploadsRemaining: u.freeUploadsRemaining ?? 2,
            }));
            localStorage.setItem('candidate_info', JSON.stringify(u));
          }
        }
      } catch (err) {
        console.warn('Sync profile warning:', err);
      }
    };

    syncProfileFromFirebase();
  }, []);

  // Xử lý lưu thông tin cập nhật vào Firebase
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError('');
    setIsSaved(false);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: profile.uid,
          email: profile.email,
          username: profile.username || profile.fullName,
          fullName: profile.fullName,
          phone: profile.phone,
          sbd: profile.sbd,
          examCode: profile.examCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Cập nhật thông tin thất bại.');
      }

      // Cập nhật lại state và LocalStorage với dữ liệu mới nhất từ Firebase
      const updatedUser = {
        ...profile,
        ...(data.user || {}),
      };
      setProfile((prev) => ({ ...prev, ...updatedUser }));
      localStorage.setItem('candidate_info', JSON.stringify(updatedUser));

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err?.message || 'Có lỗi khi lưu vào Firebase.');
    } finally {
      setIsSaving(false);
    }
  };

  // Xử lý đăng xuất
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      try {
        await signOut(auth);
      } catch {}
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('candidate_info');
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error('Logout error:', e);
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getInitials = () => {
    const name = profile.fullName || profile.username || 'AD';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#f7f8f7] text-slate-800 font-sans flex flex-col justify-between">
      {/* 1. HEADER (XANH RÊU CAND) */}
      <header className="bg-[#0f2d22] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between border-b border-emerald-900/60">
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

          <div className="flex items-center gap-4 sm:gap-7 text-xs sm:text-sm font-medium">
            <Link href="/" className="text-emerald-100/80 hover:text-white transition">
              Thư viện đề
            </Link>
            <Link href="/import" className="text-emerald-100/80 hover:text-white transition">
              Upload đề
            </Link>
            <Link href="/upload-history" className="text-emerald-100/80 hover:text-white transition">
              Lịch sử upload
            </Link>
            <Link href="/select-exam" className="text-emerald-100/80 hover:text-white transition">
              Ngân hàng đề thi
            </Link>
            <Link href="/result" className="text-emerald-100/80 hover:text-white transition">
              Lịch sử làm đề
            </Link>
            <span className="text-amber-300 font-semibold uppercase text-xs sm:text-sm underline underline-offset-4 decoration-amber-400 pl-2">
              [{profile.fullName || profile.username || 'TÀI KHOẢN'}]
            </span>
          </div>
        </div>
      </header>

      {/* 2. BODY - THÔNG TIN CÁ NHÂN */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f2d22]">
            Thông tin cá nhân
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản lý tài khoản và thông tin phục vụ xét tuyển Văn bằng 2 CAND.
          </p>
        </div>

        {/* Card hồ sơ */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8">
          {/* Top User Profile Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4 text-center sm:text-left">
              {/* Avatar Box theo mẫu */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0f2d22] border-2 border-amber-400 flex items-center justify-center font-bold text-xl sm:text-2xl text-amber-400 shadow-sm shrink-0">
                {getInitials()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-snug">
                  {profile.fullName || profile.username}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{profile.email}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    Thí sinh CAND
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    Lượt tải miễn phí: {profile.freeUploadsRemaining}/2
                  </span>
                </div>
              </div>
            </div>

            {/* Nút Đăng xuất trên thẻ */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-red-50 hover:bg-red-100 text-[#c1121f] border border-red-200 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{isLoggingOut ? 'Đang thoát...' : 'Đăng xuất'}</span>
            </button>
          </div>

          {/* Thông báo thành công */}
          {isSaved && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Đã lưu thành công thông tin vào cơ sở dữ liệu Firebase!</span>
            </div>
          )}

          {/* Thông báo lỗi */}
          {saveError && (
            <div className="p-4 bg-red-50 border border-red-300 rounded-xl text-red-700 text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Form chi tiết thông tin */}
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Tên tài khoản / Họ tên */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Tên tài khoản / Họ tên
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#0f2d22] transition"
                  />
                </div>
              </div>

              {/* Gmail / Email liên kết */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Gmail / Email liên kết
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    readOnly
                    value={profile.email}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Số điện thoại */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Số điện thoại
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="Chưa cập nhật"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0f2d22] transition"
                  />
                </div>
              </div>

              {/* Số báo danh (SBD) / Mã định danh */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Số báo danh (SBD) / Mã định danh
                </label>
                <input
                  type="text"
                  value={profile.sbd}
                  onChange={(e) => setProfile({ ...profile, sbd: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 font-mono focus:outline-none focus:border-[#0f2d22] transition"
                />
              </div>

              {/* Mã ca thi mục tiêu */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Mã ca thi mục tiêu
                </label>
                <select
                  value={profile.examCode}
                  onChange={(e) => setProfile({ ...profile, examCode: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#0f2d22] transition"
                >
                  <option value="CA1">CA1 - Toán cao cấp & Tự luận Xã hội</option>
                  <option value="CA2">CA2 - Triết học M-L & Tự luận Xã hội</option>
                  <option value="CA3">CA3 - Địa lý kinh tế & Tự luận Xã hội</option>
                  <option value="CA4">CA4 - Lịch sử & Tự luận Xã hội</option>
                </select>
              </div>

              {/* Trạng thái tài khoản */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Trạng thái tài khoản
                </label>
                <input
                  type="text"
                  readOnly
                  value="Đang hoạt động (Đã xác thực)"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Nút Lưu thông tin */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-[#0f2d22] hover:bg-[#184232] text-white font-bold rounded-xl text-sm sm:text-base shadow-sm transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </span>
                ) : (
                  'Lưu thông tin'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* 3. FOOTER */}
      <footer className="bg-[#0a2018] text-emerald-100/60 text-xs py-6 px-4 text-center mt-12 border-t border-emerald-950">
        [THÔNG TIN LIÊN HỆ / HỖ TRỢ]
      </footer>
    </div>
  );
}
