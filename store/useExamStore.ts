import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect, useRef } from 'react';
import type { CandidateAnswers } from '@/types/exam';

interface ExamState {
  sbd: string;
  cccd: string;
  examCode: 'CA1';
  answers: CandidateAnswers;
  flaggedQuestions: string[];
  timeLeft: number;
  violationCount: number;
  isSubmitted: boolean;
}

interface ExamActions {
  setSbd: (sbd: string) => void;
  setCccd: (cccd: string) => void;
  updateEssay: (text: string) => void;
  updateMcAnswer: (questionId: string, answer: string) => void;
  toggleFlag: (questionId: string) => void;
  tick: () => void;
  addViolation: () => void;
  submit: () => void;
  reset: () => void;
}

type ExamStore = ExamState & ExamActions;

const initialState: ExamState = {
  sbd: '',
  cccd: '',
  examCode: 'CA1',
  answers: {
    essay: '',
    multipleChoice: {},
  },
  flaggedQuestions: [],
  timeLeft: 9000,
  violationCount: 0,
  isSubmitted: false,
};

export const useExamStore = create<ExamStore>()(
  persist(
    (set) => ({
      ...initialState,

      setSbd: (sbd) => set({ sbd }),
      setCccd: (cccd) => set({ cccd }),

      updateEssay: (text) =>
        set((s) => ({ answers: { ...s.answers, essay: text } })),

      updateMcAnswer: (questionId, answer) =>
        set((s) => ({
          answers: {
            ...s.answers,
            multipleChoice: { ...s.answers.multipleChoice, [questionId]: answer },
          },
        })),

      toggleFlag: (questionId) =>
        set((s) => ({
          flaggedQuestions: s.flaggedQuestions.includes(questionId)
            ? s.flaggedQuestions.filter((id) => id !== questionId)
            : [...s.flaggedQuestions, questionId],
        })),

      tick: () =>
        set((s) => ({ timeLeft: s.timeLeft > 0 ? s.timeLeft - 1 : 0 })),

      addViolation: () =>
        set((s) => ({ violationCount: s.violationCount + 1 })),

      submit: () => set({ isSubmitted: true }),

      reset: () => set(initialState),
    }),
    {
      name: 'exam-session-ca1',
      partialize: (s) => ({
        sbd: s.sbd,
        cccd: s.cccd,
        examCode: s.examCode,
        answers: s.answers,
        flaggedQuestions: s.flaggedQuestions,
        timeLeft: s.timeLeft,
        violationCount: s.violationCount,
        isSubmitted: s.isSubmitted,
      }),
    },
  ),
);

export function useAutoSync() {
  const lastHash = useRef('');

  useEffect(() => {
    const interval = setInterval(async () => {
      const { setSbd, setCccd, updateEssay, updateMcAnswer, toggleFlag, tick, addViolation, submit, reset, ...state } =
        useExamStore.getState();

      const hash = JSON.stringify(state);
      if (hash === lastHash.current) return;
      lastHash.current = hash;

      try {
        await fetch('/api/exam/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: hash,
        });
      } catch {
        /* offline – sẽ thử lại lần sau */
      }
    }, 10_000);

    return () => clearInterval(interval);
  }, []);
}
