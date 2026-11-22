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
  Cloud,
  ExternalLink,
  Edit3,
  RefreshCw,
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

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const answerFileInputRef = useRef<HTMLInputElement>(null);

  const queryCa = (searchParams.get('ca')?.toUpperCase() as PaperCode) || '';
  const initialCa = ['CA1', 'CA2', 'CA3', 'CA4'].includes(queryCa) ? queryCa : null;
  const [selectedCa, setSelectedCa] = useState<PaperCode | null>(initialCa);

  const [examFile, setExamFile] = useState<File | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);

  const [examTitle, setExamTitle] = useState(
    initialCa ? `Đề thi ${initialCa} - ${PAPER_META[initialCa]?.subject || ''} Bộ Công An 2026` : ''
  );
  const [examDuration, setExamDuration] = useState('150');
  const [isPublic, setIsPublic] = useState(false);

  const [isParsing, setIsParsing] = useState(false);
  const [parsingStep, setParsingStep] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savingStep, setSavingStep] = useState<string>('');
  const [savedExamId, setSavedExamId] = useState<string | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [uploadedB2Files, setUploadedB2Files] = useState<{
    examPdfUrl?: string;
    examPdfName?: string;
    answerPdfUrl?: string;
    answerPdfName?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<CandidateInfo | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Load candidate info from localStorage - Yêu cầu đăng nhập mới được upload
  useEffect(() => {
    try {
      const stored = localStorage.getItem('candidate_info');
      if (stored) {
        setCandidate(JSON.parse(stored));
        setIsCheckingAuth(false);
      } else {
        const dest = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/import';
        router.replace(`/login?redirect=${encodeURIComponent(dest)}`);
      }
    } catch (e) {
      console.error(e);
      router.replace('/login?redirect=/import');
    }
  }, [router]);

  // Update default title when selectedCa changes
  const handleSelectCa = (ca: PaperCode) => {
    setSelectedCa(ca);
    setExamTitle(`Đề thi ${ca} - ${PAPER_META[ca]?.subject || ''} Bộ Công An 2026`);
    setErrorMessage(null);
  };

  // Tự động kiểm tra nếu tên file có chứa mã đề khác với mã đang chọn
  const checkMismatchedCa = (file: File, currentCa: PaperCode | null) => {
    const nameUpper = file.name.toUpperCase();
    const detected = (['CA1', 'CA2', 'CA3', 'CA4'] as const).find((c) =>
      nameUpper.includes(c)
    );
    if (detected) {
      if (!currentCa) {
        handleSelectCa(detected);
      } else if (detected !== currentCa) {
        const confirmSwitch = confirm(
          `Bạn đang chọn mã đề "${currentCa}" (${PAPER_META[currentCa]?.subject || ''}) nhưng tệp tải lên là "${file.name}" (chứa mã đề ${detected} - ${PAPER_META[detected]?.subject || ''}).\n\nBạn có muốn tự động chuyển sang mã đề ${detected} không?`
        );
        if (confirmSwitch) {
          handleSelectCa(detected);
        }
      }
    }
  };

  // Drag & drop handlers for Exam PDF
  const handleExamDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!selectedCa) {
      alert('Vui lòng bấm chọn loại đề thi (CA1, CA2, CA3 hoặc CA4) ở Bước 1 trước khi tải file!');
      return;
    }
    if (e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        checkMismatchedCa(file, selectedCa);
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
    if (!selectedCa) {
      alert('Vui lòng bấm chọn loại đề thi (CA1, CA2, CA3 hoặc CA4) ở Bước 1 trước khi tải file đáp án!');
      return;
    }
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
    if (!selectedCa) {
      alert('Vui lòng chọn loại đề thi (CA1, CA2, CA3 hoặc CA4) ở Bước 1 trước khi bóc tách đề!');
      return;
    }
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

  // CẬP NHẬT NỘI DUNG ĐỀ THI ĐÃ LƯU (TUYỆT ĐỐI KHÔNG UPLOAD LẠI FILE PDF LÊN BACKBLAZE)
  const handleUpdateExam = async () => {
    if (!parsedData || !savedExamId) return;

    if (missingAnswersCount > 0) {
      setErrorMessage(
        `Không thể cập nhật! Hiện còn ${missingAnswersCount} câu chưa có đáp án đúng. Vui lòng bấm vào "Bảng Đáp Án Đề Thi" bên dưới để hoàn tất đáp án trước khi lưu.`
      );
      const el = document.getElementById('answer-matrix-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSavingStep('Đang cập nhật nội dung chỉnh sửa vào CSDL (không upload lại file PDF)...');
    try {
      const currentUserId = candidate?.uid || candidate?.id || candidate?.sbd || candidate?.email || '';
      const currentUserName = candidate?.fullName || candidate?.username || candidate?.sbd || '';
      const currentUserEmail = candidate?.email || '';

      const effectiveCa = (selectedCa || (parsedData.paperCode as PaperCode) || 'CA1') as PaperCode;
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

      // GIỮ NGUYÊN TẤT CẢ FILE URL TRÊN B2 TỪ LẦN LƯU TRƯỚC, KHÔNG GỌI API UPLOAD B2 NỮA
      const payload = {
        ...parsedData,
        id: savedExamId,
        paperCode: effectiveCa,
        examCode: effectiveCa,
        subject: PAPER_META[effectiveCa]?.subject || '',
        title: examTitle || parsedData.examTitle || `Đề thi ${effectiveCa}`,
        duration: parseInt(examDuration, 10) || 150,
        durationMinutes: parseInt(examDuration, 10) || 150,
        ownerId: currentUserId || parsedData.ownerId || 'anonymous',
        userId: currentUserId || parsedData.userId || 'anonymous',
        ownerName: currentUserName || parsedData.ownerName || '',
        ownerEmail: currentUserEmail || parsedData.ownerEmail || '',
        isPublic,
        // Giữ nguyên các đường dẫn PDF B2 đã lưu, tránh spam upload
        pdfFileUrl: uploadedB2Files?.examPdfUrl || parsedData.pdfFileUrl,
        pdfFileName: uploadedB2Files?.examPdfName || parsedData.pdfFileName,
        b2FileId: parsedData.b2FileId,
        answerPdfFileUrl: uploadedB2Files?.answerPdfUrl || parsedData.answerPdfFileUrl,
        answerPdfFileName: uploadedB2Files?.answerPdfName || parsedData.answerPdfFileName,
        b2UploadedAt: parsedData.b2UploadedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        throw new Error(`Lỗi cập nhật CSDL Firebase (Status ${res.status})`);
      }

      setParsedData(payload);
      setIsDirty(false);
      setLastUpdatedTime(new Date().toLocaleTimeString('vi-VN'));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(e);
      setErrorMessage(`Lỗi cập nhật đề thi: ${msg}`);
    } finally {
      setIsSaving(false);
      setSavingStep('');
    }
  };

  // Save to DB (Firebase & LocalStorage)
  const handleSaveToDb = async () => {
    if (!parsedData) return;

    // Nếu đề thi đã từng được lưu, chuyển sang chế độ cập nhật, không upload lại B2
    if (savedExamId) {
      return handleUpdateExam();
    }

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
    setSavingStep('Đang chuẩn bị lưu trữ đề thi...');
    try {
      const currentUserId = candidate?.uid || candidate?.id || candidate?.sbd || candidate?.email || '';
      const currentUserName = candidate?.fullName || candidate?.username || candidate?.sbd || '';
      const currentUserEmail = candidate?.email || '';

      const effectiveCa = (selectedCa || (parsedData.paperCode as PaperCode) || 'CA1') as PaperCode;
      const examId = savedExamId || `${effectiveCa.toLowerCase()}_${Date.now()}`;

      // 1. UPLOAD FILE PDF LÊN ĐÁM MÂY BACKBLAZE B2
      let examPdfUrl = parsedData.pdfFileUrl || '';
      let examPdfFileName = parsedData.pdfFileName || '';
      let examB2FileId = parsedData.b2FileId || '';

      if (examFile) {
        try {
          setSavingStep('Đang tải file PDF đề thi lên lưu trữ đám mây Backblaze B2...');
          const fd = new FormData();
          fd.append('file', examFile);
          fd.append('folder', 'exams');
          fd.append('examId', examId);
          fd.append('paperCode', effectiveCa);

          const upRes = await fetch('/api/upload-b2', {
            method: 'POST',
            body: fd,
          });

          if (upRes.ok) {
            const upData = await upRes.json();
            examPdfUrl = upData.proxyUrl || upData.directUrl || upData.authorizedUrl;
            examPdfFileName = examFile.name;
            examB2FileId = upData.fileId;
          } else {
            console.warn('Không thể upload examFile lên B2, tiếp tục lưu thông tin đề');
          }
        } catch (b2Err) {
          console.error('Lỗi upload examFile lên B2:', b2Err);
        }
      }

      let answerPdfUrl = parsedData.answerPdfFileUrl || '';
      let answerPdfFileName = parsedData.answerPdfFileName || '';

      if (answerFile) {
        try {
          setSavingStep('Đang tải file PDF đáp án lên lưu trữ đám mây Backblaze B2...');
          const fd = new FormData();
          fd.append('file', answerFile);
          fd.append('folder', 'answers');
          fd.append('examId', examId);
          fd.append('paperCode', effectiveCa);

          const upRes = await fetch('/api/upload-b2', {
            method: 'POST',
            body: fd,
          });

          if (upRes.ok) {
            const upData = await upRes.json();
            answerPdfUrl = upData.proxyUrl || upData.directUrl || upData.authorizedUrl;
            answerPdfFileName = answerFile.name;
          }
        } catch (b2Err) {
          console.error('Lỗi upload answerFile lên B2:', b2Err);
        }
      }

      setSavingStep('Đang lưu dữ liệu đề thi vào Firebase Realtime Database...');
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
        paperCode: effectiveCa,
        examCode: effectiveCa,
        subject: PAPER_META[effectiveCa]?.subject || '',
        title: examTitle || parsedData.examTitle || `Đề thi ${effectiveCa}`,
        duration: parseInt(examDuration, 10) || 150,
        durationMinutes: parseInt(examDuration, 10) || 150,
        ownerId: currentUserId || parsedData.ownerId || 'anonymous',
        userId: currentUserId || parsedData.userId || 'anonymous',
        ownerName: currentUserName || parsedData.ownerName || '',
        ownerEmail: currentUserEmail || parsedData.ownerEmail || '',
        isPublic,
        pdfFileUrl: examPdfUrl,
        pdfFileName: examPdfFileName,
        b2FileId: examB2FileId,
        answerPdfFileUrl: answerPdfUrl,
        answerPdfFileName: answerPdfFileName,
        b2UploadedAt: examPdfUrl ? new Date().toISOString() : undefined,
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

      setUploadedB2Files({
        examPdfUrl,
        examPdfName: examPdfFileName,
        answerPdfUrl,
        answerPdfName: answerPdfFileName,
      });

      setSavedExamId(examId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(e);
      setErrorMessage(`Lỗi lưu đề thi: ${msg}`);
    } finally {
      setIsSaving(false);
      setSavingStep('');
    }
  };

  const meta = selectedCa ? PAPER_META[selectedCa] : null;

  if (isCheckingAuth || !candidate) {
    return (
      <div className="min-h-screen bg-[#f7f8f7] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Yêu cầu đăng nhập</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Bạn cần đăng nhập tài khoản để upload đề thi cá nhân. Đang chuyển hướng đến trang đăng nhập...
            </p>
          </div>
        </div>
      </div>
    );
  }

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

          <div className="flex items-center gap-4 sm:gap-7 text-xs sm:text-sm font-medium">
            <Link href="/" className="text-emerald-100/80 hover:text-white transition">
              Thư viện đề
            </Link>
            <Link href="/select-exam" className="text-emerald-100/80 hover:text-white transition">
              Ngân hàng đề thi
            </Link>
            {candidate ? (
              <>
                <Link
                  href="/import"
                  className="text-white font-semibold underline underline-offset-4 decoration-amber-400"
                >
                  Upload đề
                </Link>
                <Link href="/upload-history" className="text-emerald-100/80 hover:text-white transition">
                  Lịch sử upload
                </Link>
                <Link href="/result" className="text-emerald-100/80 hover:text-white transition">
                  Lịch sử làm đề
                </Link>
                <Link
                  href="/profile"
                  className="text-amber-300 hover:text-amber-200 font-semibold uppercase text-xs sm:text-sm pl-2 transition"
                >
                  [{candidate.fullName || candidate.sbd || candidate.username || 'TÀI KHOẢN'}]
                </Link>
              </>
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
                    ID: { candidate.sbd || candidate.email}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Chọn loại đề thi cần Upload (Bắt buộc):
            </label>
            {!selectedCa ? (
              <span className="text-xs font-black px-3 py-1 rounded-full bg-red-100 text-red-700 border border-red-300 animate-pulse flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Bắt buộc: Hãy bấm chọn 1 mã đề bên dưới trước khi tải file</span>
              </span>
            ) : (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Đang chọn mã đề: <strong>{selectedCa}</strong> ({meta?.subject})
                </span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(['CA1', 'CA2', 'CA3', 'CA4'] as const).map((ca) => {
              const info = PAPER_META[ca];
              const isSelected = selectedCa === ca;
              return (
                <div
                  key={ca}
                  onClick={() => handleSelectCa(ca)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none ${
                    isSelected
                      ? 'border-[#0f2d22] bg-emerald-50 ring-2 ring-emerald-500/40 shadow-md'
                      : 'border-slate-200 bg-white hover:border-emerald-500 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-extrabold px-2.5 py-0.5 rounded-lg ${
                          isSelected
                            ? 'bg-[#0f2d22] text-amber-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ca}
                      </span>
                      {isSelected ? (
                        <span className="text-[10px] font-black uppercase text-emerald-900 bg-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Đang chọn
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-500">
                          {info.expectedQuestions} câu
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
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
            {!selectedCa && (
              <div className="p-4 bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl text-amber-900 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span className="text-xs sm:text-sm font-bold">
                  Khu vực tải file bị khóa. Vui lòng bấm chọn loại đề thi (CA1, CA2, CA3 hoặc CA4) ở Bước 1 trước khi tải file PDF lên!
                </span>
              </div>
            )}

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
                  onClick={() => {
                    if (!selectedCa) {
                      alert('Vui lòng bấm chọn loại đề thi (CA1, CA2, CA3 hoặc CA4) ở Bước 1 ở trên trước khi chọn file tải lên!');
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition min-h-[170px] flex flex-col justify-center items-center ${
                    !selectedCa
                      ? 'border-slate-200 bg-slate-100/70 cursor-not-allowed opacity-75'
                      : examFile
                      ? 'border-emerald-500 bg-emerald-50/50 cursor-pointer'
                      : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    disabled={!selectedCa}
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        const file = e.target.files[0];
                        checkMismatchedCa(file, selectedCa);
                        setExamFile(file);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-[#0f2d22] mx-auto flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 line-clamp-1">
                      {!selectedCa
                        ? 'Chưa chọn loại đề thi'
                        : examFile
                        ? examFile.name
                        : `Kéo thả PDF đề thi ${selectedCa}`}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {!selectedCa
                        ? 'Bấm chọn 1 mã đề (CA1, CA2, CA3, CA4) ở Bước 1 để mở khóa vùng upload'
                        : examFile
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
                  onClick={() => {
                    if (!selectedCa) {
                      alert('Vui lòng bấm chọn loại đề thi (CA1, CA2, CA3 hoặc CA4) ở Bước 1 ở trên trước khi chọn file đáp án!');
                      return;
                    }
                    answerFileInputRef.current?.click();
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition min-h-[170px] flex flex-col justify-center items-center ${
                    !selectedCa
                      ? 'border-slate-200 bg-slate-100/70 cursor-not-allowed opacity-75'
                      : answerFile
                      ? 'border-blue-500 bg-blue-50/50 cursor-pointer'
                      : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  <input
                    ref={answerFileInputRef}
                    type="file"
                    disabled={!selectedCa}
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        const file = e.target.files[0];
                        setAnswerFile(file);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-blue-700 mx-auto flex items-center justify-center">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 line-clamp-1">
                      {!selectedCa
                        ? 'Chưa chọn loại đề thi'
                        : answerFile
                        ? answerFile.name
                        : 'Đính kèm PDF đáp án (nếu có)'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {!selectedCa
                        ? 'Bấm chọn mã đề ở Bước 1 để mở khóa'
                        : answerFile
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
                  placeholder="VD: Đề thi CA1 - Toán cao cấp Bộ Công An 2026"
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
                    Đề thi công khai 
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tích chọn nếu bạn muốn mở đề miễn phí cho toàn bộ mọi người. Nếu không chọn, đề thi được lưu riêng tư và chỉ tài khoản của bạn mới xem được.
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
                  <span className={`font-extrabold ${selectedCa ? 'text-[#0f2d22]' : 'text-amber-600'}`}>
                    {selectedCa || 'Chưa chọn loại đề'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Môn thi:</span>
                  <span className="font-semibold text-slate-900">
                    {meta ? meta.subject : 'Chưa chọn'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cấu trúc câu hỏi:</span>
                  <span className="font-semibold text-slate-900">
                    {meta ? `${meta.expectedQuestions} câu` : '---'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Thời gian thi:</span>
                  <span className="font-semibold text-slate-900">{examDuration} phút</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Quyền hiển thị:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${isPublic ? 'bg-blue-100 text-blue-900' : 'bg-amber-100 text-amber-900'}`}>
                    {isPublic ? 'Công khai (mọi người)' : 'Riêng tư (Chỉ bạn)'}
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
                disabled={!selectedCa || isParsing || (!examFile && !parsedData)}
                className="w-full py-3.5 px-4 bg-[#c1121f] hover:bg-[#a50f1a] font-bold rounded-xl text-sm sm:text-base text-white shadow-md shadow-red-950/20 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {isParsing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Đang bóc tách đề...</span>
                  </span>
                ) : !selectedCa ? (
                  'Vui lòng chọn loại đề thi ở Bước 1'
                ) : (
                  `Bóc tách đề ${selectedCa} với AI Gemini`
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
                {savedExamId ? (
                  <button
                    type="button"
                    onClick={handleUpdateExam}
                    disabled={isSaving}
                    className="px-6 py-2.5 font-bold rounded-xl text-sm shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-2 bg-[#0f2d22] hover:bg-[#184232] text-white active:scale-[0.98]"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang cập nhật...</span>
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-4 h-4 text-amber-300" />
                        <span>Cập nhật chỉnh sửa</span>
                      </>
                    )}
                  </button>
                ) : (
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
                        <span>{savingStep || 'Đang lưu đề & Upload B2...'}</span>
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
                )}

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

            {/* Trạng thái đang lưu & upload Backblaze B2 */}
            {isSaving && savingStep && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 text-xs sm:text-sm flex items-center gap-3 shadow-xs animate-pulse">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
                <div className="flex-1">
                  <span className="font-bold block text-blue-950">Đang thực hiện lưu trữ đám mây:</span>
                  <span className="text-blue-800 font-medium">{savingStep}</span>
                </div>
                <Cloud className="w-5 h-5 text-blue-500 shrink-0" />
              </div>
            )}

            {/* Thông báo tình trạng đáp án trước khi lưu */}
            {!savedExamId && !isSaving && missingAnswersCount > 0 && (
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

            {!savedExamId && !isSaving && missingAnswersCount === 0 && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="text-xs sm:text-sm font-medium">
                    Đã hoàn thành 100% đáp án cho toàn bộ {parsedData.questions?.length || 50} câu hỏi. Khi bấm <strong>"Lưu Ngân hàng Đề"</strong>, hệ thống sẽ tự động tải file PDF của bạn lên đám mây <strong>Backblaze B2</strong> và lưu đề vào CSDL Firebase.
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
              <div className="p-5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-900 text-sm space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 font-medium">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-extrabold text-emerald-950 text-base block">
                        {lastUpdatedTime
                          ? `Đã cập nhật nội dung đề thi thành công (lúc ${lastUpdatedTime})!`
                          : 'Đề thi & Tệp PDF đã được lưu trữ thành công!'}
                      </span>
                      <span className="text-xs text-emerald-800">
                        Mã đề: <strong>{savedExamId}</strong> &bull; Gắn với ID tài khoản:{' '}
                        <strong className="font-mono text-emerald-950">
                          {candidate?.uid || candidate?.id || candidate?.sbd || candidate?.email || 'Tạm thời'}
                        </strong>
                        {' '}&bull; Quyền: <strong>Chỉ tài khoản của bạn xem được</strong>
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleUpdateExam}
                      disabled={isSaving}
                      className="text-xs font-bold text-emerald-950 bg-emerald-200 hover:bg-emerald-300 px-3.5 py-2 rounded-xl shrink-0 cursor-pointer transition flex items-center gap-1.5 active:scale-[0.98]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Cập nhật chỉnh sửa</span>
                    </button>
                    <Link
                      href="/upload-history"
                      className="text-xs font-bold text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-50 px-3.5 py-2 rounded-xl shrink-0 transition shadow-2xs flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Lịch sử upload</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => router.push('/select-exam')}
                      className="text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 px-4 py-2 rounded-xl shrink-0 cursor-pointer transition shadow-xs"
                    >
                      Vào Ngân hàng đề thi &rarr;
                    </button>
                  </div>
                </div>

                {/* Khối hiển thị liên kết lưu trữ Backblaze B2 */}
                {(uploadedB2Files?.examPdfUrl || parsedData.pdfFileUrl) && (
                  <div className="pt-3 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-emerald-900">
                      <Cloud className="w-4 h-4 text-emerald-700" />
                      <span>
                        File PDF gốc đã lưu an toàn trên <strong>Backblaze B2</strong> (Bucket: <code className="bg-emerald-100 px-1.5 py-0.5 rounded font-mono font-bold text-emerald-900">file-vb2</code>). Mọi chỉnh sửa nội dung sẽ <strong>chỉ cập nhật dữ liệu đề thi mà không tải lại file PDF cũ</strong>, tránh spam trùng lặp.
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {(uploadedB2Files?.examPdfUrl || parsedData.pdfFileUrl) && (
                        <a
                          href={uploadedB2Files?.examPdfUrl || parsedData.pdfFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Xem PDF Đề thi gốc trên B2</span>
                        </a>
                      )}
                      {(uploadedB2Files?.answerPdfUrl || parsedData.answerPdfFileUrl) && (
                        <a
                          href={uploadedB2Files?.answerPdfUrl || parsedData.answerPdfFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-blue-800 hover:text-blue-950 underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Xem PDF Đáp án trên B2</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Component Xem trước và chỉnh sửa 4 dạng câu hỏi */}
            <ParsedExamPreview
              data={parsedData}
              onChange={(updated) => {
                setParsedData(updated);
                setIsDirty(true);
              }}
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
