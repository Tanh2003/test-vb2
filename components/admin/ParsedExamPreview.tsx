'use client';

import React from 'react';
import MathText from '@/components/common/MathText';
import type { CognitiveLevel } from '@/types/exam';

export interface ParsedData {
  examCode: string;
  title?: string;
  essay: {
    question: string;
    minWords: number;
    points: number;
  };
  singleChoices: Array<{
    id: string;
    type: 'SINGLE';
    level: CognitiveLevel;
    content: string;
    options: { A: string; B: string; C: string; D: string };
    correctAnswer: 'A' | 'B' | 'C' | 'D';
  }>;
  groupQuestions: Array<{
    groupId: string;
    context: string;
    subQuestions: Array<{
      id: string;
      level: CognitiveLevel;
      content: string;
      options: { A: string; B: string; C: string; D: string };
      correctAnswer: 'A' | 'B' | 'C' | 'D';
    }>;
  }>;
  shortAnswers: Array<{
    id: string;
    type: 'SHORT';
    level: CognitiveLevel;
    content: string;
    correctAnswer: string;
  }>;
}

interface Props {
  data: ParsedData;
  onChange: (updated: ParsedData) => void;
}

const LEVELS: CognitiveLevel[] = ['BIET', 'HIEU', 'VAN_DUNG'];

export const ParsedExamPreview: React.FC<Props> = ({ data, onChange }) => {
  const updateSingle = (idx: number, field: string, val: any) => {
    const list = [...data.singleChoices];
    list[idx] = { ...list[idx], [field]: val };
    onChange({ ...data, singleChoices: list });
  };

  const updateShort = (idx: number, field: string, val: any) => {
    const list = [...data.shortAnswers];
    list[idx] = { ...list[idx], [field]: val };
    onChange({ ...data, shortAnswers: list });
  };

  return (
    <div className="space-y-6">
      {/* Tự luận */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-amber-400 text-sm">Phần I: Nghị Luận Xã Hội (30 Điểm)</h4>
          <span className="text-xs text-slate-400">Tối thiểu {data.essay.minWords} chữ</span>
        </div>
        <textarea
          rows={3}
          value={data.essay.question}
          onChange={(e) => onChange({ ...data, essay: { ...data.essay, question: e.target.value } })}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-xs text-slate-300">
          <p className="text-slate-500 font-semibold mb-1">Xem trước hiển thị:</p>
          <MathText text={data.essay.question} />
        </div>
      </div>

      {/* Trắc nghiệm đơn C01-C39 */}
      <div className="space-y-4">
        <h4 className="font-bold text-blue-400 text-sm uppercase tracking-wider">
          Trắc Nghiệm Đơn ({data.singleChoices.length} câu)
        </h4>
        {data.singleChoices.map((q, idx) => (
          <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold text-white text-sm">Câu {q.id}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Mức độ:</span>
                <select
                  value={q.level}
                  onChange={(e) => updateSingle(idx, 'level', e.target.value as CognitiveLevel)}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-semibold cursor-pointer"
                >
                  {LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
                <span className="text-xs text-slate-400 ml-2">Đáp án đúng:</span>
                <select
                  value={q.correctAnswer}
                  onChange={(e) => updateSingle(idx, 'correctAnswer', e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-emerald-400 font-bold cursor-pointer"
                >
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <textarea
              rows={2}
              value={q.content}
              onChange={(e) => updateSingle(idx, 'content', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300">
              <MathText text={q.content} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {(['A', 'B', 'C', 'D'] as const).map((key) => (
                <div key={key} className="flex items-center gap-2 bg-slate-950/50 p-2 rounded border border-slate-800">
                  <span className={`font-bold ${q.correctAnswer === key ? 'text-emerald-400' : 'text-slate-400'}`}>{key}:</span>
                  <input
                    type="text"
                    value={q.options[key]}
                    onChange={(e) => {
                      const updatedOpts = { ...q.options, [key]: e.target.value };
                      updateSingle(idx, 'options', updatedOpts);
                    }}
                    className="w-full bg-transparent text-slate-200 text-xs focus:outline-none"
                  />
                  <div className="text-[11px] text-slate-400 border-l border-slate-800 pl-2">
                    <MathText text={q.options[key]} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Trả lời ngắn C46-C50 */}
      <div className="space-y-4">
        <h4 className="font-bold text-emerald-400 text-sm uppercase tracking-wider">
          Trả Lời Ngắn ({data.shortAnswers.length} câu)
        </h4>
        {data.shortAnswers.map((q, idx) => (
          <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">Câu {q.id}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Mức độ:</span>
                <select
                  value={q.level}
                  onChange={(e) => updateShort(idx, 'level', e.target.value as CognitiveLevel)}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-semibold cursor-pointer"
                >
                  {LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
                <span className="text-xs text-slate-400 ml-2">Đáp án:</span>
                <input
                  type="text"
                  value={q.correctAnswer}
                  onChange={(e) => updateShort(idx, 'correctAnswer', e.target.value)}
                  placeholder="VD: -5, 1.25, 3/4"
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-emerald-400 w-28 focus:outline-none"
                />
              </div>
            </div>
            <textarea
              rows={2}
              value={q.content}
              onChange={(e) => updateShort(idx, 'content', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300">
              <MathText text={q.content} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParsedExamPreview;
