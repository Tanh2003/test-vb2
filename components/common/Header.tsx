'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  LogOut,
  Menu,
  X,
  ChevronDown,
  FolderClock,
  FileCheck,
  Info,
  BookOpen,
  Upload,
  Layers,
  Sparkles,
  Shield,
} from 'lucide-react';

// ====================================================================
// SHARED HEADER COMPONENT – CAND THI ONLINE VB2
// Tối ưu chống tràn chữ (whitespace-nowrap), gom nhóm 'Xem thêm ▾'
// ====================================================================

interface CandidateInfo {
  uid?: string;
  id?: string;
  email?: string;
  sbd?: string;
  username?: string;
  fullName?: string;
  role?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  requireAuth?: boolean;
}

interface HeaderProps {
  variant?: 'default' | 'compact';
  compactTitle?: string;
  compactSubtitle?: string;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
}

// ===================== Logo (Website & Brand) =====================
function LogoSvg({ className = 'w-9 h-9 sm:w-10 sm:h-10' }: { className?: string }) {
  return (
    <div className={`${className} relative flex items-center justify-center shrink-0`}>
      <Image
        src="/logo.png"
        alt="Logo Thi Online VB2 CAND"
        width={44}
        height={44}
        className="w-full h-full object-contain drop-shadow shrink-0"
        priority
      />
    </div>
  );
}

