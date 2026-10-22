import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  ShieldAlert, 
  FileText, 
  Award,
  ChevronRight,
  Info,
  Calendar,
  Lock,
  Globe,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  getAllExams, 
  getStudentAttempt, 
  getStudentAssignments, 
  startAttempt,
  seedDemoCollegeData
} from '../../services/examService';
import { Exam, Attempt } from '../../types/exam';

interface StudentPortalProps {
  onStartExam: (exam: Exam, attempt: Attempt) => void;
  onViewReceipt: (exam: Exam, attempt: Attempt) => void;
  onOpenShareableSlug?: (slug: string) => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  onStartExam,
  onViewReceipt,
  onOpenShareableSlug,
}) => {
  const { userProfile } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [attemptsMap, setAttemptsMap] = useState<Record<string, Attempt>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [rulesAccepted, setRulesAccepted] = useState<boolean>(false);
  const [countdownRemaining, setCountdownRemaining] = useState<number>(0);
  const [startingAttempt, setStartingAttempt] = useState<boolean>(false);
  const [enteredCode, setEnteredCode] = useState<string>('');

  const fetchStudentData = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const allExams = await getAllExams();
      // Filter published or live exams
      const published = allExams.filter((e) => ['published', 'live', 'scheduled'].includes(e.status));
      setExams(published);

      // Fetch student attempts for each exam
      const attempts: Record<string, Attempt> = {};
      for (const e of published) {
        const att = await getStudentAttempt(e.id, userProfile.uid);
        if (att) {
          attempts[e.id] = att;
        }
      }
      setAttemptsMap(attempts);
    } catch (err) {
      console.error('Error fetching student data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [userProfile]);

  // Synchronized countdown for selected exam in Waiting Room
  useEffect(() => {
    if (!selectedExam) return;

    const calcRemaining = () => {
      const startMs = new Date(selectedExam.scheduledStartAt).getTime();
      const nowMs = Date.now();
      const diffSecs = Math.max(0, Math.floor((startMs - nowMs) / 1000));
      setCountdownRemaining(diffSecs);
    };

    calcRemaining();
    const interval = setInterval(calcRemaining, 1000);
    return () => clearInterval(interval);
  }, [selectedExam]);

  const handleOpenWaitingRoom = (exam: Exam) => {
    setSelectedExam(exam);
    setRulesAccepted(false);
  };

  const handleBeginOrResumeExam = async () => {
    if (!selectedExam || !userProfile) return;
    setStartingAttempt(true);
    try {
      // Start or resume attempt
      const attempt = await startAttempt(selectedExam, userProfile);
      onStartExam(selectedExam, attempt);
    } catch (err) {
      console.error('Error starting attempt:', err);
      alert('Unable to launch examination. Please check authorization or network.');
    } finally {
      setStartingAttempt(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-2xl border border-slate-800 p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Award className="w-4 h-4" />
              <span>Student Examination Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {userProfile?.displayName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="bg-slate-800/80 px-2.5 py-1 rounded-md font-mono border border-slate-700">
                Roll No: {userProfile?.normalizedRollNumber || 'N/A'}
              </span>
              <span className="bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
                Class / Batch: {userProfile?.classId || 'CSE-2024'}
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-500/30 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified Candidate Identity
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/60 p-4 rounded-xl text-center max-w-xs shrink-0">
            <div className="text-[11px] text-slate-400 uppercase font-semibold mb-1">
              Active Security Status
            </div>
            <div className="text-sm font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              Strict Proctoring Guard Armed
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Tab switches & window minimizations will immediately terminate attempts.
            </p>
          </div>
        </div>
      </div>

      {/* Access via Shareable Exam Link or Code */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-1.5 text-blue-600 text-xs font-bold uppercase tracking-wider">
            <Globe className="w-3.5 h-3.5" />
            <span>Direct Exam Link</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            Have a Shareable Exam URL or Assessment Code?
          </h3>
          <p className="text-xs text-slate-500">
            Enter the public exam code provided by your faculty (e.g., ex-demo-1 or ex-algo).
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Paste link or code (e.g. ex-demo-1)"
            value={enteredCode}
            onChange={(e) => setEnteredCode(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px]"
          />
          <button
            onClick={() => {
              if (!enteredCode.trim()) return;
              let slug = enteredCode.trim();
              if (slug.includes('?exam=')) {
                slug = slug.split('?exam=')[1].split('&')[0];
              } else if (slug.includes('/exam/')) {
                slug = slug.split('/exam/')[1].split('/')[0];
              }
              if (onOpenShareableSlug) {
                onOpenShareableSlug(slug);
              } else {
                window.location.search = `?exam=${slug}`;
              }
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 whitespace-nowrap transition cursor-pointer"
          >
            Open Exam Lobby
          </button>
        </div>
      </div>

      {/* Assigned Exams Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Assigned Examinations</h2>
            <p className="text-xs text-slate-500">
              Scheduled tests assigned to your roll number and academic department.
            </p>
          </div>
          <button
            onClick={fetchStudentData}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Refresh Roster
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
            {[1, 2].map((n) => (
              <div key={n} className="h-44 bg-slate-200 rounded-2xl" />
            ))}
          </div>
        ) : exams.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 shadow-sm">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-800">No Exams Currently Published</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              The examination controller has not published any live tests yet. Switch to Admin mode or click the seed button to load sample college exams.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exams.map((exam) => {
              const attempt = attemptsMap[exam.id];
              const isAttempted = !!attempt;
              const isInProgress = attempt?.status === 'in_progress';
              const isSubmitted = 
                attempt?.status === 'submitted' || 
                attempt?.status === 'auto_submitted_tab_switch' || 
                attempt?.status === 'auto_submitted_timeout';

              return (
                <div
                  key={exam.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between"
                >
                  <div>
                    {/* Tags */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-md text-xs font-semibold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                        {exam.courseCode || 'EXAM'}
                      </span>

                      {isInProgress ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          In Progress
                        </span>
                      ) : isSubmitted ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                          attempt.status === 'auto_submitted_tab_switch'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {attempt.status === 'auto_submitted_tab_switch' ? 'Terminated (Tab Switch)' : 'Submitted'}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                          Scheduled / Ready
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug">
                      {exam.title}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-2 mb-4">
                      {exam.description}
                    </p>

                    {/* Metadata pills */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Duration: {Math.round(exam.durationSeconds / 60)} Mins</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        <span>Total Marks: {exam.totalMarks}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Start: {new Date(exam.scheduledStartAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                        <span>{exam.negativeMarking ? 'Neg. Marking: Yes' : 'Neg. Marking: No'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action button */}
                  <div>
                    {isSubmitted ? (
                      <button
                        onClick={() => onViewReceipt(exam, attempt)}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition flex items-center justify-center space-x-1.5"
                      >
                        <FileText className="w-4 h-4 text-slate-600" />
                        <span>View Submission Receipt</span>
                      </button>
                    ) : isInProgress ? (
                      <button
                        onClick={() => onStartExam(exam, attempt)}
                        className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-md shadow-amber-500/20 transition flex items-center justify-center space-x-1.5"
                      >
                        <Play className="w-4 h-4" />
                        <span>Resume Active Examination</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenWaitingRoom(exam)}
                        className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition flex items-center justify-center space-x-1.5"
                      >
                        <span>Enter Waiting Room & Instructions</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* WAITING ROOM & INSTRUCTIONS MODAL */}
      {selectedExam && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                  Waiting Room & Conduct Protocol
                </span>
                <h3 className="text-xl font-bold mt-1 text-white">
                  {selectedExam.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Candidate: {userProfile?.displayName} (Roll: {userProfile?.normalizedRollNumber})
                </p>
              </div>

              {/* Synchronized Countdown Badge */}
              <div className="bg-slate-800 border border-slate-700 px-3.5 py-2 rounded-xl text-center shrink-0">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">
                  {countdownRemaining > 0 ? 'Starts In' : 'Status'}
                </div>
                <div className={`font-mono text-lg font-bold ${countdownRemaining > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {countdownRemaining > 0 ? formatCountdown(countdownRemaining) : 'LIVE NOW'}
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[65vh] overflow-y-auto space-y-5">
              
              {/* Exam Specs */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl text-xs text-slate-700 border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Duration</span>
                  <span className="font-bold text-slate-900">{Math.round(selectedExam.durationSeconds / 60)} Minutes</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Marks</span>
                  <span className="font-bold text-slate-900">{selectedExam.totalMarks} Marks</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Scoring Rule</span>
                  <span className="font-bold text-slate-900">
                    {selectedExam.negativeMarking ? 'Negative Marking' : 'Standard'}
                  </span>
                </div>
              </div>

              {/* Instructions from Admin */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Examination Instructions
                </h4>
                <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl whitespace-pre-line border border-slate-200 leading-relaxed font-sans">
                  {selectedExam.instructions || 'Answer all questions to the best of your ability.'}
                </div>
              </div>

              {/* Strict Proctoring Rules Checklist */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-xs text-amber-950">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>MANDATORY PROCTORING DIRECTIVES:</span>
                </div>
                <ul className="text-xs space-y-1.5 list-disc list-inside text-amber-800">
                  <li><strong>First Tab Switch Auto-Submit:</strong> Switching tabs, opening another window, or minimizing will immediately freeze your exam and submit your attempt with violation tags.</li>
                  <li><strong>Authoritative Server Timer:</strong> The countdown is controlled by the server. Refreshing or closing the tab will NOT pause or reset your time.</li>
                  <li><strong>Continuous Cloud Auto-Save:</strong> All chosen answers are saved dynamically in real-time.</li>
                  <li><strong>Single Terminal Attempt:</strong> Once submitted, the exam cannot be resumed under any circumstance.</li>
                </ul>
              </div>

              {/* Rules Acceptance Checkbox */}
              <label className="flex items-start space-x-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer select-none transition">
                <input
                  type="checkbox"
                  checked={rulesAccepted}
                  onChange={(e) => setRulesAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-700 leading-normal">
                  I acknowledge and accept all examination rules and the strict tab-switch proctoring policy. I confirm that I will not attempt unauthorized aid.
                </span>
              </label>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedExam(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel & Return
              </button>

              <button
                type="button"
                disabled={!rulesAccepted || countdownRemaining > 0 || startingAttempt}
                onClick={handleBeginOrResumeExam}
                className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-blue-600/25 flex items-center space-x-2 transition"
              >
                {startingAttempt ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : countdownRemaining > 0 ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Locked until Start Time</span>
                  </>
                ) : (
                  <>
                    <span>Start Live Examination</span>
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
