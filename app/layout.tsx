import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cổng Thi Trực Tuyến Văn Bằng 2 CAND - Mã Đề CA1',
  description: 'Phần mềm thi trực tuyến tuyển sinh Văn bằng 2 CAND',
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
      <body className="min-h-full flex flex-col bg-slate-900 text-slate-100 font-sans">
        {children}
      </body>
    </html>
  );
}
