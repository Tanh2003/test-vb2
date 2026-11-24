'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { LogOut, Menu, X, ChevronDown } from 'lucide-react';

// ====================================================================
// SHARED HEADER COMPONENT – CAND THI ONLINE VB2
// Dùng chung cho TOÀN BỘ hệ thống, thay thế các header inline trùng lặp.
//
// Props:
//   variant: 'default' | 'compact' | 'exam'
//     - default: Header đầy đủ (trang chủ, import, upload-history, profile, select-exam, result list)
//     - compact: Header nhỏ gọn với slot content tuỳ chỉnh (result detail)
//     - exam: Header đặc biệt cho trang làm bài thi (không render qua component này)
//   compactTitle / compactSubtitle: Text tuỳ chỉnh cho variant compact
//   leftContent / rightContent: JSX slot cho variant compact
// ====================================================================

interface CandidateInfo {
  uid?: string;
  id?: string;
  email?: string;
  sbd?: string;
  username?: string;
  fullName?: string;
}

interface NavItem {
  href: string;
  label: string;
  requireAuth?: boolean;
}

interface HeaderProps {
  variant?: 'default' | 'compact';
  compactTitle?: string;
  compactSubtitle?: string;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
}

// ===================== Logo SVG (Shield + Star) =====================
function LogoSvg() {
  return (
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
  );
}

// ===================== NAV ITEMS CONFIG =====================
const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Thư viện đề' },
  { href: '/import', label: 'Upload đề', requireAuth: true },
  { href: '/upload-history', label: 'Lịch sử upload', requireAuth: true },
  { href: '/select-exam', label: 'Ngân hàng đề thi' },
  { href: '/result', label: 'Lịch sử làm đề', requireAuth: true },
];

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
  }, [pathname]);

  // Close user menu when clicking outside
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-user-menu]')) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [isUserMenuOpen]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      try { await signOut(auth); } catch {}
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

  // Visible nav items depend on auth state
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.requireAuth && !candidate) return false;
    return true;
  });

  // ===================== COMPACT VARIANT =====================
  if (variant === 'compact') {
    return (
      <header className="bg-[#0f2d22] text-white sticky top-0 z-40 shadow-sm border-b border-emerald-900/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-3">
            {leftContent}
            <div>
              {compactSubtitle && (
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block">
                  {compactSubtitle}
                </span>
              )}
              {compactTitle && (
                <h1 className="text-base sm:text-lg font-extrabold text-white leading-tight">
                  {compactTitle}
                </h1>
              )}
            </div>
          </div>

          {/* Right side: nav + auth */}
          <div className="flex items-center gap-4 text-xs sm:text-sm font-medium">
            {rightContent}
            {visibleNavItems
              .filter((item) => ['/','/ select-exam'].some(h => item.href === '/' || item.href === '/select-exam') || candidate)
              .slice(0, 4)
              .map((item) => (
                <Link
                  key={item.href}
                  href={!item.requireAuth || candidate ? item.href : `/login?redirect=${encodeURIComponent(item.href)}`}
                  className={
                    isActiveLink(item.href)
                      ? 'text-white font-semibold underline underline-offset-4 decoration-amber-400'
                      : 'text-emerald-100/80 hover:text-white transition hidden md:inline'
                  }
                >
                  {item.label}
                </Link>
              ))}
            {candidate ? (
              <Link
                href="/profile"
                className="text-amber-300 hover:text-amber-200 font-semibold uppercase text-xs sm:text-sm transition hidden md:inline"
              >
                [{displayName}]
              </Link>
            ) : (
              <div className="flex items-center gap-2 hidden md:flex">
                <Link href="/login" className="text-amber-300 hover:text-amber-200 font-semibold text-xs sm:text-sm transition">
                  Đăng nhập
                </Link>
                <Link href="/signup" className="px-3 py-1 rounded-xl bg-[#c1121f] hover:bg-[#a50f1a] text-white font-bold text-xs transition">
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  // ===================== DEFAULT VARIANT =====================
  return (
    <>
      <header className="bg-[#0f2d22] text-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between border-b border-emerald-900/60">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3">
            <LogoSvg />
            <div>
              <div className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-amber-400 leading-tight">
                THI ONLINE VB2
              </div>
              <div className="text-[11px] text-slate-200/90 font-medium">
                Văn bằng 2 Công an nhân dân
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-4 sm:gap-7 text-xs sm:text-sm font-medium">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={
                  item.requireAuth && !candidate
                    ? `/login?redirect=${encodeURIComponent(item.href)}`
                    : item.href
                }
                className={
                  isActiveLink(item.href)
                    ? 'text-white font-semibold underline underline-offset-4 decoration-amber-400'
                    : 'text-emerald-100/80 hover:text-white transition'
                }
              >
                {item.label}
              </Link>
            ))}

            {/* Auth Section */}
            {candidate ? (
              <div className="relative" data-user-menu>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="text-amber-300 hover:text-amber-200 font-semibold uppercase tracking-wider text-xs sm:text-sm pl-2 transition flex items-center gap-1 cursor-pointer"
                >
                  [{displayName}]
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 text-sm z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <div className="font-bold text-slate-900 text-xs truncate">
                        {candidate.fullName || candidate.username}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {candidate.email || candidate.sbd}
                      </div>
                    </div>
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
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{isLoggingOut ? 'Đang thoát...' : 'Đăng xuất'}</span>
                    </button>
                  </div>
                )}
              </div>
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
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-emerald-100 hover:text-white hover:bg-emerald-900/50 transition cursor-pointer"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-[#0f2d22] border-t border-emerald-900/60 px-4 py-4 space-y-1">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={
                  item.requireAuth && !candidate
                    ? `/login?redirect=${encodeURIComponent(item.href)}`
                    : item.href
                }
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
                  <Link
                    href="/profile"
                    className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-amber-300 hover:text-amber-200 hover:bg-emerald-900/40 transition"
                  >
                    👤 {displayName}
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-900/20 transition flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{isLoggingOut ? 'Đang thoát...' : 'Đăng xuất'}</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3 px-4">
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

// Re-export cho pages import thuận tiện
export { LogoSvg };
export type { CandidateInfo, HeaderProps };
