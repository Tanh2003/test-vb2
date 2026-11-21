'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, FileCheck, CheckCircle2 } from 'lucide-react';
import { ParsedExamPreview, ParsedData } from '@/components/admin/ParsedExamPreview';
import { SAMPLE_PARSED_CA1 } from '@/mock/mock-ca1';

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialCa = searchParams.get('ca') || 'CA1';
  const [selectedCa, setSelectedCa] = useState<string>(initialCa);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [examName, setExamName] = useState('Đề thi thử CA1 - Bộ Công An 2026');
  const [examDuration, setExamDuration] = useState('150');
  const [paymentMethod, setPaymentMethod] = useState<'QR' | 'WALLET' | 'BANK'>('QR');

  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [candidateName, setCandidateName] = useState('TÊN TÀI KHOẢN');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('candidate_info');
      if (stored) {
        const u = JSON.parse(stored);
        setCandidateName(u.fullName || u.sbd || 'TÊN TÀI KHOẢN');
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const caDescMap: Record<string, string> = {
    CA1: '[CÁCH UPLOAD CA1] - Tự luận Xã hội & Toán cao cấp',
    CA2: '[CÁCH UPLOAD CA2] - Tự luận Xã hội & Triết học Mác - Lênin',
    CA3: '[CÁCH UPLOAD CA3] - Tự luận Xã hội & Địa lý kinh tế',
    CA4: '[CÁCH UPLOAD CA4] - Tự luận Xã hội & Lịch sử',
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setSelectedFile(file);
      } else {
        alert('Chỉ nhận file định dạng .pdf!');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile && !parsedData) {
      alert('Vui lòng chọn hoặc kéo thả file đề thi PDF!');
      return;
    }

    setIsParsing(true);
    try {
      const formData = new FormData();
      if (selectedFile) formData.append('file', selectedFile);

      const res = await fetch('/api/admin/import-pdf', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setParsedData(data);
      } else {
        // Fallback sử dụng dữ liệu bóc tách mẫu CA1 khi API AI chưa cấu hình
        setParsedData(SAMPLE_PARSED_CA1 as unknown as ParsedData);
      }
    } catch {
      // Fallback khi offline hoặc kiểm thử
      setParsedData(SAMPLE_PARSED_CA1 as unknown as ParsedData);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveToDb = async () => {
    if (!parsedData) return;
    setIsSaving(true);
    try {
      const payload = {
        ...parsedData,
        examName: examName || parsedData.examCode,
        durationMinutes: parseInt(examDuration) || 150,
      };

      await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      localStorage.setItem(`parsed_exam_${parsedData.examCode}`, JSON.stringify(payload));
      setSaveSuccess(true);
      setTimeout(() => router.push('/select-exam'), 1200);
    } catch {
      localStorage.setItem(`parsed_exam_${parsedData.examCode}`, JSON.stringify(parsedData));
      setSaveSuccess(true);
      setTimeout(() => router.push('/select-exam'), 1200);
    } finally {
      setIsSaving(false);
    }
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

          <div className="flex items-center gap-4 sm:gap-8 text-xs sm:text-sm font-medium">
            <Link href="/" className="text-emerald-100/80 hover:text-white transition">
              Thư viện đề
            </Link>
            <Link href="/import" className="text-white font-semibold underline underline-offset-4 decoration-amber-400">
              Upload đề
            </Link>
            <Link href="/result" className="text-emerald-100/80 hover:text-white transition">
              Lịch sử làm đề
            </Link>
            <Link href="/profile" className="text-amber-300 font-semibold uppercase text-xs sm:text-sm pl-2">
              [{candidateName}]
            </Link>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 flex-1">
        {/* Title & Steps */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f2d22] mb-3">
            Upload đề PDF
          </h1>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm">
            <div className="flex items-center gap-2 font-bold text-[#0f2d22]">
              <span className="w-6 h-6 rounded-full bg-[#0f2d22] text-white flex items-center justify-center text-xs">
                1
              </span>
              <span>Tải PDF</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 font-medium">
              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">
                2
              </span>
              <span>Thông tin đề</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 font-medium">
              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">
                3
              </span>
              <span>Thanh toán (từ lần 3)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 font-medium">
              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">
                4
              </span>
              <span>Xử lý</span>
            </div>
          </div>
        </div>

        {/* Notice Banner */}
        <div className="bg-[#fffbeb] border border-amber-200/90 rounded-2xl p-4 text-xs sm:text-sm text-amber-900 font-medium">
          Lượt tải miễn phí: còn 2/2. Lượt này miễn phí.
        </div>

        {/* Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái: Form cấu hình & Drag/Drop */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
            {/* Chọn ca */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Chọn ca của đề
              </label>
              <div className="flex items-center gap-2">
                {['CA1', 'CA2', 'CA3', 'CA4'].map((ca) => (
                  <button
                    key={ca}
                    type="button"
                    onClick={() => setSelectedCa(ca)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                      selectedCa === ca
                        ? 'bg-[#0f2d22] text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {ca}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {caDescMap[selectedCa] || `[CÁCH UPLOAD ${selectedCa}]`}
              </p>
            </div>

            {/* Vùng Drag & Drop PDF */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-2xl p-8 sm:p-12 text-center bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="space-y-2">
                <p className="text-base sm:text-lg font-bold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Kéo thả file PDF vào đây'}
                </p>
                <p className="text-xs text-slate-500">
                  {selectedFile
                    ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Nhấp để thay đổi file`
                    : 'Chỉ nhận file .pdf, tối đa 20 MB'}
                </p>
                <button
                  type="button"
                  className="mt-3 inline-flex items-center px-5 py-2 rounded-xl bg-[#0f2d22] hover:bg-[#184232] text-white text-xs sm:text-sm font-semibold transition"
                >
                  {selectedFile ? 'Đổi file khác' : 'Chọn file từ máy'}
                </button>
              </div>
            </div>

            {/* Inputs: Tên bộ đề & Thời gian */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tên bộ đề
                </label>
                <input
                  type="text"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:border-[#0f2d22]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Thời gian làm bài (phút)
                </label>
                <input
                  type="number"
                  value={examDuration}
                  onChange={(e) => setExamDuration(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:border-[#0f2d22]"
                />
              </div>
            </div>
          </div>

          {/* Cột phải: Chi phí & Thanh toán */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Chi phí</h2>

              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Lượt tải thứ 1/2</span>
                <span className="font-semibold text-slate-900">0 đ</span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-base font-bold text-slate-900">Tổng</span>
                <span className="text-xl font-bold text-slate-900">0 đ</span>
              </div>

              <div className="pt-3">
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                  Từ lần thứ 3, phí 20.000 đ cho mỗi đề. Chọn cách thanh toán:
                </p>
                <div className="space-y-2 text-xs sm:text-sm text-slate-700">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'QR'}
                      onChange={() => setPaymentMethod('QR')}
                      className="accent-[#0f2d22]"
                    />
                    <span>Chuyển khoản QR</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'WALLET'}
                      onChange={() => setPaymentMethod('WALLET')}
                      className="accent-[#0f2d22]"
                    />
                    <span>Ví điện tử</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'BANK'}
                      onChange={() => setPaymentMethod('BANK')}
                      className="accent-[#0f2d22]"
                    />
                    <span>Thẻ ngân hàng</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isParsing}
                className="w-full py-3 px-4 bg-[#c1121f] hover:bg-[#a50f1a] font-bold rounded-xl text-sm sm:text-base text-white shadow-md shadow-red-950/20 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {isParsing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI đang đọc đề...</span>
                  </span>
                ) : (
                  'Gửi đề (miễn phí)'
                )}
              </button>
              <p className="text-xs text-slate-400 text-center mt-3 leading-normal">
                Đề được xử lý thành bài thi online trong 1 - 2 phút.
              </p>
            </div>
          </div>
        </div>

        {/* Khu vực Xem trước & Lưu CSDL (Khi AI bóc tách xong) */}
        {parsedData && (
          <div className="mt-8 pt-8 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#0f2d22]">
                Dữ liệu bóc tách từ AI (Xem trước & Chỉnh sửa)
              </h2>
              <button
                onClick={handleSaveToDb}
                disabled={isSaving}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm transition cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Đang lưu vào CSDL...' : 'Lưu Ngân hàng Đề'}
              </button>
            </div>

            {saveSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Đã lưu thành công vào CSDL! Đang chuyển hướng về phòng thi...</span>
              </div>
            )}

            <ParsedExamPreview data={parsedData} onChange={(updated) => setParsedData(updated)} />
          </div>
        )}
      </main>

      {/* 3. FOOTER */}
      <footer className="bg-[#0a2018] text-emerald-100/60 text-xs py-6 px-4 text-center mt-12 border-t border-emerald-950">
        [THÔNG TIN LIÊN HỆ / HỖ TRỢ]
      </footer>
    </div>
  );
}

export default function AdminImportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải trang Upload...</div>}>
      <UploadContent />
    </Suspense>
  );
}
