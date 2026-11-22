'use client';

import { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  FileCheck,
  CheckCircle2,
  Upload,
  FileText,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  BookOpen,
  Layers,
  Clock,
  X,
  PlayCircle,
} from 'lucide-react';
import {
  ParsedExamPreview,
  ParsedData,
  isQuestionAnswerValid,
} from '@/components/admin/ParsedExamPreview';
import { PaperCode, PAPER_META } from '@/types/exam';

interface CandidateInfo {
  uid?: string;
  id?: string;
  email?: string;
  sbd?: string;
  username?: string;
  fullName?: string;
}

function saveToUserUploadedList(exam: any) {
  if (!exam || !exam.id) return;
  try {
    const raw = localStorage.getItem('user_uploaded_exams_list');
    const list: any[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((item) => item.id === exam.id);
    if (index >= 0) {
      list[index] = { ...list[index], ...exam };
    } else {
      list.unshift(exam);
    }
    localStorage.setItem('user_uploaded_exams_list', JSON.stringify(list));
  } catch (e) {
    console.error('Lỗi lưu user_uploaded_exams_list:', e);
  }
}

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const answerFileInputRef = useRef<HTMLInputElement>(null);

  const initialCa = (searchParams.get('ca')?.toUpperCase() as PaperCode) || 'CA1';
  const [selectedCa, setSelectedCa] = useState<PaperCode>(
    ['CA1', 'CA2', 'CA3', 'CA4'].includes(initialCa) ? initialCa : 'CA1'
  );

  const [examFile, setExamFile] = useState<File | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);

  const [examTitle, setExamTitle] = useState(
    `Đề thi ${initialCa} - ${PAPER_META[initialCa]?.subject || ''} Bộ Công An 2026`
  );
  const [examDuration, setExamDuration] = useState('150');
  const [isPublic, setIsPublic] = useState(false);

  const [isParsing, setIsParsing] = useState(false);
  const [parsingStep, setParsingStep] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedExamId, setSavedExamId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<CandidateInfo | null>(null);

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

  // Update default title when selectedCa changes
  const handleSelectCa = (ca: PaperCode) => {
    setSelectedCa(ca);
    setExamTitle(`Đề thi ${ca} - ${PAPER_META[ca]?.subject || ''} Bộ Công An 2026`);
    setErrorMessage(null);
  };

  // Drag & drop handlers for Exam PDF
  const handleExamDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setExamFile(file);
        setErrorMessage(null);
      } else {
        alert('Chỉ nhận file đề thi định dạng .pdf!');
      }
    }
  };

  // Drag & drop handlers for Answer PDF
  const handleAnswerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setAnswerFile(file);
      } else {
        alert('Chỉ nhận file đáp án định dạng .pdf!');
      }
    }
  };

  // Submit and call Gemini extraction API
  const handleSubmit = async () => {
    if (!examFile) {
      alert('Vui lòng chọn hoặc kéo thả file đề thi PDF!');
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);
    setParsingStep('Đang tải tệp PDF lên máy chủ...');

    try {
      const currentUserId = candidate?.uid || candidate?.id || candidate?.sbd || candidate?.email || '';
      const currentUserName = candidate?.fullName || candidate?.username || candidate?.sbd || '';
      const currentUserEmail = candidate?.email || '';

      const formData = new FormData();
      formData.append('file', examFile);
      if (answerFile) formData.append('answerFile', answerFile);
      formData.append('paperCode', selectedCa);
      formData.append('examTitle', examTitle);
      formData.append('durationMinutes', examDuration);
      formData.append('isPublic', String(isPublic));
      if (currentUserId) {
        formData.append('ownerId', currentUserId);
        formData.append('userId', currentUserId);
        formData.append('ownerName', currentUserName);
        formData.append('ownerEmail', currentUserEmail);
      }

      setParsingStep('AI Gemini đang phân tích thị giác và bóc tách cấu trúc 4 dạng câu...');

      const res = await fetch('/api/admin/import-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Máy chủ trả về mã lỗi: ${res.status}`);
      }

      setParsingStep('Đang chuẩn hóa công thức LaTeX và kiểm tra tính toàn vẹn...');
      const data = await res.json();

      const examId = data.id || `${selectedCa.toLowerCase()}_${Date.now()}`;
      const examPayload = {
        ...data,
        id: examId,
        paperCode: selectedCa,
        examCode: selectedCa,
        subject: PAPER_META[selectedCa]?.subject || '',
        title: examTitle || data.examTitle || `Đề thi ${selectedCa}`,
        duration: parseInt(examDuration, 10) || 150,
        durationMinutes: parseInt(examDuration, 10) || 150,
        ownerId: currentUserId || data.ownerId || 'anonymous',
        userId: currentUserId || data.userId || 'anonymous',
        ownerName: currentUserName || data.ownerName || '',
        ownerEmail: currentUserEmail || data.ownerEmail || '',
        isPublic,
      };

      setParsedData(examPayload);
      setSavedExamId(null); // Chưa lưu vào Firebase ngay, chờ người dùng duyệt và điền đáp án
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Lỗi gọi API AI:', msg);
      setErrorMessage(`Không thể bóc tách đề: ${msg}. Vui lòng kiểm tra lại file PDF.`);
      setParsedData(null);
    } finally {
      setIsParsing(false);
      setParsingStep('');
    }
  };

  // Tính số lượng câu chưa có đáp án
  const missingAnswersCount = useMemo(() => {
    if (!parsedData?.questions || parsedData.questions.length === 0) return 0;
    return parsedData.questions.filter((q) => !isQuestionAnswerValid(q)).length;
  }, [parsedData]);

  // Save to DB (Firebase & LocalStorage)
  const handleSaveToDb = async () => {
    if (!parsedData) return;

    // Bắt buộc phải có đáp án cho tất cả các câu hỏi
    if (missingAnswersCount > 0) {
      setErrorMessage(
        `Không thể lưu đề thi! Hiện còn ${missingAnswersCount} câu chưa có đáp án đúng. Vui lòng bấm vào "Bảng Đáp Án Đề Thi" bên dưới để hoàn tất đáp án trước khi lưu.`
      );
      const el = document.getElementById('answer-matrix-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const currentUserId = candidate?.uid || candidate?.id || candidate?.sbd || candidate?.email || '';
      const currentUserName = candidate?.fullName || candidate?.username || candidate?.sbd || '';
      const currentUserEmail = candidate?.email || '';

      const examId = savedExamId || `${selectedCa.toLowerCase()}_${Date.now()}`;
      const updatedQuestions = parsedData.questions || [];

      // Đồng bộ đáp án đúng sang các cấu trúc tương thích ngược
      const singleChoices = (parsedData.singleChoices || []).map((sc) => {
        const num = parseInt(sc.id?.replace(/\D/g, '') || '0', 10);
        const q = updatedQuestions.find((item) => item.number === num);
        return q?.correctAnswer ? { ...sc, correctAnswer: q.correctAnswer as any } : sc;
      });
      const groupQuestions = (parsedData.groupQuestions || []).map((g) => ({
        ...g,
        subQuestions: (g.subQuestions || []).map((sq) => {
          const num = parseInt(sq.id?.replace(/\D/g, '') || '0', 10);
          const q = updatedQuestions.find((item) => item.number === num);
          return q?.correctAnswer ? { ...sq, correctAnswer: q.correctAnswer as any } : sq;
        }),
      }));
      const shortAnswers = (parsedData.shortAnswers || []).map((sa) => {
        const num = parseInt(sa.id?.replace(/\D/g, '') || '0', 10);
        const q = updatedQuestions.find((item) => item.number === num);
        return q?.correctAnswer ? { ...sa, correctAnswer: q.correctAnswer } : sa;
      });

      const payload = {
        ...parsedData,
        id: examId,
        paperCode: selectedCa,
        examCode: selectedCa,
        subject: PAPER_META[selectedCa]?.subject || '',
        title: examTitle || parsedData.examTitle || `Đề thi ${selectedCa}`,
        duration: parseInt(examDuration, 10) || 150,
        durationMinutes: parseInt(examDuration, 10) || 150,
        ownerId: currentUserId || parsedData.ownerId || 'anonymous',
        userId: currentUserId || parsedData.userId || 'anonymous',
        ownerName: currentUserName || parsedData.ownerName || '',
        ownerEmail: currentUserEmail || parsedData.ownerEmail || '',
        isPublic,
        questions: updatedQuestions,
        singleChoices,
        groupQuestions,
        shortAnswers,
      };

      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Lỗi lưu vào CSDL Firebase (Status ${res.status})`);
      }

      localStorage.setItem(`parsed_exam_${selectedCa}`, JSON.stringify(payload));
      localStorage.setItem(`exam_current_${examId}`, JSON.stringify(payload));
      saveToUserUploadedList(payload);
      setSavedExamId(examId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(e);
      setErrorMessage(`Lỗi lưu đề thi: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const meta = PAPER_META[selectedCa];

  return (
    <div className="min-h-screen bg-[#f7f8f7] text-slate-800 font-sans flex flex-col justify-between">
      {/* 1. HEADER (XANH RÊU CAND) */}
      <header className="bg-[#0f2d22] text-white sticky top-0 z-40 shadow-sm">
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
                Văn bằng 2 Công an nhân dân
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-4 sm:gap-8 text-xs sm:text-sm font-medium">
            <Link href="/" className="text-emerald-100/80 hover:text-white transition">
              Thư viện đề
            </Link>
            <Link
              href="/import"
              className="text-white font-semibold underline underline-offset-4 decoration-amber-400"
            >
              Upload đề
            </Link>
            <Link href="/select-exam" className="text-emerald-100/80 hover:text-white transition">
              Ngân hàng đề thi
            </Link>
            <Link href="/result" className="text-emerald-100/80 hover:text-white transition">
              Lịch sử làm đề
            </Link>
            {candidate ? (
              <Link
                href="/profile"
                className="text-amber-300 hover:text-amber-200 font-semibold uppercase text-xs sm:text-sm pl-2 transition"
              >
                [{candidate.fullName || candidate.sbd || candidate.username || 'TÀI KHOẢN'}]
              </Link>
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
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 flex-1">
        {/* Title & Pipeline Steps */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f2d22] mb-2">
              Upload & Bóc Tách Đề Thi Tuyển Sinh VB2
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Hỗ trợ 4 mã đề chuyên ngành (CA1, CA2, CA3, CA4) với công nghệ AI đọc PDF & chuẩn hóa LaTeX tự động.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 font-bold text-[#0f2d22]">
              <span className="w-6 h-6 rounded-full bg-[#0f2d22] text-white flex items-center justify-center text-xs">
                1
              </span>
              <span>Chọn mã đề & Tải PDF</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
            <div className={`flex items-center gap-2 font-bold ${isParsing ? 'text-[#0f2d22]' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isParsing ? 'bg-[#0f2d22] text-white' : 'bg-slate-200 text-slate-600'}`}>
                2
              </span>
              <span>AI Bóc tách</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
            <div className={`flex items-center gap-2 font-bold ${parsedData ? 'text-[#0f2d22]' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${parsedData ? 'bg-[#0f2d22] text-white' : 'bg-slate-200 text-slate-600'}`}>
                3
              </span>
              <span>Kiểm duyệt & Lưu</span>
            </div>
          </div>
        </div>

        {/* Notice Banner */}
        <div className="bg-[#fffbeb] border border-amber-200/90 rounded-2xl p-4 text-xs sm:text-sm text-amber-900 font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Hệ thống đã cập nhật chuẩn cấu trúc 4 mã đề 2026: <strong>CA1 (Toán)</strong>, <strong>CA2 (Kinh tế)</strong>, <strong>CA3 (Triết học)</strong>, <strong>CA4 (Pháp luật)</strong>.
            </span>
          </div>
          <span className="shrink-0 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
            2/2 lượt miễn phí
          </span>
        </div>

        {/* Khối Thông tin Tài khoản Sở Hữu Đề Thi */}
        {candidate ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0f2d22] text-amber-300 font-extrabold flex items-center justify-center shrink-0 shadow-xs">
                {(candidate.fullName || candidate.username || 'U')[0].toUpperCase()}
              </div>
              <div>
                <div className="font-extrabold text-[#0f2d22] flex items-center gap-2">
                  <span>Tài khoản upload: {candidate.fullName || candidate.username || 'Thí sinh'}</span>
                  <span className="font-mono text-[11px] bg-emerald-200/80 text-emerald-950 font-bold px-2 py-0.5 rounded-lg">
                    ID: {candidate.uid || candidate.id || candidate.sbd || candidate.email}
                  </span>
                </div>
                <p className="text-emerald-800/90 text-xs mt-0.5 font-medium">
                  Đề thi sau khi bóc tách sẽ được lưu riêng biệt cho tài khoản này và chỉ tài khoản của bạn mới có thể truy cập ôn luyện.
                </p>
              </div>
            </div>
            <span className="shrink-0 text-xs font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              Bảo mật tài khoản
            </span>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <div className="font-extrabold text-amber-950">
                  Bạn chưa đăng nhập tài khoản
                </div>
                <p className="text-amber-800 text-xs mt-0.5">
                  Đề thi sẽ chỉ được lưu tạm trên máy này. Hãy đăng nhập để đề thi được gắn vĩnh viễn với tài khoản cá nhân và chỉ hiển thị cho bạn.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="shrink-0 text-xs font-bold text-white bg-[#0f2d22] hover:bg-[#184232] px-4 py-2 rounded-xl transition shadow-xs self-start sm:self-auto"
            >
              Đăng nhập ngay
            </Link>
          </div>
        )}

        {/* KHỐI 1: CHỌN MÃ ĐỀ (4 CARD CHUYÊN BIỆT) */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            1. Chọn loại đề thi cần Upload:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(['CA1', 'CA2', 'CA3', 'CA4'] as const).map((ca) => {
              const info = PAPER_META[ca];
              const isSelected = selectedCa === ca;
              return (
                <div
                  key={ca}
                  onClick={() => handleSelectCa(ca)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#0f2d22] bg-emerald-50/70 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-extrabold px-2.5 py-0.5 rounded-lg ${
                          isSelected
                            ? 'bg-[#0f2d22] text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ca}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        {info.expectedQuestions} câu
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 leading-tight">
                      {info.subject}
                    </h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {info.description}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600 font-medium">
                    <span>Trắc nghiệm: 1..{info.mcqUntil}</span>
                    <span>Tự luận: 30đ</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* KHỐI 2: FORM TẢI PDF & CẤU HÌNH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái: Vùng Upload 2 file (Đề thi + Đáp án) & Form cấu hình */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dropzone 1: File PDF Đề thi chính thức (Bắt buộc) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    File PDF Đề thi (Bắt buộc)
                  </label>
                  {examFile && (
                    <button
                      type="button"
                      onClick={() => setExamFile(null)}
                      className="text-[11px] text-red-500 hover:underline flex items-center gap-0.5"
                    >
                      <X className="w-3 h-3" /> Xoá file
                    </button>
                  )}
                </div>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleExamDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer min-h-[170px] flex flex-col justify-center items-center ${
                    examFile
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => e.target.files?.[0] && setExamFile(e.target.files[0])}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-[#0f2d22] mx-auto flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 line-clamp-1">
                      {examFile ? examFile.name : `Kéo thả PDF đề thi ${selectedCa}`}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {examFile
                        ? `${(examFile.size / 1024 / 1024).toFixed(2)} MB • Nhấp để đổi`
                        : 'File .pdf tối đa 30MB (đọc cả công thức LaTeX & ma trận)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dropzone 2: File PDF Đáp án & Thang điểm (Tuỳ chọn) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    File PDF Đáp án & Hướng dẫn (Tuỳ chọn)
                  </label>
                  {answerFile && (
                    <button
                      type="button"
                      onClick={() => setAnswerFile(null)}
                      className="text-[11px] text-red-500 hover:underline flex items-center gap-0.5"
                    >
                      <X className="w-3 h-3" /> Xoá file
                    </button>
                  )}
                </div>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleAnswerDrop}
                  onClick={() => answerFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer min-h-[170px] flex flex-col justify-center items-center ${
                    answerFile
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <input
                    ref={answerFileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => e.target.files?.[0] && setAnswerFile(e.target.files[0])}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-blue-700 mx-auto flex items-center justify-center">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 line-clamp-1">
                      {answerFile ? answerFile.name : 'Đính kèm PDF đáp án (nếu có)'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {answerFile
                        ? `${(answerFile.size / 1024 / 1024).toFixed(2)} MB • Nhấp để đổi`
                        : 'AI tự động trích xuất đáp án A-D & rubric tự luận'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Inputs: Tên bộ đề & Thời gian thi */}
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tên bộ đề hiển thị
                </label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:border-[#0f2d22]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Năm tổ chức thi
                  </label>
                  <input
                    type="text"
                    defaultValue="2026"
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-600 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Tùy chọn quyền Admin: Công khai đề thi cho mọi người */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <label htmlFor="isPublicCheck" className="text-xs font-bold text-slate-800 block cursor-pointer">
                    Đề thi công khai (Admin upload đề miễn phí)
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tích chọn nếu bạn là Admin muốn mở đề miễn phí cho toàn bộ thí sinh. Nếu không chọn, đề thi được lưu riêng tư và chỉ tài khoản của bạn mới xem được.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="isPublicCheck"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5 text-emerald-700 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer ml-3 shrink-0"
                />
              </div>
            </div>
          </div>

          {/* Cột phải: Thông tin xử lý & Bấm bóc tách */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
                Thông tin xử lý AI
              </h2>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Mã đề đã chọn:</span>
                  <span className="font-extrabold text-[#0f2d22]">{selectedCa}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Môn thi:</span>
                  <span className="font-semibold text-slate-900">{meta.subject}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cấu trúc câu hỏi:</span>
                  <span className="font-semibold text-slate-900">{meta.expectedQuestions} câu</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Thời gian thi:</span>
                  <span className="font-semibold text-slate-900">{examDuration} phút</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Quyền hiển thị:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${isPublic ? 'bg-blue-100 text-blue-900' : 'bg-amber-100 text-amber-900'}`}>
                    {isPublic ? 'Công khai (Admin)' : 'Riêng tư (Chỉ bạn)'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Công nghệ Gemini AI sẽ đọc toàn bộ hình ảnh và công thức Toán/LaTeX/bảng biểu, tự động phân loại thành 4 dạng câu:
                </p>
                <ul className="mt-2 text-[11px] text-slate-600 space-y-1 list-disc list-inside">
                  <li>Trắc nghiệm đơn (MCQ)</li>
                  <li>Trả lời ngắn số / tính toán</li>
                  <li>Điền khuyết chỗ trống (Blank Pool)</li>
                  <li>Trả lời ngắn khái niệm / điều luật</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-4 space-y-3">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-900 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {isParsing && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0 text-blue-600" />
                  <span className="font-medium">{parsingStep}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isParsing || (!examFile && !parsedData)}
                className="w-full py-3.5 px-4 bg-[#c1121f] hover:bg-[#a50f1a] font-bold rounded-xl text-sm sm:text-base text-white shadow-md shadow-red-950/20 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {isParsing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Đang bóc tách đề...</span>
                  </span>
                ) : (
                  'Bóc tách đề với AI Gemini'
                )}
              </button>

              <p className="text-[11px] text-slate-400 text-center leading-normal">
                Quá trình xử lý kéo dài từ 20 đến 45 giây tuỳ độ dài file PDF.
              </p>
            </div>
          </div>
        </div>

        {/* KHỐI 3: KHU VỰC XEM TRƯỚC, CHỈNH SỬA & LƯU CSDL */}
        {parsedData && (
          <div className="mt-10 pt-8 border-t-2 border-slate-200 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                  Bước 3: Kiểm duyệt & Lưu trữ
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f2d22] mt-2">
                  Dữ Liệu Bóc Tách Đề {parsedData.paperCode || selectedCa}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Bạn có thể trực tiếp chỉnh sửa nội dung câu hỏi, công thức LaTeX, phương án và đáp án đúng trước khi lưu.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveToDb}
                  disabled={isSaving}
                  className={`px-6 py-2.5 font-bold rounded-xl text-sm shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-2 ${
                    missingAnswersCount > 0
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu vào Firebase...</span>
                    </>
                  ) : missingAnswersCount > 0 ? (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      <span>Lưu đề (Thiếu {missingAnswersCount} đáp án)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Lưu Ngân hàng Đề</span>
                    </>
                  )}
                </button>

                {savedExamId && (
                  <button
                    type="button"
                    onClick={() => router.push(`/exam?id=${savedExamId}`)}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm shadow-md transition cursor-pointer flex items-center gap-2 active:scale-[0.98]"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Vào Thi Ngay</span>
                  </button>
                )}
              </div>
            </div>

            {/* Thông báo tình trạng đáp án trước khi lưu */}
            {!savedExamId && missingAnswersCount > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-sm flex items-start gap-3 shadow-xs">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-amber-950 block">
                    Yêu cầu hoàn tất đáp án: Còn {missingAnswersCount} câu hỏi chưa có đáp án đúng!
                  </span>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {answerFile
                      ? `File đáp án bóc tách chưa nhận diện đủ toàn bộ các câu trong đề.`
                      : `Bạn không tải lên file đáp án kèm theo file đề thi.`}
                    {' '}Theo quy định, bạn phải điền đáp án cho tất cả {parsedData.questions?.length || 50} câu hỏi tại <strong>Bảng Đáp Án Đề Thi</strong> bên dưới thì mới được lưu đề thi vào CSDL Firebase.
                  </p>
                </div>
              </div>
            )}

            {!savedExamId && missingAnswersCount === 0 && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="text-xs sm:text-sm font-medium">
                    Đã hoàn thành 100% đáp án cho toàn bộ {parsedData.questions?.length || 50} câu hỏi. Bạn hãy bấm <strong>"Lưu Ngân hàng Đề"</strong> để lưu chính thức vào CSDL Firebase.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveToDb}
                  disabled={isSaving}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shrink-0 cursor-pointer"
                >
                  Lưu đề ngay
                </button>
              </div>
            )}

            {savedExamId && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    Đề thi đã được lưu thành công vào CSDL Firebase với mã <strong>{savedExamId}</strong> (gắn với ID tài khoản:{' '}
                    <strong className="font-mono text-emerald-950">
                      {candidate?.uid || candidate?.id || candidate?.sbd || candidate?.email || 'Tạm thời'}
                    </strong>
                    ). Đề thi này được bảo mật và <strong>chỉ hiển thị riêng cho tài khoản của bạn</strong>!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/select-exam')}
                  className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950 shrink-0 cursor-pointer"
                >
                  Xem trong danh sách đề thi &rarr;
                </button>
              </div>
            )}

            {/* Component Xem trước và chỉnh sửa 4 dạng câu hỏi */}
            <ParsedExamPreview
              data={parsedData}
              onChange={(updated) => setParsedData(updated)}
            />
          </div>
        )}
      </main>

      {/* 3. FOOTER */}
      <footer className="bg-[#0a2018] text-emerald-100/60 text-xs py-6 px-4 text-center mt-12 border-t border-emerald-950">
        Hệ Thống Luyện Thi Trực Tuyến Tuyển Sinh Văn Bằng 2 Công An Nhân Dân &bull; Chuẩn hoá cấu trúc 4 mã đề CA1 - CA2 - CA3 - CA4
      </footer>
    </div>
  );
}

export default function AdminImportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f8f7] flex items-center justify-center text-slate-500 text-sm">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-700 mr-2" />
          <span>Đang tải giao diện Upload đề...</span>
        </div>
      }
    >
      <UploadContent />
    </Suspense>
  );
}
