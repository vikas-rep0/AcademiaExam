import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertOctagon, 
  ChevronLeft, 
  ChevronRight, 
  Bookmark, 
  RotateCcw, 
  Send, 
  ShieldAlert, 
  CloudCheck, 
  CloudAlert, 
  Loader2, 
  Wifi, 
  WifiOff, 
  HelpCircle,
  EyeOff,
  AlertTriangle,
  Code2,
  Calculator,
  Copy,
  Check,
  FileCode,
  CheckSquare,
  Square
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  getAuthorizedExamQuestions, 
  getExamSections, 
  getAttemptAnswers, 
  saveAnswer, 
  finalizeAttempt, 
  recordTabSwitchEvent 
} from '../../services/examService';
import { 
  Exam, 
  ExamSection, 
  Question, 
  Attempt, 
  AttemptAnswer, 
  SubmissionReason 
} from '../../types/exam';

interface ExamLiveInterfaceProps {
  exam: Exam;
  initialAttempt: Attempt;
  onFinishExam: (exam: Exam, attempt: Attempt) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const ExamLiveInterface: React.FC<ExamLiveInterfaceProps> = ({
  exam,
  initialAttempt,
  onFinishExam,
}) => {
  const { userProfile } = useAuth();
  const [sections, setSections] = useState<ExamSection[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  
  // Local answers cache: questionId -> AttemptAnswer
  const [answers, setAnswers] = useState<Record<string, AttemptAnswer>>({});
  const [visitedQuestionIds, setVisitedQuestionIds] = useState<Set<string>>(new Set());

  // Timing states
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  
  // Modals & Locks
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLockedByTabSwitch, setIsLockedByTabSwitch] = useState<boolean>(false);
  const [tabSwitchIncidentReported, setTabSwitchIncidentReported] = useState<boolean>(false);
  const [isTimeExpired, setIsTimeExpired] = useState<boolean>(false);

  // References for debounce & concurrency
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const attemptRef = useRef<Attempt>(initialAttempt);

  // 1. Load sections, questions, and previous answers (refresh tolerance)
  useEffect(() => {
    let mounted = true;
    const loadExamData = async () => {
      try {
        const [secs, qs, ansMap] = await Promise.all([
          getExamSections(exam.id),
          getAuthorizedExamQuestions(exam.id),
          getAttemptAnswers(initialAttempt.id),
        ]);

        if (!mounted) return;
        setSections(secs);
        setQuestions(qs);
        setAnswers(ansMap || {});

        if (secs.length > 0) {
          setActiveSectionId(secs[0].id);
        }

        // Mark initial questions visited
        if (qs.length > 0) {
          setVisitedQuestionIds(new Set([qs[0].id]));
        }
      } catch (err) {
        console.error('Error loading exam live data:', err);
      }
    };

    loadExamData();
    return () => {
      mounted = false;
    };
  }, [exam.id, initialAttempt.id]);

  // Filter questions for active section
  const sectionQuestions = questions.filter((q) => q.sectionId === activeSectionId);
  const currentQuestion = sectionQuestions[activeQuestionIndex];

  // Track visited questions
  useEffect(() => {
    if (currentQuestion) {
      setVisitedQuestionIds((prev) => new Set([...prev, currentQuestion.id]));
    }
  }, [currentQuestion]);

  // 2. Server-Authoritative Timer based on attempt.deadlineAt
  useEffect(() => {
    const deadlineMs = new Date(initialAttempt.deadlineAt).getTime();

    const updateTimer = () => {
      const nowMs = Date.now();
      const diffSecs = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
      setRemainingSeconds(diffSecs);

      if (diffSecs <= 0 && !isTimeExpired && !isLockedByTabSwitch && !isSubmitting) {
        setIsTimeExpired(true);
        handleAutomaticFinalization('timeout');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [initialAttempt.deadlineAt, isTimeExpired, isLockedByTabSwitch, isSubmitting]);

  // Network listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 3. STRICT TAB-SWITCH AUTO-SUBMISSION POLICY
  // When visibilityState becomes hidden or window blurs:
  // 1. Immediately lock local UI
  // 2. Flush pending writes
  // 3. Call finalizeAttempt with 'tab_switch'
  const handleTabSwitchViolation = useCallback(async () => {
    if (isLockedByTabSwitch || isSubmitting || isTimeExpired) return;

    console.warn('[SECURITY VIOLATION] Tab switch or window blur event detected.');
    setIsLockedByTabSwitch(true);
    setTabSwitchIncidentReported(true);

    if (userProfile) {
      try {
        await recordTabSwitchEvent(initialAttempt.id, {
          uid: userProfile.uid,
          displayName: userProfile.displayName,
          role: 'student',
        });

        // Finalize attempt immediately per prompt's first-switch policy
        await finalizeAttempt(initialAttempt.id, 'tab_switch', {
          uid: userProfile.uid,
          displayName: userProfile.displayName,
          role: 'student',
        });
      } catch (err) {
        console.error('Error finalizing tab switch attempt:', err);
      }
    }
  }, [isLockedByTabSwitch, isSubmitting, isTimeExpired, userProfile, initialAttempt.id]);

  useEffect(() => {
    // Only arm proctoring if exam status is strict and student is actively taking it
    if (exam.tabSwitchPolicy === 'disabled') return;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleTabSwitchViolation();
      }
    };

    const onWindowBlur = () => {
      // Window blur triggers when student clicks off, minimizes, or switches window
      handleTabSwitchViolation();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [exam.tabSwitchPolicy, handleTabSwitchViolation]);

  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // 4. AUTO-SAVE WITH DEBOUNCE & CONCURRENCY REVISION
  const persistAnswer = async (
    qId: string,
    selectedOptionIds: string[],
    isMarked: boolean,
    rev: number,
    answerValue?: string,
    numericalValue?: number
  ) => {
    if (!userProfile) return;
    setSaveStatus('saving');
    try {
      const nextRev = await saveAnswer(
        initialAttempt.id,
        userProfile.uid,
        qId,
        selectedOptionIds,
        isMarked,
        rev,
        answerValue,
        numericalValue
      );
      setAnswers((prev) => ({
        ...prev,
        [qId]: {
          ...prev[qId],
          revision: nextRev,
          updatedAt: new Date().toISOString(),
        },
      }));
      setSaveStatus('saved');
    } catch (err) {
      console.error('Auto-save error:', err);
      setSaveStatus('error');
    }
  };

  const handleOptionSelect = (optionId: string) => {
    if (!currentQuestion || isLockedByTabSwitch || isTimeExpired) return;

    const currentAns = answers[currentQuestion.id];
    let newOptions: string[] = [];

    if (currentQuestion.questionType === 'mcq_multiple') {
      const existing = currentAns?.selectedOptionIds || [];
      if (existing.includes(optionId)) {
        newOptions = existing.filter((id) => id !== optionId);
      } else {
        newOptions = [...existing, optionId];
      }
    } else {
      // Single choice
      newOptions = [optionId];
    }

    const currentRev = currentAns?.revision || 0;
    const isMarked = currentAns?.isMarkedForReview || false;

    // Optimistic UI update
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        id: currentQuestion.id,
        attemptId: initialAttempt.id,
        studentId: userProfile?.uid || '',
        questionId: currentQuestion.id,
        selectedOptionIds: newOptions,
        revision: currentRev,
        isMarkedForReview: isMarked,
        updatedAt: new Date().toISOString(),
      },
    }));

    // Debounced network persistence
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      persistAnswer(currentQuestion.id, newOptions, isMarked, currentRev);
    }, 400);
  };

  const handleNumericalChange = (rawVal: string) => {
    if (!currentQuestion || isLockedByTabSwitch || isTimeExpired) return;
    const currentAns = answers[currentQuestion.id];
    const currentRev = currentAns?.revision || 0;
    const isMarked = currentAns?.isMarkedForReview || false;
    const parsedNum = rawVal.trim() !== '' && !isNaN(Number(rawVal)) ? Number(rawVal) : undefined;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        id: currentQuestion.id,
        attemptId: initialAttempt.id,
        studentId: userProfile?.uid || '',
        questionId: currentQuestion.id,
        selectedOptionIds: [],
        answerValue: rawVal,
        numericalValue: parsedNum,
        revision: currentRev,
        isMarkedForReview: isMarked,
        updatedAt: new Date().toISOString(),
      },
    }));

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      persistAnswer(currentQuestion.id, [], isMarked, currentRev, rawVal, parsedNum);
    }, 500);
  };

  const handleShortAnswerChange = (textVal: string) => {
    if (!currentQuestion || isLockedByTabSwitch || isTimeExpired) return;
    const currentAns = answers[currentQuestion.id];
    const currentRev = currentAns?.revision || 0;
    const isMarked = currentAns?.isMarkedForReview || false;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        id: currentQuestion.id,
        attemptId: initialAttempt.id,
        studentId: userProfile?.uid || '',
        questionId: currentQuestion.id,
        selectedOptionIds: [],
        answerValue: textVal,
        revision: currentRev,
        isMarkedForReview: isMarked,
        updatedAt: new Date().toISOString(),
      },
    }));

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      persistAnswer(currentQuestion.id, [], isMarked, currentRev, textVal, undefined);
    }, 500);
  };

  const handleClearResponse = () => {
    if (!currentQuestion || isLockedByTabSwitch || isTimeExpired) return;
    const currentAns = answers[currentQuestion.id];
    const currentRev = currentAns?.revision || 0;
    const isMarked = currentAns?.isMarkedForReview || false;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        id: currentQuestion.id,
        attemptId: initialAttempt.id,
        studentId: userProfile?.uid || '',
        questionId: currentQuestion.id,
        selectedOptionIds: [],
        answerValue: '',
        numericalValue: undefined,
        revision: currentRev,
        isMarkedForReview: isMarked,
        updatedAt: new Date().toISOString(),
      },
    }));

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      persistAnswer(currentQuestion.id, [], isMarked, currentRev, '', undefined);
    }, 200);
  };

  const handleToggleMarkForReview = () => {
    if (!currentQuestion || isLockedByTabSwitch || isTimeExpired) return;
    const currentAns = answers[currentQuestion.id];
    const newMarked = !(currentAns?.isMarkedForReview || false);
    const options = currentAns?.selectedOptionIds || [];
    const currentRev = currentAns?.revision || 0;
    const ansVal = currentAns?.answerValue;
    const numVal = currentAns?.numericalValue;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        id: currentQuestion.id,
        attemptId: initialAttempt.id,
        studentId: userProfile?.uid || '',
        questionId: currentQuestion.id,
        selectedOptionIds: options,
        answerValue: ansVal,
        numericalValue: numVal,
        revision: currentRev,
        isMarkedForReview: newMarked,
        updatedAt: new Date().toISOString(),
      },
    }));

    persistAnswer(currentQuestion.id, options, newMarked, currentRev, ansVal, numVal);
  };

  // 5. MANUAL OR AUTOMATIC SUBMISSION
  const handleAutomaticFinalization = async (reason: SubmissionReason) => {
    if (isSubmitting || !userProfile) return;
    setIsSubmitting(true);
    try {
      await finalizeAttempt(initialAttempt.id, reason, {
        uid: userProfile.uid,
        displayName: userProfile.displayName,
        role: 'student',
      });
      const updatedAttempt: Attempt = {
        ...initialAttempt,
        status: reason === 'tab_switch' ? 'auto_submitted_tab_switch' : 'submitted',
        submittedAt: new Date().toISOString(),
        submissionReason: reason,
      };
      onFinishExam(exam, updatedAttempt);
    } catch (err) {
      console.error('Finalize error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmManualSubmit = async () => {
    await handleAutomaticFinalization('manual');
  };

  // Timer Formatting
  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Stats for palette & submit modal
  const totalQuestionsCount = questions.length;
  let answeredCount = 0;
  let markedCount = 0;
  questions.forEach((q) => {
    const ans = answers[q.id];
    const hasOptions = ans?.selectedOptionIds && ans.selectedOptionIds.length > 0;
    const hasNumerical = ans?.numericalValue !== undefined && ans?.numericalValue !== null;
    const hasText = ans?.answerValue && ans.answerValue.trim().length > 0;
    if (hasOptions || hasNumerical || hasText) {
      answeredCount++;
    }
    if (ans?.isMarkedForReview) {
      markedCount++;
    }
  });
  const unansweredCount = totalQuestionsCount - answeredCount;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col select-none">
      
      {/* EXAM RUNTIME TOP BAR */}
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Exam & Candidate details */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow">
              {exam.courseCode ? exam.courseCode.slice(0, 2) : 'EX'}
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-[200px] sm:max-w-md">
                {exam.title}
              </h1>
              <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                <span>Roll: {userProfile?.normalizedRollNumber}</span>
                <span>•</span>
                <span>{userProfile?.displayName}</span>
              </div>
            </div>
          </div>

          {/* Center: Save Indicator & Network */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs">
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                  <span className="text-blue-300">Saving...</span>
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Saved to Cloud</span>
                </>
              ) : (
                <>
                  <CloudAlert className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-red-300">Save Error - Retrying</span>
                </>
              )}
            </div>

            <div className="flex items-center space-x-1 text-xs text-slate-400">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              )}
            </div>
          </div>

          {/* Right: Authoritative Server Timer & Finish Button */}
          <div className="flex items-center space-x-3">
            
            {/* Timer Badge */}
            <div className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-sm sm:text-base shadow-sm ${
              remainingSeconds < 60
                ? 'bg-red-950/80 border-red-700 text-red-300 animate-pulse'
                : remainingSeconds < 300
                ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-white'
            }`}>
              <Clock className="w-4 h-4 text-blue-400" />
              <span>{formatTime(remainingSeconds)}</span>
            </div>

            {/* Submit Button */}
            <button
              onClick={() => setShowSubmitModal(true)}
              className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 flex items-center space-x-1.5 transition"
            >
              <span>Submit</span>
              <Send className="w-3.5 h-3.5" />
            </button>

          </div>

        </div>
      </header>

      {/* SUB-HEADER: SECTIONS NAVIGATION */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center space-x-2 overflow-x-auto py-2.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0">
            Sections:
          </span>
          {sections.map((sec, idx) => {
            const isActive = sec.id === activeSectionId;
            return (
              <button
                key={sec.id}
                onClick={() => {
                  setActiveSectionId(sec.id);
                  setActiveQuestionIndex(0);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {sec.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN EXAM BODY */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full flex flex-col lg:flex-row gap-6">
        
        {/* LEFT / CENTER: QUESTION VIEWER */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          
          {currentQuestion ? (
            <>
              {/* Question Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Question {activeQuestionIndex + 1} of {sectionQuestions.length}
                  </span>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1.5">
                    <span className="font-medium">Type:</span>
                    <span className="font-semibold text-slate-700">
                      {currentQuestion.questionType === 'mcq_multiple'
                        ? 'Multiple Choice (Select all that apply)'
                        : currentQuestion.questionType === 'numerical'
                        ? 'Numerical Computation'
                        : currentQuestion.questionType === 'true_false'
                        ? 'True / False'
                        : currentQuestion.questionType === 'short_answer'
                        ? 'Short Answer / Explanation'
                        : 'Single Choice MCQ'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                    +{currentQuestion.marks} Marks
                  </span>
                  {currentQuestion.negativeMarks > 0 && (
                    <span className="px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                      -{currentQuestion.negativeMarks} Neg
                    </span>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <div className="text-slate-900 text-base sm:text-lg font-medium leading-relaxed mb-6">
                {currentQuestion.questionText}
              </div>

              {/* Math Formula Card (if present) */}
              {currentQuestion.mathFormula && (
                <div className="mb-6 p-4 rounded-xl bg-slate-900 border border-slate-800 text-white shadow-inner">
                  <div className="flex items-center space-x-2 text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2">
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Mathematical Expression</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 font-serif italic text-base sm:text-lg text-emerald-300 tracking-wide overflow-x-auto text-center border border-slate-800/80">
                    {currentQuestion.mathFormula}
                  </div>
                </div>
              )}

              {/* Code Snippet Card (if present) */}
              {currentQuestion.codeSnippet && currentQuestion.codeSnippet.code && (
                <div className="mb-6 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-lg">
                  {/* Code Header Tab */}
                  <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center space-x-2">
                      <Code2 className="w-4 h-4 text-blue-400" />
                      <span className="font-mono font-bold text-slate-200">
                        {currentQuestion.codeSnippet.title || 'snippet.py'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] uppercase font-mono text-slate-400 border border-slate-700">
                        {currentQuestion.codeSnippet.language || 'python'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (currentQuestion.codeSnippet?.code) {
                          navigator.clipboard.writeText(currentQuestion.codeSnippet.code);
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        }
                      }}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Code Body with line numbers */}
                  <div className="p-4 font-mono text-xs sm:text-sm text-slate-200 overflow-x-auto leading-relaxed">
                    <pre className="grid grid-cols-[auto_1fr] gap-x-4">
                      <span className="text-slate-600 select-none text-right font-mono">
                        {currentQuestion.codeSnippet.code
                          .split('\n')
                          .map((_, i) => `${i + 1}\n`)
                          .join('')}
                      </span>
                      <code>{currentQuestion.codeSnippet.code}</code>
                    </pre>
                  </div>
                </div>
              )}

              {/* INPUT RESPONSE AREA ACCORDING TO QUESTION TYPE */}
              
              {/* 1. Numerical Question */}
              {currentQuestion.questionType === 'numerical' ? (
                <div className="space-y-4 mb-8 p-6 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Enter Your Numerical Value Answer:
                    </label>
                    <span className="text-xs text-slate-500 font-mono">
                      Allowed Tolerance: ±{currentQuestion.numericalTolerance ?? 0}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 max-w-md">
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 42 or 3.1415"
                      value={answers[currentQuestion.id]?.answerValue || ''}
                      onChange={(e) => handleNumericalChange(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-base font-mono font-bold text-slate-900 bg-white shadow-sm"
                    />
                    <span className="text-xs font-semibold text-slate-500">Numerical Unit</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Input precision will be evaluated against the master solution within the declared error tolerance range.
                  </p>
                </div>
              ) : currentQuestion.questionType === 'short_answer' ? (
                /* 2. Short Answer / Theory Question */
                <div className="space-y-3 mb-8">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Your Response / Formulation:
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Type your structured explanation, algorithm steps, or proof..."
                    value={answers[currentQuestion.id]?.answerValue || ''}
                    onChange={(e) => handleShortAnswerChange(e.target.value)}
                    className="w-full p-4 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm text-slate-900 bg-white shadow-sm font-sans"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Answers are automatically synchronized to server.</span>
                    <span>Length: {(answers[currentQuestion.id]?.answerValue || '').length} characters</span>
                  </div>
                </div>
              ) : (
                /* 3. MCQ Single, Multiple, or True/False Options */
                <div className="space-y-3 mb-8">
                  {currentQuestion.questionType === 'mcq_multiple' && (
                    <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs font-semibold flex items-center space-x-2">
                      <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Multiple Correct Options: Check all options that you believe are correct.</span>
                    </div>
                  )}

                  {currentQuestion.options.map((opt, oIdx) => {
                    const currentAns = answers[currentQuestion.id];
                    const isSelected = currentAns?.selectedOptionIds?.includes(opt.id) || false;
                    const letter = String.fromCharCode(65 + oIdx); // A, B, C, D

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleOptionSelect(opt.id)}
                        className={`w-full text-left p-4 rounded-xl border transition-all flex items-start space-x-3.5 ${
                          isSelected
                            ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 font-medium shadow-sm'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        {/* Selector Indicator (Checkbox or Radio) */}
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {currentQuestion.questionType === 'mcq_multiple' ? (
                            isSelected ? <Check className="w-4 h-4" /> : letter
                          ) : (
                            letter
                          )}
                        </span>
                        <span className="text-sm leading-normal mt-0.5 flex-1">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Action Buttons Footer */}
              <div className="mt-auto pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleToggleMarkForReview}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition ${
                      answers[currentQuestion.id]?.isMarkedForReview
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-slate-50 hover:bg-slate-100 text-purple-700 border-purple-200'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>
                      {answers[currentQuestion.id]?.isMarkedForReview ? 'Marked' : 'Mark for Review'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearResponse}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 flex items-center space-x-1.5 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Answer</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={activeQuestionIndex === 0}
                    onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 flex items-center space-x-1 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <button
                    type="button"
                    disabled={activeQuestionIndex >= sectionQuestions.length - 1}
                    onClick={() =>
                      setActiveQuestionIndex((prev) => Math.min(sectionQuestions.length - 1, prev + 1))
                    }
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center space-x-1 shadow-sm transition"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-xs">Loading section questions...</p>
            </div>
          )}

        </div>

        {/* RIGHT SIDEBAR: QUESTION NAVIGATION PALETTE */}
        <div className="w-full lg:w-80 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between shrink-0">
          
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Question Palette
            </h3>

            {/* Question Grid */}
            <div className="grid grid-cols-5 gap-2 mb-6">
              {sectionQuestions.map((q, idx) => {
                const ans = answers[q.id];
                const hasAnswer =
                  (ans?.selectedOptionIds && ans.selectedOptionIds.length > 0) ||
                  (ans?.numericalValue !== undefined && ans?.numericalValue !== null) ||
                  (ans?.answerValue && ans.answerValue.trim().length > 0);
                const isMarked = ans?.isMarkedForReview || false;
                const isCurrent = idx === activeQuestionIndex;
                const isVisited = visitedQuestionIds.has(q.id);

                let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200'; // Not visited

                if (hasAnswer && isMarked) {
                  badgeStyle = 'bg-purple-600 text-white border-purple-700 ring-2 ring-emerald-400';
                } else if (isMarked) {
                  badgeStyle = 'bg-purple-600 text-white border-purple-700';
                } else if (hasAnswer) {
                  badgeStyle = 'bg-emerald-600 text-white border-emerald-700';
                } else if (isVisited) {
                  badgeStyle = 'bg-red-100 text-red-800 border-red-300'; // Visited but unanswered
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setActiveQuestionIndex(idx)}
                    className={`h-10 rounded-xl font-mono text-xs font-bold border transition flex items-center justify-center relative ${badgeStyle} ${
                      isCurrent ? 'ring-2 ring-blue-500 scale-105 shadow-md' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="space-y-2 text-[11px] text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="w-4 h-4 rounded-md bg-emerald-600 border border-emerald-700 shrink-0" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-4 h-4 rounded-md bg-red-100 border border-red-300 shrink-0" />
                <span>Not Answered ({unansweredCount})</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-4 h-4 rounded-md bg-purple-600 border border-purple-700 shrink-0" />
                <span>Marked for Review ({markedCount})</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-4 h-4 rounded-md bg-slate-100 border border-slate-200 shrink-0" />
                <span>Not Visited</span>
              </div>
            </div>
          </div>

          {/* Bottom Review Alert */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition flex items-center justify-center space-x-2"
            >
              <span>Review & Submit Examination</span>
            </button>
          </div>

        </div>

      </div>

      {/* CONFIRMATION SUBMISSION MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 text-center mb-1">
              Confirm Examination Submission
            </h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              Please review your question attempts before final submission. Once confirmed, you cannot modify your answers.
            </p>

            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl mb-6 text-center text-xs border border-slate-200">
              <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="text-emerald-800 font-bold text-base">{answeredCount}</div>
                <div className="text-[10px] text-emerald-700">Answered</div>
              </div>
              <div className="p-2 bg-red-50 rounded-lg border border-red-200">
                <div className="text-red-800 font-bold text-base">{unansweredCount}</div>
                <div className="text-[10px] text-red-700">Unanswered</div>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-purple-800 font-bold text-base">{markedCount}</div>
                <div className="text-[10px] text-purple-700">Review</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Continue Exam
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmManualSubmit}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/25 transition flex items-center justify-center space-x-1"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Finalize & Submit</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STRICT TAB-SWITCH AUTO-SUBMISSION LOCKOUT OVERLAY */}
      {isLockedByTabSwitch && (
        <div className="fixed inset-0 z-50 bg-red-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-600 rounded-3xl max-w-lg w-full p-8 text-white text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-red-600/20 border-2 border-red-500 text-red-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-red-600/30 text-red-300 border border-red-500/40">
              Proctoring Violation
            </span>

            <h2 className="text-2xl font-black mt-3 text-white">
              EXAMINATION LOCKED
            </h2>

            <p className="text-sm text-red-200 font-medium mt-2 leading-relaxed">
              A tab switch, window blur, or window minimization event was detected by the proctoring engine.
            </p>

            <div className="my-6 p-4 rounded-xl bg-slate-950/90 border border-red-800/60 text-left text-xs space-y-2 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Violation Type:</span>
                <span className="text-red-400 font-bold">DOCUMENT_VISIBILITY_HIDDEN</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Terminal Action:</span>
                <span className="text-amber-400">AUTO_SUBMIT_TERMINATION</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Candidate Roll:</span>
                <span className="text-white">{userProfile?.normalizedRollNumber}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-normal mb-6">
              Your test has been automatically submitted to the college server. Answers confirmed prior to the violation were persisted.
            </p>

            <button
              onClick={() => {
                const termAttempt: Attempt = {
                  ...initialAttempt,
                  status: 'auto_submitted_tab_switch',
                  submittedAt: new Date().toISOString(),
                  submissionReason: 'tab_switch',
                };
                onFinishExam(exam, termAttempt);
              }}
              className="w-full py-3 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 transition"
            >
              Acknowledge & View Official Receipt
            </button>

            {/* Regulatory limitation notice as required by system prompt */}
            <p className="mt-4 text-[10px] text-slate-500">
              Note for Administration: Browser visibility event is client-reported. College disciplinary review applies as per academic charter.
            </p>
          </div>
        </div>
      )}

      {/* TIMEOUT AUTO-SUBMISSION OVERLAY */}
      {isTimeExpired && !isLockedByTabSwitch && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-8 text-white text-center shadow-2xl">
            <Clock className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-bold">Exam Time Has Expired</h2>
            <p className="text-xs text-slate-300 mt-2 mb-6">
              The authoritative deadline for this exam has passed. The backend has automatically finalized your attempt.
            </p>
            <button
              onClick={() => {
                const timeAttempt: Attempt = {
                  ...initialAttempt,
                  status: 'auto_submitted_timeout',
                  submittedAt: new Date().toISOString(),
                  submissionReason: 'timeout',
                };
                onFinishExam(exam, timeAttempt);
              }}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
            >
              Proceed to Submission Receipt
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
