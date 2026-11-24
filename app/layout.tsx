import type { Metadata } from 'next';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://onthivb2.io.vn';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Cổng Thi Trực Tuyến Tuyển Sinh Văn Bằng 2 CAND',
    template: '%s | Thi Online VB2 CAND',
  },
  description:
    'Hệ thống luyện thi trực tuyến tuyển sinh Văn bằng 2 Công an nhân dân chuẩn cấu trúc 4 mã đề CA1, CA2, CA3, CA4 của Bộ Công An.',
  keywords: [
    'Thi Văn bằng 2 Công an',
    'VB2 CAND 2026',
    'Đề thi CA1',
    'Đề thi CA2',
    'Đề thi CA3',
    'Đề thi CA4',
    'Bộ Công An',
    'Luyện thi trực tuyến',
  ],
  authors: [{ name: 'Hệ Thống Thi Online VB2 CAND' }],
  creator: 'Thi Online VB2 CAND',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '192x192' },
      { url: '/logo.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Cổng Thi Trực Tuyến Tuyển Sinh Văn Bằng 2 CAND',
    description:
      'Hệ thống luyện thi trực tuyến tuyển sinh Văn bằng 2 Công an nhân dân chuẩn cấu trúc 4 mã đề CA1, CA2, CA3, CA4 Bộ Công An.',
    url: SITE_URL,
    siteName: 'Thi Online VB2 CAND',
    locale: 'vi_VN',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Logo Tuyển Sinh Văn Bằng 2 Công An Nhân Dân',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cổng Thi Trực Tuyến Tuyển Sinh Văn Bằng 2 CAND',
    description:
      'Hệ thống luyện thi trực tuyến tuyển sinh Văn bằng 2 Công an nhân dân chuẩn cấu trúc 4 mã đề CA1, CA2, CA3, CA4 Bộ Công An.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
      </head>
      <body className="min-h-full flex flex-col bg-[#f7f8f7] text-slate-800 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