export default function Header({
  variant = 'default',
  compactTitle,
  compactSubtitle,
  leftContent,
  rightContent,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [candidate, setCandidate] = useState<CandidateInfo | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Load candidate info from localStorage
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

  // Close menus when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
    setIsMoreMenuOpen(false);
  }, [pathname]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isUserMenuOpen && !target.closest('[data-user-menu]')) {
        setIsUserMenuOpen(false);
      }
      if (isMoreMenuOpen && !target.closest('[data-more-menu]')) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [isUserMenuOpen, isMoreMenuOpen]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      try {
        await signOut(auth);
      } catch {}
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('candidate_info');
      setCandidate(null);
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error('Logout error:', e);
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isActiveLink = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const displayName = candidate?.fullName || candidate?.username || candidate?.sbd || 'TÀI KHOẢN';

  const isAdmin = Boolean(
    candidate?.role === 'admin' ||
    candidate?.username?.toLowerCase() === 'admin' ||
    candidate?.sbd?.toUpperCase() === 'ADMIN' ||
    candidate?.email?.toLowerCase().includes('admin')
  );

  // ===================== CẤU HÌNH PHÂN NHÓM NAVIGATION =====================
  // Primary Items: Các mục chính xuất hiện trực tiếp trên thanh
  const primaryNavItems: NavItem[] = [
    { href: '/', label: 'Thư viện đề' },
    { href: '/select-exam', label: 'Ngân hàng đề thi' },
    ...(candidate ? [{ href: '/import', label: 'Upload đề' }] : []),
    { href: '/blog', label: 'Tin tức' },
    ...(!candidate ? [{ href: '/about', label: 'Giới thiệu' }] : []),
  ];

  // More Items: Các mục thứ cấp đưa vào menu xổ xuống 'Xem thêm ▾' khi đã đăng nhập
  const moreNavItems: NavItem[] = candidate
    ? [
        { href: '/upload-history', label: 'Lịch sử upload đề', icon: FolderClock },
        { href: '/result', label: 'Lịch sử làm đề', icon: FileCheck },
        { href: '/about', label: 'Giới thiệu hệ thống', icon: Info },
      ]
    : [];

  const isMoreActive = moreNavItems.some((item) => isActiveLink(item.href));

  // Toàn bộ danh sách cho mobile menu
  const allMobileNavItems: NavItem[] = [
    { href: '/', label: 'Thư viện đề' },
    { href: '/select-exam', label: 'Ngân hàng đề thi' },
    { href: '/blog', label: 'Tin tức' },
    { href: '/about', label: 'Giới thiệu' },
    ...(candidate
      ? [
          { href: '/import', label: 'Upload đề thi' },
          { href: '/upload-history', label: 'Lịch sử upload' },
          { href: '/result', label: 'Lịch sử làm đề' },
        ]
      : []),
  ];

  // ===================== COMPACT VARIANT (Dành cho trang Result / Detail) =====================
  if (variant === 'compact') {
    return (
      <header className="bg-[#0f2d22] text-white sticky top-0 z-40 shadow-sm border-b border-emerald-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-3 min-w-0">
            {leftContent}
            <div className="min-w-0">
              {compactSubtitle && (
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block truncate">
                  {compactSubtitle}
                </span>
              )}
              {compactTitle && (
                <h1 className="text-base sm:text-lg font-extrabold text-white leading-tight truncate">
                  {compactTitle}
                </h1>
              )}
            </div>
          </div>

          {/* Right side: nav + auth */}
          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-medium shrink-0">
            {rightContent}
            <Link
              href="/"
              className="text-emerald-100/80 hover:text-white transition hidden md:inline whitespace-nowrap"
            >
              Thư viện đề
            </Link>
            <Link
              href="/select-exam"
              className="text-emerald-100/80 hover:text-white transition hidden md:inline whitespace-nowrap"
            >
              Ngân hàng đề
            </Link>
            {candidate ? (
              <Link
                href="/profile"
                className="text-amber-300 hover:text-amber-200 font-semibold uppercase text-xs sm:text-sm transition hidden md:inline whitespace-nowrap"
              >
                [{displayName}]
              </Link>
            ) : (
              <div className="flex items-center gap-2 hidden md:flex shrink-0">
                <Link
                  href="/login"
                  className="text-amber-300 hover:text-amber-200 font-semibold text-xs sm:text-sm transition whitespace-nowrap"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/signup"
                  className="px-3 py-1 rounded-xl bg-[#c1121f] hover:bg-[#a50f1a] text-white font-bold text-xs transition whitespace-nowrap"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  // ===================== DEFAULT VARIANT (Toàn trang) =====================
  return (
    <>
      <header className="bg-[#0f2d22] text-white sticky top-0 z-40 shadow-sm border-b border-emerald-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <LogoSvg />
            <div className="shrink-0">
              <div className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-amber-400 leading-tight whitespace-nowrap">
                THI ONLINE VB2
              </div>
              <div className="text-[11px] text-slate-200/90 font-medium whitespace-nowrap">
                Văn bằng 2 Công an nhân dân
              </div>
            </div>
          </Link>

          {/* Desktop Nav: Tuyệt đối không xuống dòng (whitespace-nowrap) */}
          <nav className="hidden lg:flex items-center gap-3 xl:gap-5 text-xs sm:text-sm font-medium">
            {/* Các mục chính */}
            {primaryNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap shrink-0 transition ${
                  isActiveLink(item.href)
                    ? 'text-white font-semibold underline underline-offset-4 decoration-amber-400'
                    : 'text-emerald-100/80 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}

            {/* Nút 'Xem thêm ▾' xổ xuống khi có các mục thứ cấp */}
            {moreNavItems.length > 0 && (
              <div className="relative shrink-0" data-more-menu>
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className={`whitespace-nowrap shrink-0 transition flex items-center gap-1 cursor-pointer py-1 ${
                    isMoreActive
                      ? 'text-white font-semibold underline underline-offset-4 decoration-amber-400'
                      : 'text-emerald-100/80 hover:text-white'
                  }`}
                >
                  <span>Xem thêm</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform shrink-0 ${
                      isMoreMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown menu 'Xem thêm' */}
                {isMoreMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 text-sm z-50">
                    <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      Tính năng mở rộng
                    </div>
                    {moreNavItems.map((item) => {
                      const IconComp = item.icon;
                      const active = isActiveLink(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMoreMenuOpen(false)}
                          className={`flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold transition ${
                            active
                              ? 'bg-emerald-50 text-emerald-950 font-bold border-l-2 border-[#0f2d22]'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-900'
                          }`}
                        >
                          {IconComp && (
                            <IconComp
                              className={`w-4 h-4 shrink-0 ${
                                active ? 'text-emerald-800' : 'text-slate-400'
                              }`}
                            />
                          )}
                          <span className="whitespace-nowrap">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Auth Section */}
            {candidate ? (
              <div className="flex items-center gap-2 shrink-0">
                {/* Nút Admin gọn gàng không bao giờ xuống dòng */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="whitespace-nowrap shrink-0 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1 shadow-xs transition active:scale-[0.98]"
                    title="Bảng điều khiển Quản trị viên"
                  >
                    <span>⚙️ Admin</span>
                  </Link>
                )}

                {/* User Dropdown */}
                <div className="relative shrink-0" data-user-menu>
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="whitespace-nowrap shrink-0 text-amber-300 hover:text-amber-200 font-semibold uppercase tracking-wider text-xs sm:text-sm pl-1.5 transition flex items-center gap-1 cursor-pointer"
                  >
                    <span className="truncate max-w-[140px] xl:max-w-[170px] inline-block">
                      [{displayName}]
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform shrink-0 ${
                        isUserMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu User */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 text-sm z-50">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <div className="font-bold text-slate-900 text-xs truncate">
                          {candidate.fullName || candidate.username}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {candidate.email || candidate.sbd}
                        </div>
                      </div>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="block px-4 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 transition border-b border-amber-100"
                        >
                          ⚙️ Bảng Quản trị viên (Admin)
                        </Link>
                      )}
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        Thông tin cá nhân
                      </Link>
                      <Link
                        href="/upload-history"
                        className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        Lịch sử upload
                      </Link>
                      <Link
                        href="/result"
                        className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        Lịch sử làm đề
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 shrink-0" />
                        <span>{isLoggingOut ? 'Đang thoát...' : 'Đăng xuất'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3 pl-2 shrink-0">
                <Link
                  href="/login"
                  className="whitespace-nowrap text-amber-300 hover:text-amber-200 font-semibold text-xs sm:text-sm transition"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/signup"
                  className="whitespace-nowrap px-3.5 py-1.5 rounded-xl bg-[#c1121f] hover:bg-[#a50f1a] text-white font-bold text-xs sm:text-sm shadow-sm transition active:scale-[0.98]"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-emerald-100 hover:text-white hover:bg-emerald-900/50 transition cursor-pointer shrink-0"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-[#0f2d22] border-t border-emerald-900/60 px-4 py-4 space-y-1">
            {allMobileNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActiveLink(item.href)
                    ? 'bg-emerald-900/60 text-amber-400 font-semibold'
                    : 'text-emerald-100/80 hover:text-white hover:bg-emerald-900/40'
                }`}
              >
                {item.label}
              </Link>
            ))}

            {/* Mobile Auth */}
            <div className="border-t border-emerald-900/60 pt-3 mt-3 space-y-1">
              {candidate ? (
                <>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="block px-4 py-2.5 rounded-xl text-sm font-black bg-amber-400 text-slate-950 shadow-xs mb-1 text-center"
                    >
                      ⚙️ BẢNG ĐIỀU KHIỂN QUẢN TRỊ VIÊN
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-amber-300 hover:text-amber-200 hover:bg-emerald-900/40 transition"
                  >
                    👤 {displayName}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-900/20 transition flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>{isLoggingOut ? 'Đang thoát...' : 'Đăng xuất'}</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3 px-4 pt-2">
                  <Link
                    href="/login"
                    className="flex-1 py-2.5 rounded-xl text-center text-sm font-semibold text-amber-300 border border-amber-500/40 hover:bg-emerald-900/40 transition"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/signup"
                    className="flex-1 py-2.5 rounded-xl text-center text-sm font-bold bg-[#c1121f] hover:bg-[#a50f1a] text-white shadow-sm transition"
                  >
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}

// Re-export cho các trang import thuận tiện
export { LogoSvg };
export type { CandidateInfo, HeaderProps };
