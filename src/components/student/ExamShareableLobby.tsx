import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldAlert,
  UserCheck,
  FileText,
  Calendar,
  AlertOctagon,
  Sparkles,
  HelpCircle,
  Loader2,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  Exam,
  Attempt,
  PublishedExamLink,
  UserProfile
} from '../../types/exam';
import {
  getPublishedExamLink,
  getExamById,
  startAttempt,
  getStudentAttempt,
  getAllStudents
} from '../../services/examService';

interface ExamShareableLobbyProps {
  publicExamId: string;
  onStartExam: (exam: Exam, attempt: Attempt) => void;
  onViewReceipt: (exam: Exam, attempt: Attempt) => void;
  onBackToHome?: () => void;
}

export const ExamShareableLobby: React.FC<ExamShareableLobbyProps> = ({
  publicExamId,
  onStartExam,
  onViewReceipt,
  onBackToHome,
}) => {
  const { currentUser, userProfile, signInWithRollNumber, signOut, switchRoleDemo } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [publishedLink, setPublishedLink] = useState<PublishedExamLink | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [existingAttempt, setExistingAttempt] = useState<Attempt | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Candidate Registration & Verification Form (for open enrollment)
  const [rollNumberInput, setRollNumberInput] = useState<string>(
    userProfile?.normalizedRollNumber || ''
  );
  const [candidateNameInput, setCandidateNameInput] = useState<string>(
    userProfile?.displayName || ''
  );
  const [passkeyInput, setPasskeyInput] = useState<string>('student123');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Waiting Room & Rules Check
  const [rulesAgreed, setRulesAgreed] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [startingAttempt, setStartingAttempt] = useState<boolean>(false);

  // Sample student roll options for instant convenience
  const sampleRolls = [
    { roll: 'CS-2024-001', name: 'Aarav Sharma' },
    { roll: 'CS-2024-002', name: 'Priya Patel' },
    { roll: 'CS-2024-003', name: 'Rohan Verma' },
  ];

  // 1. Fetch published link & exam details
  const fetchExamData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const link = await getPublishedExamLink(publicExamId);
      if (!link) {
        setErrorMessage(`Examination link "${publicExamId}" was not found or is no longer accessible.`);
        setLoading(false);
        return;
      }
      setPublishedLink(link);

      const examData = await getExamById(link.examId);
      if (!examData) {
        setErrorMessage('Exam configuration data could not be retrieved.');
        setLoading(false);
        return;
      }
      setExam(examData);

      // Check existing attempt if student is authenticated
      if (userProfile && userProfile.role === 'student') {
        const attempt = await getStudentAttempt(examData.id, userProfile.uid);
        if (attempt) {
          setExistingAttempt(attempt);
        }
      }
    } catch (err) {
      console.error('Error fetching exam link:', err);
      setErrorMessage('Failed to load examination link. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamData();
  }, [publicExamId, userProfile?.uid]);

  // Synchronized clock for countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync user profile changes to form
  useEffect(() => {
    if (userProfile) {
      if (userProfile.normalizedRollNumber) {
        setRollNumberInput(userProfile.normalizedRollNumber);
      }
      if (userProfile.displayName) {
        setCandidateNameInput(userProfile.displayName);
      }
    }
  }, [userProfile]);

  // Handle Candidate Sign-in / Verification
  const handleVerifyCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNumberInput.trim()) {
      setAuthError('Please enter your university roll number.');
      return;
    }

    setAuthError(null);
    setIsVerifying(true);
    try {
      const success = await signInWithRollNumber(rollNumberInput.trim(), passkeyInput.trim() || 'student123');
      if (!success) {
        setAuthError('Roll number verification failed. Please check your credentials or pick a demo roll number.');
      } else {
        // Refresh attempts for this user
        if (exam) {
          const attempt = await getStudentAttempt(exam.id, userProfile?.uid || rollNumberInput.trim());
          if (attempt) setExistingAttempt(attempt);
        }
      }
    } catch (err) {
      console.error('Candidate verification error:', err);
      setAuthError('Verification service error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Launch the examination
  const handleLaunchExam = async () => {
    if (!exam || !userProfile) return;
    if (!rulesAgreed) {
      alert('You must acknowledge and accept the proctoring regulations before entering the examination.');
      return;
    }

    setStartingAttempt(true);
    try {
      const attempt = await startAttempt(exam, userProfile);
      onStartExam(exam, attempt);
    } catch (err: any) {
      console.error('Failed to start attempt:', err);
      alert(err.message || 'Failed to start examination. Check eligibility.');
    } finally {
      setStartingAttempt(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-200">Verifying Examination Link...</h2>
        <p className="text-xs text-slate-400 mt-1 font-mono">Code: {publicExamId}</p>
      </div>
    );
  }

  if (errorMessage || !publishedLink || !exam) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-white shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-950 border border-red-800 flex items-center justify-center mx-auto mb-4 text-red-400">
            <AlertOctagon className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">Examination Link Inaccessible</h2>
          <p className="text-xs text-slate-400 mt-2 mb-6 leading-relaxed">
            {errorMessage || 'This examination link is inactive or could not be found.'}
          </p>
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={fetchExamData}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center space-x-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white"
              >
                Go to Portal
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Link status disabled
  if (publishedLink.status === 'disabled') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-amber-900/60 rounded-3xl p-8 text-center text-white shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-950 border border-amber-800 flex items-center justify-center mx-auto mb-4 text-amber-400">
            <Lock className="w-7 h-7" />
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-950 text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-amber-800/80 mb-2 inline-block">
            Access Suspended
          </span>
          <h2 className="text-lg font-bold text-slate-100 mt-2">{publishedLink.title}</h2>
          <p className="text-xs text-slate-400 mt-2 mb-6 leading-relaxed">
            This examination paper has been temporarily paused or concluded by the Controller of Examinations. No new candidates may enter at this time.
          </p>
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
            >
              Return to University Homepage
            </button>
          )}
        </div>
      </div>
    );
  }

  // Timing Calculations
  const startTimestamp = new Date(exam.scheduledStartAt).getTime();
  const diffSeconds = Math.floor((startTimestamp - currentTime) / 1000);
  const isScheduledInFuture = diffSeconds > 0;

  const formatCountdown = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${mins.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  const isAlreadySubmitted = Boolean(
    existingAttempt &&
    ['submitted', 'auto_submitted_tab_switch', 'auto_submitted_timeout', 'disqualified'].includes(
      existingAttempt.status
    )
  );

  const isInProgress = Boolean(existingAttempt && existingAttempt.status === 'in_progress');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top University Branding Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 font-bold">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-tight text-white">
                {publishedLink.collegeName || 'Apex Institute of Technology & Engineering'}
              </div>
              <div className="text-[11px] text-slate-400">
                Official Examination Assessment Portal • Link ID: {publishedLink.publicExamId}
              </div>
            </div>
          </div>

          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="text-xs text-slate-400 hover:text-white transition flex items-center space-x-1"
            >
              <span>Student Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full flex flex-col justify-center">
        
        {/* Banner Section */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold uppercase tracking-wider border border-blue-500/30">
                  {exam.examType || 'End-Semester Examination'}
                </span>
                {exam.courseCode && (
                  <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs font-mono font-bold border border-slate-700">
                    {exam.courseCode}
                  </span>
                )}
                <span className="text-xs text-slate-400">
                  Academic Year: {exam.academicYear || '2026-27'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {exam.title}
              </h1>

              {/* Zero-Pill Specifications Bar */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300 pt-1">
                <span className="flex items-center space-x-1.5">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span>
                    {new Date(exam.scheduledStartAt).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </span>
                <span>·</span>
                <span className="flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>{Math.round(exam.durationSeconds / 60)} Minutes Duration</span>
                </span>
                <span>·</span>
                <span className="flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>
                    Total: {exam.totalMarks} Marks (Pass: {exam.passingMarks || Math.round(exam.totalMarks * 0.4)})
                  </span>
                </span>
                {exam.negativeMarking && (
                  <>
                    <span>·</span>
                    <span className="text-red-400 font-semibold">
                      Negative Marking ({exam.negativeMarkingRate || 0.5} Mark)
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Waiting Room Countdown or Live Status */}
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5 text-center min-w-[240px] shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Waiting Room Status
              </span>

              {isScheduledInFuture ? (
                <div>
                  <div className="text-xs text-amber-400 font-semibold mb-1 flex items-center justify-center space-x-1">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Examination Starts In:</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-white tracking-wider">
                    {formatCountdown(diffSeconds)}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Synchronized to University Time
                  </span>
                </div>
              ) : (
                <div>
                  <div className="text-xs text-emerald-400 font-semibold mb-1 flex items-center justify-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Hall Is Currently Open</span>
                  </div>
                  <div className="text-xl font-black text-white">Live Examination</div>
                  <span className="text-[10px] text-emerald-400/80 mt-1 block">
                    Authorized candidates may enter
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* TWO-COLUMN WORKFLOW: CANDIDATE VERIFICATION & PROCTORING RULES */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Candidate Identity Verification (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
            <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Candidate Identity Verification</h3>
                <p className="text-[11px] text-slate-400">Open enrollment with university roll number</p>
              </div>
            </div>

            {/* If student is already logged in */}
            {userProfile && userProfile.role === 'student' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Verified Roll Number
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Authenticated</span>
                    </span>
                  </div>
                  <div className="text-lg font-mono font-black text-white">
                    {userProfile.normalizedRollNumber}
                  </div>
                  <div className="text-xs text-slate-300">
                    Candidate: <strong>{userProfile.displayName}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>Not you?</span>
                  <button
                    onClick={() => signOut()}
                    className="text-blue-400 hover:underline font-semibold flex items-center space-x-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Switch Candidate Roll Number</span>
                  </button>
                </div>
              </div>
            ) : (
              /* If not logged in, prompt for roll number registration */
              <form onSubmit={handleVerifyCandidate} className="space-y-4">
                {authError && (
                  <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{authError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    University Roll Number / Student ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS-2024-001"
                    value={rollNumberInput}
                    onChange={(e) => setRollNumberInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Candidate Name"
                    value={candidateNameInput}
                    onChange={(e) => setCandidateNameInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Access Passkey
                  </label>
                  <input
                    type="password"
                    placeholder="Default: student123"
                    value={passkeyInput}
                    onChange={(e) => setPasskeyInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Use provided institutional passkey or default password.
                  </span>
                </div>

                {/* Quick 1-Click Demo Roll Selection */}
                <div className="pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Quick Demo Candidates:
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {sampleRolls.map((s) => (
                      <button
                        key={s.roll}
                        type="button"
                        onClick={() => {
                          setRollNumberInput(s.roll);
                          setCandidateNameInput(s.name);
                          setPasskeyInput('student123');
                        }}
                        className="text-left px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between transition"
                      >
                        <span className="font-mono font-semibold text-blue-400">{s.roll}</span>
                        <span className="text-slate-400">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Candidate...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Confirm & Register Identity</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Check already submitted */}
            {isAlreadySubmitted && existingAttempt && (
              <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-800/80 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-900/50 flex items-center justify-center mx-auto text-amber-300">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-200">Assessment Already Submitted</h4>
                  <p className="text-[11px] text-amber-300/80 mt-1">
                    Your response was finalized on{' '}
                    {existingAttempt.submittedAt
                      ? new Date(existingAttempt.submittedAt).toLocaleTimeString()
                      : 'Earlier Session'}
                    .
                  </p>
                </div>
                <button
                  onClick={() => onViewReceipt(exam, existingAttempt)}
                  className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow transition"
                >
                  View Digital Submission Receipt
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: Proctoring Regulations, Instructions & Launch (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Examination Guidelines Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
              <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-800">
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Proctoring Rules & Instructions</h3>
                  <p className="text-[11px] text-slate-400">Mandatory academic integrity protocol</p>
                </div>
              </div>

              {/* Instructions text */}
              <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed p-4 rounded-2xl bg-slate-950 border border-slate-800">
                {exam.instructions ||
                  '1. Answer all questions within the allocated duration.\n2. Continuous cloud auto-save is enabled.\n3. Proctoring rule: Switching tabs or minimizing browser triggers immediate auto-submission.\n4. Click Submit once finished.'}
              </div>

              {/* Key Bullet Highlights */}
              <div className="space-y-2.5">
                <div className="flex items-start space-x-3 text-xs text-slate-300">
                  <div className="w-5 h-5 rounded-md bg-red-950/80 border border-red-800/80 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-white">Strict Tab-Switch Enforcement:</strong>{' '}
                    Navigating away from the active tab, opening applications, or minimizing the browser will be logged as a security breach and will immediately freeze and submit your test.
                  </div>
                </div>

                <div className="flex items-start space-x-3 text-xs text-slate-300">
                  <div className="w-5 h-5 rounded-md bg-blue-950/80 border border-blue-800/80 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-white">Continuous Autosave:</strong>{' '}
                    Every selected option or numerical answer is transmitted to Cloud Firestore with monotonic revision control.
                  </div>
                </div>

                <div className="flex items-start space-x-3 text-xs text-slate-300">
                  <div className="w-5 h-5 rounded-md bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-white">Authoritative Server Timer:</strong>{' '}
                    The countdown is calculated from the authoritative server deadline. The exam auto-finalizes when the timer reaches zero.
                  </div>
                </div>
              </div>

              {/* Mandatory Agreement Checkbox */}
              <div className="pt-2">
                <label className="flex items-start space-x-3 p-4 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                  <input
                    type="checkbox"
                    checked={rulesAgreed}
                    onChange={(e) => setRulesAgreed(e.target.checked)}
                    disabled={isAlreadySubmitted}
                    className="mt-0.5 w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-xs text-slate-300 leading-relaxed">
                    I confirm that I am the verified student associated with this roll number. I agree to abide by all college examination conduct rules, and I acknowledge that switching tabs or leaving the test window will immediately lock and auto-submit my paper.
                  </span>
                </label>
              </div>

              {/* Launch Action */}
              {!isAlreadySubmitted && (
                <div className="pt-2">
                  {isInProgress ? (
                    <button
                      onClick={handleLaunchExam}
                      disabled={startingAttempt || !rulesAgreed}
                      className="w-full py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-amber-600/30 flex items-center justify-center space-x-2 transition"
                    >
                      {startingAttempt ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Resuming Active Hall...</span>
                        </>
                      ) : (
                        <>
                          <span>Resume Active Examination</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleLaunchExam}
                      disabled={startingAttempt || !rulesAgreed || !userProfile}
                      className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center space-x-2 transition"
                    >
                      {startingAttempt ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Initiating Examination Session...</span>
                        </>
                      ) : !userProfile ? (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Register / Verify Roll Number to Start</span>
                        </>
                      ) : !rulesAgreed ? (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Check Regulations Box to Unlock</span>
                        </>
                      ) : (
                        <>
                          <span>Enter Examination Hall</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

            </div>

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        AcademiaExam Assessment Platform • 500+ Concurrency High-Availability Engine
      </footer>
    </div>
  );
};
