'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileCheck,
  Sparkles,
  Save,
  ArrowLeft,
  Loader2,
  FileText,
} from 'lucide-react';
import { ParsedExamPreview, ParsedData } from '@/components/admin/ParsedExamPreview';
import { SAMPLE_PARSED_CA1 } from '@/mock/mock-ca1';

export default function AdminImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleParseWithAI = async () => {
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
        // Fallback sử dụng dữ liệu bóc tách mẫu CA1 khi API chưa cấu hình
        setParsedData(SAMPLE_PARSED_CA1 as unknown as ParsedData);
      }
    } catch {
      // Fallback khi offline / mock
      setParsedData(SAMPLE_PARSED_CA1 as unknown as ParsedData);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveToBank = async () => {
    if (!parsedData) return;
    setIsSaving(true);
    try {
      const examToSave = {
        id: `ca1-${Date.now()}`,
        examCode: parsedData.examCode || 'CA1',
        title: parsedData.title || `Đề Thi CA1 (Bóc Tách ${new Date().toLocaleDateString('vi-VN')})`,
        totalQuestions:
          (parsedData.singleChoices?.length || 0) +
          (parsedData.shortAnswers?.length || 0) +
          (parsedData.groupQuestions?.reduce((acc, g) => acc + g.subQuestions.length, 0) || 0) +
          1,
        duration: 150,
        data: parsedData,
        createdAt: new Date().toISOString(),
      };

      // Gửi lên API hoặc lưu vào LocalStorage
      try {
        await fetch('/api/exams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(examToSave),
        });
      } catch {
        /* fallback localStorage */
      }

      const existing = JSON.parse(localStorage.getItem('exams_bank') || '[]');
      existing.unshift(examToSave);
      localStorage.setItem('exams_bank', JSON.stringify(existing));

      alert('Đã lưu đề thi thành công vào Ngân hàng Đề!');
      router.push('/select-exam');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/select-exam')}
              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Quản Trị Ngân Hàng Đề
              </span>
              <h1 className="text-base sm:text-lg font-bold text-white">
                BÓC TÁCH ĐỀ THI PDF BẰNG AI (MÃ CA1)
              </h1>
            </div>
          </div>
          {parsedData && (
            <button
              onClick={handleSaveToBank}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-sm text-white shadow-lg shadow-emerald-600/30 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Ngân hàng Đề'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Drag & Drop Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-red-500/60 rounded-2xl p-8 text-center bg-slate-900/40 hover:bg-slate-900/70 transition-all cursor-pointer space-y-4"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
          />
          <div className="w-16 h-16 mx-auto rounded-full bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center">
            {selectedFile ? <FileCheck className="w-8 h-8" /> : <UploadCloud className="w-8 h-8" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {selectedFile ? selectedFile.name : 'Kéo thả file PDF đề thi vào đây hoặc bấm để chọn'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Hỗ trợ định dạng .PDF (Ví dụ: CA1.pdf theo chuẩn tuyển sinh CAND)
            </p>
          </div>
        </div>

        {/* Action Trigger */}
        <div className="flex justify-center">
          <button
            onClick={handleParseWithAI}
            disabled={isParsing}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 font-bold text-sm text-white rounded-xl shadow-lg shadow-red-600/25 transition cursor-pointer disabled:opacity-50"
          >
            {isParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            <span>
              {isParsing
                ? 'AI đang đọc đề và tách công thức Toán...'
                : selectedFile
                ? 'Phân tích đề bằng AI'
                : 'Tải thử & Phân tích Đề Mẫu CA1'}
            </span>
          </button>
        </div>

        {/* Preview & Edit Area */}
        {parsedData && (
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">
                  Xem Trước & Chỉnh Sửa Dữ Liệu Bóc Tách
                </h3>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Chuẩn LaTeX & 3 Cấp Độ Nhận Thức
              </span>
            </div>

            <ParsedExamPreview data={parsedData} onChange={setParsedData} />
          </div>
        )}
      </main>
    </div>
  );
}
