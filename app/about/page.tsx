'use client';

import Link from 'next/link';
import {
  Shield,
  BookOpen,
  Award,
  Sparkles,
  Cpu,
  Cloud,
  CheckCircle2,
  Clock,
  FileText,
  Users,
  Target,
  ArrowRight,
  HelpCircle,
  FileCheck,
  ChevronRight,
  Lock,
} from 'lucide-react';
import Header from '@/components/common/Header';
import { PAPER_META } from '@/types/exam';

export default function AboutPage() {
  const caList = [
    {
      code: 'CA1',
      subject: 'Toán cao cấp',
      tag: 'Khối Tự nhiên - Kỹ thuật',
      color: 'border-blue-300 bg-blue-50/60 text-blue-900',
      badgeColor: 'bg-blue-600 text-white',
      desc: 'Phần I: Tự luận Nghị luận Xã hội (30 điểm - 500 từ). Phần II: Toán cao cấp (70 điểm gồm 45 câu trắc nghiệm nhiều lựa chọn + 5 câu trả lời ngắn số học/vi tích phân).',
      target: 'Phù hợp thí sinh tốt nghiệp ngành Toán học, Công nghệ thông tin, Kỹ thuật điện tử, Cơ điện tử, Viễn thông...',
    },
    {
      code: 'CA2',
      subject: 'Kinh tế vĩ mô',
      tag: 'Khối Kinh tế - Quản lý',
      color: 'border-emerald-300 bg-emerald-50/60 text-emerald-900',
      badgeColor: 'bg-emerald-700 text-white',
      desc: 'Phần I: Tự luận Nghị luận Xã hội (30 điểm - 500 từ). Phần II: Kinh tế vĩ mô (70 điểm gồm 45 câu trắc nghiệm + 5 câu tự luận ngắn/tính toán chỉ số kinh tế vĩ mô).',
      target: 'Phù hợp thí sinh tốt nghiệp ngành Kinh tế, Quản trị kinh doanh, Tài chính - Ngân hàng, Kế toán, Thương mại quốc tế...',
    },
    {
      code: 'CA3',
      subject: 'Triết học Mác - Lênin',
      tag: 'Khối Xã hội - Nhân văn',
      color: 'border-purple-300 bg-purple-50/60 text-purple-900',
      badgeColor: 'bg-purple-700 text-white',
      desc: 'Phần I: Tự luận Nghị luận Xã hội (30 điểm - 500 từ). Phần II: Triết học Mác - Lênin (70 điểm gồm 54 câu trắc nghiệm + 6 câu điền khuyết thuật ngữ triết học).',
      target: 'Phù hợp thí sinh tốt nghiệp ngành Triết học, Xã hội học, Văn học, Báo chí, Lịch sử, Sư phạm, Ngôn ngữ học...',
    },
    {
      code: 'CA4',
      subject: 'Nhà nước và Pháp luật',
      tag: 'Khối Luật học & Hành chính',
      color: 'border-amber-300 bg-amber-50/60 text-amber-900',
      badgeColor: 'bg-amber-700 text-white',
      desc: 'Phần I: Tự luận Nghị luận Xã hội (30 điểm - 500 từ). Phần II: Lý luận Nhà nước và Pháp luật (70 điểm gồm 54 câu trắc nghiệm + 6 câu phân tích tình huống pháp lý).',
      target: 'Phù hợp thí sinh tốt nghiệp ngành Luật học, Luật kinh tế, Luật quốc tế, Quản lý nhà nước, Hành chính công...',
    },
  ];

  const features = [
    {
      icon: Clock,
      title: 'Phòng Thi Ảo Mô Phỏng 100% Thực Tế',
      desc: 'Đồng hồ đếm ngược 150 phút, phân chia tự luận và trắc nghiệm khoa học, tự động cảnh báo khi bài viết tự luận chưa đạt tối thiểu 500 từ.',
    },
    {
      icon: Cpu,
      title: 'Trợ Lý AI Tự Động Chuyển Đổi Đề Thi',
      desc: 'Công nghệ trí tuệ nhân tạo thông minh tự động đọc tài liệu PDF, nhận diện câu hỏi, công thức toán học và trích xuất ma trận đáp án chính xác.',
    },
    {
      icon: Cloud,
      title: 'Lưu Trữ An Toàn & Bảo Mật Tuyệt Đối',
      desc: 'Tệp PDF gốc và dữ liệu đề thi được bảo mật trên máy chủ chuyên dụng. Đề thi cá nhân chỉ tài khoản của bạn mới có thể xem và làm bài.',
    },
    {
      icon: Award,
      title: 'Chấm Điểm & Phân Loại Tức Thì',
      desc: 'Thuật toán chấm điểm theo thang điểm 100 chuẩn Bộ Công An, hiển thị biểu đồ độ chính xác và phân loại năng lực (Xuất sắc, Giỏi, Khá, Trung bình).',
    },
    {
      icon: FileCheck,
      title: 'Xem Lại Chi Tiết & Lời Giải Từng Câu',
      desc: 'Lưu trữ toàn bộ lịch sử các lần thi, hỗ trợ lọc theo câu đúng, câu sai, câu chưa làm để ôn tập và sửa lỗi hổng kiến thức hiệu quả.',
    },
    {
      icon: Lock,
      title: 'Bảo Mật Tài Khoản Bằng Mã OTP Gmail',
      desc: 'Luồng đăng ký và xác thực hiện đại với mã OTP 6 chữ số gửi về Gmail cá nhân, chống spam và bảo vệ dữ liệu ôn luyện của thí sinh.',
    },
  ];

  const steps = [
    {
      num: '01',
      title: 'Tạo tài khoản & Đăng nhập',
      desc: 'Đăng ký tài khoản nhanh chóng, xác thực Gmail bằng OTP 6 chữ số để kích hoạt kho lưu trữ đề thi cá nhân.',
    },
    {
      num: '02',
      title: 'Chọn đề hoặc Tải file PDF',
      desc: 'Chọn đề thi chuẩn từ Ngân hàng đề thi hoặc tự tải lên đề thi PDF của bạn để hệ thống AI tự động bóc tách.',
    },
    {
      num: '03',
      title: 'Làm bài thi thử 150 phút',
      desc: 'Trải nghiệm giao diện phòng thi trực tuyến: gõ bài tự luận, chọn đáp án trắc nghiệm và câu hỏi điền khuyết.',
    },
    {
      num: '04',
      title: 'Nhận kết quả & Ôn luyện',
      desc: 'Hệ thống tự động chấm điểm tổng thang 100, cung cấp bảng phân tích chi tiết và đề xuất điểm cần cải thiện.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8f7] text-slate-800 font-sans flex flex-col justify-between">
      {/* 1. HEADER DÙNG CHUNG */}
      <Header />

      {/* 2. HERO BANNER CAND */}
      <section className="bg-[#0f2d22] text-white py-14 sm:py-18 relative overflow-hidden">
        {/* Họa tiết nền mờ */}
        <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-[800px] h-[800px] text-amber-300 fill-current">
            <polygon points="50,5 64,36 98,38 72,60 80,94 50,75 20,94 28,60 2,38 36,36" />
          </svg>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/80 border border-emerald-700/60 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Hệ Thống Luyện Thi Trực Tuyến Chuyên Biệt CAND</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl">
            Nền Tảng Luyện Thi Tuyển Sinh Văn Bằng 2 Công An Nhân Dân
          </h1>

          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl font-normal">
            <strong>onthivb2.io.vn</strong> được xây dựng nhằm chuẩn hoá lộ trình ôn luyện, mô phỏng 100% cấu trúc đề thi chính thức của Bộ Công An, tích hợp công nghệ AI bóc tách đề thi PDF và hệ thống phòng thi ảo đạt chuẩn chất lượng cao.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/select-exam"
              className="px-6 py-3 rounded-xl bg-[#c1121f] hover:bg-[#a50f1a] text-white font-bold text-sm shadow-md transition active:scale-[0.98] flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>Khám phá Ngân hàng đề thi</span>
            </Link>
            <Link
              href="/import"
              className="px-6 py-3 rounded-xl bg-emerald-900/80 hover:bg-emerald-900 text-amber-300 border border-emerald-700 font-bold text-sm transition flex items-center gap-2"
            >
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>Trải nghiệm AI Bóc tách PDF</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. MAIN CONTENT CONTAINER */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-14 flex-1">
        {/* KHỐI 1: TỔNG QUAN & SỨ MỆNH */}
        <section className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#0f2d22] flex items-center justify-center font-bold">
              <Target className="w-6 h-6 text-emerald-800" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block">
                Mục Tiêu & Sứ Mệnh
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f2d22]">
                Đồng hành cùng sĩ tử trên con đường gia nhập Lực lượng CAND
              </h2>
            </div>
          </div>

          <div className="text-slate-700 text-sm sm:text-base leading-relaxed space-y-4">
            <p>
              Kỳ thi tuyển sinh công dân tốt nghiệp đại học trở lên vào Công an nhân dân (Văn bằng 2 CAND) là một trong những kỳ thi có tính cạnh tranh cao và quy chuẩn ngặt nghèo nhất. Thí sinh phải hoàn thành bài thi tổng hợp kéo dài <strong>150 phút</strong> với thang điểm <strong>100 điểm</strong>, đòi hỏi kiến thức sâu rộng ở cả năng lực lập luận chính trị - xã hội lẫn kiến thức chuyên ngành.
            </p>
            <p>
              Hệ thống <strong>THI ONLINE VB2</strong> ra đời với mục tiêu giải quyết triệt để các rào cản ôn luyện của thí sinh: thiếu nguồn đề thi chuẩn, không quen phân bổ thời gian giữa tự luận và trắc nghiệm, và không có công cụ tự chấm chữa, đánh giá sự tiến bộ theo từng giai đoạn.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-2xl font-black text-[#0f2d22]">100 Điểm</span>
              <p className="text-xs text-slate-500 font-medium">Thang điểm chuẩn xác: 30 điểm Tự luận + 70 điểm Chuyên ngành</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-2xl font-black text-amber-700">150 Phút</span>
              <p className="text-xs text-slate-500 font-medium">Thời gian thi thực tế, rèn luyện kỹ năng phân bổ tốc độ làm bài</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-2xl font-black text-blue-700">4 Mã Đề</span>
              <p className="text-xs text-slate-500 font-medium">Hỗ trợ đầy đủ 4 khối ngành CA1, CA2, CA3, CA4 theo đề án Bộ Công An</p>
            </div>
          </div>
        </section>

        {/* KHỐI 2: CHI TIẾT 4 MÃ ĐỀ CHUẨN BỘ CÔNG AN */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block">
              Cấu Trúc Đề Thi Chuẩn Hoá
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f2d22]">
              Cấu trúc 4 Mã Đề Chuyên Ngành CA1 - CA2 - CA3 - CA4
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Mỗi mã đề tương ứng với khối ngành đào tạo đại học đã tốt nghiệp của thí sinh, kết hợp phần Tự luận Nghị luận xã hội bắt buộc.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {caList.map((ca) => (
              <div
                key={ca.code}
                className={`bg-white rounded-3xl p-6 border-2 transition-all shadow-sm hover:shadow-md flex flex-col justify-between space-y-4 ${ca.color}`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-xl text-xs font-black shadow-2xs ${ca.badgeColor}`}>
                      MÃ ĐỀ: {ca.code}
                    </span>
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                      {ca.tag}
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                    {ca.code} &bull; Môn: {ca.subject}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {ca.desc}
                  </p>

                  <div className="p-3 bg-white/80 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed">
                    <strong>Đối tượng phù hợp:</strong> {ca.target}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-200/70">
                  <span className="text-xs font-semibold text-slate-500">Thời gian: 150 phút</span>
                  <Link
                    href={`/exam?ca=${ca.code}`}
                    className="text-xs font-bold text-[#0f2d22] hover:text-emerald-950 flex items-center gap-1 underline underline-offset-2"
                  >
                    <span>Làm thử đề {ca.code}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* KHỐI 3: CÔNG NGHỆ & TÍNH NĂNG VƯỢT TRỘI */}
        <section className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Sparkles className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block">
                Công Nghệ Dẫn Đầu
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f2d22]">
                Những tính năng vượt trội hỗ trợ ôn luyện tối đa
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => {
              const IconComp = feat.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/90 space-y-2.5 hover:bg-slate-50 hover:border-emerald-500/50 transition duration-200"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#0f2d22] text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
                    <IconComp className="w-4 h-4" />
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm leading-snug">
                    {feat.title}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* KHỐI 4: 4 BƯỚC BẮT ĐẦU */}
        <section className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block">
              Lộ Trình Đơn Giản
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f2d22]">
              Bắt đầu ôn thi chỉ với 4 bước
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((st) => (
              <div
                key={st.num}
                className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-600/60 transition"
              >
                <div className="space-y-2">
                  <span className="text-2xl font-black font-mono text-emerald-800/40 block">
                    {st.num}
                  </span>
                  <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                    {st.title}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {st.desc}
                  </p>
                </div>
                <div className="w-8 h-1 bg-amber-400 rounded-full" />
              </div>
            ))}
          </div>
        </section>

        {/* KHỐI 5: CALL TO ACTION (CTA) */}
        <section className="bg-gradient-to-r from-[#0f2d22] to-[#174836] text-white rounded-3xl p-8 sm:p-12 shadow-lg text-center space-y-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center">
            <Award className="w-7 h-7" />
          </div>

          <div className="max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Sẵn sàng bứt phá điểm số ngay hôm nay?
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Truy cập Ngân hàng đề thi chuẩn Bộ Công An hoặc tải lên đề thi riêng của bạn để làm bài thi thử trực tuyến.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/select-exam"
              className="px-6 py-3 rounded-xl bg-[#c1121f] hover:bg-[#a50f1a] text-white font-bold text-sm shadow-md transition active:scale-[0.98] flex items-center gap-2"
            >
              <span>Vào Ngân hàng đề thi</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/signup"
              className="px-6 py-3 rounded-xl bg-white text-[#0f2d22] hover:bg-slate-100 font-bold text-sm transition"
            >
              Đăng ký tài khoản miễn phí
            </Link>
          </div>
        </section>
      </main>

      {/* 4. FOOTER */}
      <footer className="bg-[#0a2018] text-emerald-100/60 text-xs py-6 px-4 text-center mt-12 border-t border-emerald-950">
        Hệ Thống Luyện Thi Trực Tuyến Tuyển Sinh Văn Bằng 2 Công An Nhân Dân &bull; onthivb2.io.vn &bull; Chuẩn hoá cấu trúc 4 mã đề CA1 - CA2 - CA3 - CA4
      </footer>
    </div>
  );
}
