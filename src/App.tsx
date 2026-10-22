import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { LoginView } from './components/auth/LoginView';
import { StudentPortal } from './components/student/StudentPortal';
import { ExamLiveInterface } from './components/student/ExamLiveInterface';
import { ExamSubmittedView } from './components/student/ExamSubmittedView';
import { ExamShareableLobby } from './components/student/ExamShareableLobby';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { testFirestoreConnection } from './firebase/config';
import { Exam, Attempt } from './types/exam';
import { Loader2 } from 'lucide-react';

function parsePublicExamSlug(): string | null {
  if (typeof window === 'undefined') return null;
  // 1. Check query parameter ?exam=xxx
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('exam');
  if (fromQuery && fromQuery.trim()) {
    return fromQuery.trim();
  }
  // 2. Check path /exam/xxx
  const path = window.location.pathname;
  const match = path.match(/^\/exam\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

function MainApp() {
  const { currentUser, userProfile, isAdmin, isStudent, loading } = useAuth();
  
  // URL-driven Shareable Exam Link State
  const [shareableSlug, setShareableSlug] = useState<string | null>(() => parsePublicExamSlug());

  // Student exam navigation states
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<Attempt | null>(null);
  const [receiptExam, setReceiptExam] = useState<Exam | null>(null);
  const [receiptAttempt, setReceiptAttempt] = useState<Attempt | null>(null);

  // Initial connection test & history sync
  useEffect(() => {
    testFirestoreConnection().catch(() => {});

    const onPopState = () => {
      const slug = parsePublicExamSlug();
      setShareableSlug(slug);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
        <h2 className="text-sm font-semibold text-slate-300">Connecting to Examination Gateway...</h2>
        <p className="text-xs text-slate-500 mt-1">Verifying encrypted token and institutional authority</p>
      </div>
    );
  }

  // Active Live Examination mode (distraction minimized, full focus, no navbar)
  if (activeExam && activeAttempt) {
    return (
      <ExamLiveInterface
        exam={activeExam}
        initialAttempt={activeAttempt}
        onFinishExam={(exam, attempt) => {
          setActiveExam(null);
          setActiveAttempt(null);
          setReceiptExam(exam);
          setReceiptAttempt(attempt);
        }}
      />
    );
  }

  // Submission Receipt view
  if (receiptExam && receiptAttempt) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1">
          <ExamSubmittedView
            exam={receiptExam}
            attempt={receiptAttempt}
            onReturnHome={() => {
              setReceiptExam(null);
              setReceiptAttempt(null);
              setShareableSlug(null);
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', window.location.pathname);
              }
            }}
          />
        </main>
      </div>
    );
  }

  // Shareable Exam URL Lobby (open candidate registration & waiting room)
  if (shareableSlug) {
    return (
      <ExamShareableLobby
        publicExamId={shareableSlug}
        onStartExam={(exam, attempt) => {
          setActiveExam(exam);
          setActiveAttempt(attempt);
        }}
        onViewReceipt={(exam, attempt) => {
          setReceiptExam(exam);
          setReceiptAttempt(attempt);
        }}
        onBackToHome={() => {
          setShareableSlug(null);
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('exam');
            window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
          }
        }}
      />
    );
  }

  // Not authenticated & no shareable URL lobby open
  if (!currentUser || !userProfile) {
    return <LoginView />;
  }

  // Main portal (Admin or Student)
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1">
        {isAdmin ? (
          <AdminDashboard />
        ) : (
          <StudentPortal
            onStartExam={(exam, attempt) => {
              setActiveExam(exam);
              setActiveAttempt(attempt);
            }}
            onViewReceipt={(exam, attempt) => {
              setReceiptExam(exam);
              setReceiptAttempt(attempt);
            }}
            onOpenShareableSlug={(slug) => {
              setShareableSlug(slug);
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.set('exam', slug);
                window.history.pushState({}, '', url.toString());
              }
            }}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
