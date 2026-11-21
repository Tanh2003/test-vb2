import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cổng Thi Trực Tuyến Tuyển Sinh Văn Bằng 2 CAND',
  description: 'Phần mềm thi trực tuyến tuyển sinh Văn bằng 2 CAND chuẩn cấu trúc 4 mã đề',
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
      </head>
      <body className="min-h-full flex flex-col bg-[#f7f8f7] text-slate-800 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
