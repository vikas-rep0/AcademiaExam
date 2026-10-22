import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Clock, 
  LogOut, 
  ShieldCheck, 
  User as UserIcon, 
  Sparkles, 
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const { userProfile, isAdmin, isStudent, switchRoleDemo, signOut } = useAuth();
  const [istTime, setIstTime] = useState<string>('');
  const [showDemoMenu, setShowDemoMenu] = useState<boolean>(false);

  // Live Asia/Kolkata time display as specified in prompt
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(now);
      setIstTime(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-lg text-white">AcademiaExam</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                College Portal
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Centralized Online Examination & Evaluation Platform
            </p>
          </div>
        </div>

        {/* Center: Asia/Kolkata Clock */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-mono text-slate-300">
          <Clock className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span>IST: {istTime || 'Loading time...'}</span>
        </div>

        {/* Right: User identity & Fast Switcher */}
        <div className="flex items-center space-x-3">
          
          {/* Quick Demo Switcher Button for Instant Testing */}
          <div className="relative">
            <button
              onClick={() => setShowDemoMenu(!showDemoMenu)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-blue-950/70 hover:bg-blue-900 border border-blue-700/50 text-blue-200 text-xs font-medium transition-colors"
              title="Quickly switch between Admin and Student roles for testing"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Role Switcher</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showDemoMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Switch Demo Account
                </div>
                <button
                  onClick={() => {
                    switchRoleDemo('admin');
                    setShowDemoMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 mt-1 rounded-lg hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold text-white">Admin Hub Controller</div>
                      <div className="text-[10px] text-slate-400">Rishi1230 (Full Management)</div>
                    </div>
                  </div>
                  {isAdmin && <span className="text-[10px] text-emerald-400 font-bold">Active</span>}
                </button>

                <button
                  onClick={() => {
                    switchRoleDemo('student1');
                    setShowDemoMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <UserIcon className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="font-semibold text-white">Student: Aarav</div>
                      <div className="text-[10px] text-slate-400">Roll: 2024CS0101 (CSE-3A)</div>
                    </div>
                  </div>
                  {isStudent && userProfile?.normalizedRollNumber === '2024CS0101' && (
                    <span className="text-[10px] text-blue-400 font-bold">Active</span>
                  )}
                </button>

                <button
                  onClick={() => {
                    switchRoleDemo('student2');
                    setShowDemoMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <UserIcon className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="font-semibold text-white">Student: Priya</div>
                      <div className="text-[10px] text-slate-400">Roll: 2024CS0102 (CSE-3A)</div>
                    </div>
                  </div>
                  {isStudent && userProfile?.normalizedRollNumber === '2024CS0102' && (
                    <span className="text-[10px] text-purple-400 font-bold">Active</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Current User Info */}
          {userProfile && (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-white truncate max-w-[140px]">
                  {userProfile.displayName}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {isAdmin ? 'ADMINISTRATOR' : userProfile.normalizedRollNumber || 'STUDENT'}
                </div>
              </div>

              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                isAdmin ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
              }`}>
                {isAdmin ? 'AD' : 'ST'}
              </div>

              <button
                onClick={signOut}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>

      </div>
    </header>
  );
};
