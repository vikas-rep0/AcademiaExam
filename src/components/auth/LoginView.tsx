import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ShieldAlert,
  ArrowRight, 
  AlertCircle, 
  Lock,
  CheckCircle2, 
  Users,
  Sparkles,
  Server,
  Fingerprint
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginView: React.FC = () => {
  const { 
    signInAdminWithCredentials, 
    signInWithRollNumber, 
    signInWithGoogle, 
    switchRoleDemo, 
    error, 
    clearError 
  } = useAuth();

  // Direct Admin Hub login is the primary default tab
  const [tab, setTab] = useState<'admin' | 'roll' | 'google'>('admin');

  // Admin credentials state (defaults provided for seamless access)
  const [adminUsername, setAdminUsername] = useState<string>('Rishi1230');
  const [adminPassword, setAdminPassword] = useState<string>('Rishi@meena1986');
  const [showAdminPassword, setShowAdminPassword] = useState<boolean>(false);
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);

  // Candidate credentials state
  const [rollNumber, setRollNumber] = useState<string>('2024CS0101');
  const [accessCode, setAccessCode] = useState<string>('EXAM2026');
  const [showStudentPassword, setShowStudentPassword] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Lockout countdown timer ticker
  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);
    setSuccessNotice(null);

    if (lockoutTimer > 0) {
      setLocalError(`Security lockout in effect. Please wait ${lockoutTimer} seconds.`);
      return;
    }

    if (!adminUsername.trim()) {
      setLocalError('Please enter the Administrator Username.');
      return;
    }
    if (!adminPassword) {
      setLocalError('Please enter the Administrator Password.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await signInAdminWithCredentials(adminUsername, adminPassword);
      if (!result.success) {
        if (result.lockoutSeconds) {
          setLockoutTimer(result.lockoutSeconds);
        }
        setLocalError(result.error || 'Authentication failed. Check your username and password.');
      } else {
        setSuccessNotice('Credentials verified cryptographically. Launching Admin Hub...');
      }
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    const normRoll = rollNumber.trim().toUpperCase();
    if (!normRoll) {
      setLocalError('Please enter your valid college roll number.');
      return;
    }
    if (!accessCode || accessCode.trim().length < 4) {
      setLocalError('Access code/password must be at least 4 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const ok = await signInWithRollNumber(normRoll, accessCode);
      if (!ok) {
        setLocalError('Verification failed. Invalid roll number or disabled account.');
      }
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Unable to log in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSubmit = async () => {
    clearError();
    setLocalError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Google sign-in was interrupted.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e3a8a_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-lg w-full mx-auto">
        
        {/* College Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 shadow-xl shadow-blue-500/25 text-white mb-3 border border-blue-400/30">
            <GraduationCap className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight sm:text-3xl">
            AcademiaExam Portal
          </h1>
          <p className="mt-1 text-xs text-slate-400 font-medium">
            Centralized Examination Controller & Assessment Management System
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
          
          {/* Tab Selector */}
          <div className="flex rounded-xl bg-slate-950 p-1 mb-6 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setTab('admin');
                setLocalError(null);
                setSuccessNotice(null);
              }}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                tab === 'admin'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Admin Hub</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('roll');
                setLocalError(null);
                setSuccessNotice(null);
              }}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                tab === 'roll'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Candidate Roll No</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('google');
                setLocalError(null);
                setSuccessNotice(null);
              }}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                tab === 'google'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Google Auth</span>
            </button>
          </div>

          {/* Feedback Banners */}
          {(error || localError) && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/70 border border-red-800/80 text-red-200 text-xs flex items-start space-x-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error || localError}</div>
            </div>
          )}

          {successNotice && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-200 text-xs flex items-start space-x-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successNotice}</div>
            </div>
          )}

          {lockoutTimer > 0 && (
            <div className="mb-5 p-3 rounded-xl bg-amber-950/70 border border-amber-800/80 text-amber-200 text-xs flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Rate-limit lockout active</span>
              </span>
              <span className="font-mono font-bold text-amber-400 bg-amber-900/50 px-2 py-0.5 rounded">
                {lockoutTimer}s remaining
              </span>
            </div>
          )}

          {/* TAB 1: ADMIN HUB GATEWAY */}
          {tab === 'admin' && (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/40 text-blue-200 text-xs flex items-start space-x-2.5 mb-2">
                <Fingerprint className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Enter master administrator credentials to access the <strong>Paper Builder Studio</strong>, 
                  <strong>Examination Links</strong>, and <strong>Live Monitoring</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Administrator Username</span>
                  <span className="text-[10px] text-blue-400 font-mono">Institutional ID</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="e.g. Rishi1230"
                    required
                    disabled={submitting || lockoutTimer > 0}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Administrator Password / Passkey</span>
                  <span className="text-[10px] text-slate-400">Cryptographically Hashed</span>
                </label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter security password"
                    required
                    disabled={submitting || lockoutTimer > 0}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || lockoutTimer > 0}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition cursor-pointer"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-blue-200" />
                      <span>Authenticate & Open Admin Hub</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Security info footer */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>SHA-256 Client-Hashed • Zero Plaintext Storage</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAdminUsername('Rishi1230');
                    setAdminPassword('Rishi@meena1986');
                  }}
                  className="text-blue-400 hover:underline text-[10px]"
                >
                  Reset Form
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: CANDIDATE ROLL NUMBER LOGIN */}
          {tab === 'roll' && (
            <form onSubmit={handleRollSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  University / College Roll Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. 2024CS0101"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Case-insensitive. Normalized automatically.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Examination Access Passkey / Password
                </label>
                <div className="relative">
                  <input
                    type={showStudentPassword ? 'text' : 'password'}
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Enter assigned student passkey"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStudentPassword(!showStudentPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showStudentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Enter Candidate Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: INSTITUTIONAL GOOGLE AUTH */}
          {tab === 'google' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Log in using your verified college Google account (<span className="font-mono text-blue-400">@college.edu</span>). 
                Institutional administrators (<span className="font-mono text-emerald-400">meenarishiswm2006@gmail.com</span>) are recognized with full privileges.
              </p>

              <button
                type="button"
                onClick={handleGoogleSubmit}
                disabled={submitting}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 text-sm font-semibold shadow-md flex items-center justify-center space-x-3 transition cursor-pointer"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign In with Institutional Google</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Quick Evaluator Access Section */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Quick Role Evaluator
              </span>
              <span className="text-[10px] text-slate-500">1-Click instant switch</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTab('admin');
                  setAdminUsername('Rishi1230');
                  setAdminPassword('Rishi@meena1986');
                  signInAdminWithCredentials('Rishi1230', 'Rishi@meena1986');
                }}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-700/50 text-left transition flex items-center space-x-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-white">Enter Admin Hub</div>
                  <div className="text-[10px] text-slate-400 font-mono">Rishi1230</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => switchRoleDemo('student1')}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-700/50 text-left transition flex items-center space-x-2 cursor-pointer"
              >
                <Users className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-white">Student Portal</div>
                  <div className="text-[10px] text-slate-400">Aarav (2024CS0101)</div>
                </div>
              </button>
            </div>
          </div>

        </div>

        {/* Proctoring Notice footer */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>High-concurrency college portal with server timestamps & strict proctoring</span>
        </div>

      </div>
    </div>
  );
};
