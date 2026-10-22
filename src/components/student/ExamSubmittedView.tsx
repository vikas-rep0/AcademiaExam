import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileCheck, 
  ShieldCheck, 
  ArrowLeft,
  GraduationCap
} from 'lucide-react';
import { Exam, Attempt } from '../../types/exam';

interface ExamSubmittedViewProps {
  exam: Exam;
  attempt: Attempt;
  onReturnHome: () => void;
}

export const ExamSubmittedView: React.FC<ExamSubmittedViewProps> = ({
  exam,
  attempt,
  onReturnHome,
}) => {
  const isTabSwitchViolation = attempt.status === 'auto_submitted_tab_switch';
  const isTimeout = attempt.status === 'auto_submitted_timeout';

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Banner */}
        <div className={`p-8 text-white text-center ${
          isTabSwitchViolation
            ? 'bg-gradient-to-b from-red-600 to-red-700'
            : isTimeout
            ? 'bg-gradient-to-b from-amber-600 to-amber-700'
            : 'bg-gradient-to-b from-emerald-600 to-emerald-700'
        }`}>
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-4">
            {isTabSwitchViolation ? (
              <AlertTriangle className="w-8 h-8 text-white" />
            ) : isTimeout ? (
              <Clock className="w-8 h-8 text-white" />
            ) : (
              <CheckCircle2 className="w-8 h-8 text-white" />
            )}
          </div>

          <span className="text-xs font-semibold tracking-wider uppercase px-3 py-1 rounded-full bg-black/20 text-white/90">
            {isTabSwitchViolation
              ? 'Security Auto-Submitted'
              : isTimeout
              ? 'Deadline Finalized'
              : 'Official Submission Recorded'}
          </span>

          <h2 className="text-2xl sm:text-3xl font-extrabold mt-3">
            {isTabSwitchViolation
              ? 'Examination Terminated & Submitted'
              : 'Examination Successfully Submitted'}
          </h2>

          <p className="text-xs sm:text-sm text-white/80 max-w-lg mx-auto mt-2">
            {isTabSwitchViolation
              ? 'Your answers were submitted due to a detected tab switch or window minimization event.'
              : 'Your answers have been securely persisted on the college examination server.'}
          </p>
        </div>

        {/* Digital Receipt Breakdown */}
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-bold text-slate-800">Digital Examination Receipt</span>
            </div>
            <span className="text-xs font-mono text-slate-400">
              ID: {attempt.id}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Course & Exam</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{exam.title}</span>
              <span className="text-slate-500 font-mono text-[11px]">{exam.courseCode || 'EXAM-CODE'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Candidate Credentials</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{attempt.studentName}</span>
              <span className="text-slate-500 font-mono text-[11px]">Roll: {attempt.studentRollNumber}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Started At</span>
              <span className="font-mono text-slate-800 mt-0.5 block">
                {attempt.startedAt ? new Date(attempt.startedAt).toLocaleString('en-IN') : 'N/A'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Finalized / Submitted At</span>
              <span className="font-mono text-slate-800 mt-0.5 block">
                {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Submission Reason</span>
              <span className={`font-bold mt-0.5 block ${
                isTabSwitchViolation ? 'text-red-600' : 'text-slate-900'
              }`}>
                {attempt.submissionReason?.toUpperCase() || 'MANUAL'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Proctoring Flag</span>
              <span className="font-mono text-slate-800 mt-0.5 block">
                Tab Switches: {attempt.tabSwitchesCount || (isTabSwitchViolation ? 1 : 0)}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-900 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Evaluation Policy:</strong> Grading is processed authoritatively on the backend by the examination cell. Individual score reports and answer solutions will be published by your faculty administrator according to institutional calendar schedules.
            </div>
          </div>

          <div className="pt-4 flex justify-center">
            <button
              onClick={onReturnHome}
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Examination Dashboard</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
