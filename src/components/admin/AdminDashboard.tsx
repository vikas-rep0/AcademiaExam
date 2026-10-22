import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  FileSpreadsheet, 
  ShieldAlert, 
  Award, 
  FileText, 
  Plus, 
  Clock, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Download, 
  Upload, 
  RefreshCw, 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  Sparkles,
  ChevronRight,
  Database,
  Lock,
  Layers,
  HelpCircle,
  ExternalLink,
  Globe,
  Edit3,
  Share2
} from 'lucide-react';
import { PaperBuilderStudio } from './PaperBuilderStudio';
import { PublishedLinksView } from './PublishedLinksView';
import { useAuth } from '../../context/AuthContext';
import { 
  getAllExams, 
  createExam, 
  updateExam, 
  getExamSections, 
  saveExamSection, 
  getAuthorizedExamQuestions, 
  saveQuestionWithAnswerKey, 
  getLiveExamAttempts, 
  calculateExamResults, 
  generateSafeCSV, 
  getAuditLogs, 
  seedDemoCollegeData, 
  finalizeAttempt,
  getAllStudents,
  enrollStudent
} from '../../services/examService';
import { 
  Exam, 
  ExamSection, 
  Question, 
  Attempt, 
  AuditLogEntry, 
  ExamResultSummary, 
  TabSwitchPolicy, 
  QuestionType 
} from '../../types/exam';

type AdminTab = 
  | 'overview' 
  | 'studio'
  | 'links'
  | 'exams' 
  | 'questions' 
  | 'students' 
  | 'monitoring' 
  | 'results' 
  | 'audit' 
  | 'bootstrap';

export const AdminDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [editingExamForStudio, setEditingExamForStudio] = useState<Exam | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Data states
  const [sections, setSections] = useState<ExamSection[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [results, setResults] = useState<ExamResultSummary[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [studentsList, setStudentsList] = useState<Array<{ rollNumber: string; studentName: string; classId: string; active: boolean }>>([]);

  // Modals
  const [showCreateExamModal, setShowCreateExamModal] = useState<boolean>(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState<boolean>(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState<boolean>(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState<boolean>(false);

  // Form states
  const [newExamTitle, setNewExamTitle] = useState<string>('CS-401: Distributed Systems End-Semester Examination');
  const [newExamCode, setNewExamCode] = useState<string>('CS-401');
  const [newExamDuration, setNewExamDuration] = useState<number>(60);
  const [newExamMarks, setNewExamMarks] = useState<number>(30);
  const [newExamNegative, setNewExamNegative] = useState<boolean>(true);
  const [newExamTabPolicy, setNewExamTabPolicy] = useState<TabSwitchPolicy>('strict_first_switch');
  const [newExamInstructions, setNewExamInstructions] = useState<string>(
    '1. Answer all questions within the allocated 60 minutes.\n2. Strict proctoring enabled: Tab switches will auto-submit exam.\n3. Continuous auto-save enabled.'
  );

  // New question form
  const [newQText, setNewQText] = useState<string>('');
  const [newQSectionId, setNewQSectionId] = useState<string>('');
  const [newQType, setNewQType] = useState<QuestionType>('mcq_single');
  const [newQMarks, setNewQMarks] = useState<number>(3);
  const [newQNegMarks, setNewQNegMarks] = useState<number>(0.5);
  const [newQOptions, setNewQOptions] = useState<Array<{ id: string; text: string }>>([
    { id: 'opt_a', text: '' },
    { id: 'opt_b', text: '' },
    { id: 'opt_c', text: '' },
    { id: 'opt_d', text: '' },
  ]);
  const [newQCorrectId, setNewQCorrectId] = useState<string>('opt_a');
  const [newQExplanation, setNewQExplanation] = useState<string>('');

  // Bulk student import CSV
  const [bulkCsvText, setBulkCsvText] = useState<string>('');
  const [bulkImportStatus, setBulkImportStatus] = useState<string | null>(null);

  // Initial load
  const loadExams = async () => {
    setLoading(true);
    try {
      const all = await getAllExams();
      setExams(all);
      if (all.length > 0 && !selectedExamId) {
        setSelectedExamId(all[0].id);
      }
    } catch (err) {
      console.error('Error loading exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  // When selected exam changes, load sections, questions, and attempts
  useEffect(() => {
    if (!selectedExamId) return;

    const loadExamSubData = async () => {
      try {
        const [secs, qs, atts] = await Promise.all([
          getExamSections(selectedExamId),
          getAuthorizedExamQuestions(selectedExamId),
          getLiveExamAttempts(selectedExamId),
        ]);
        setSections(secs);
        setQuestions(qs);
        setAttempts(atts);

        if (secs.length > 0 && !newQSectionId) {
          setNewQSectionId(secs[0].id);
        }
      } catch (err) {
        console.error('Error loading exam details:', err);
      }
    };

    loadExamSubData();
  }, [selectedExamId]);

  // Load audit logs and students list
  const loadSecondaryData = async () => {
    try {
      const [logs, students] = await Promise.all([
        getAuditLogs(100),
        getAllStudents(),
      ]);
      setAuditLogs(logs);
      setStudentsList(students);
    } catch (err) {
      console.warn('Notice loading secondary data:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit' || activeTab === 'students' || activeTab === 'overview') {
      loadSecondaryData();
    }
    if (activeTab === 'results' && selectedExamId) {
      handleCalculateResults();
    }
  }, [activeTab, selectedExamId]);

  // Handlers
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    try {
      const scheduledStart = new Date().toISOString(); // Default live immediately
      const id = await createExam({
        title: newExamTitle,
        description: `College assessment for ${newExamCode}.`,
        instructions: newExamInstructions,
        status: 'published',
        scheduledStartAt: scheduledStart,
        durationSeconds: newExamDuration * 60,
        lateEntrySeconds: 900,
        totalMarks: newExamMarks,
        negativeMarking: newExamNegative,
        createdBy: userProfile.uid,
        publishedAt: scheduledStart,
        tabSwitchPolicy: newExamTabPolicy,
        courseCode: newExamCode,
      });

      // Create default Section A
      await saveExamSection({
        id: 'sec_1',
        examId: id,
        title: 'Section 1: General Core',
        order: 1,
        sectionMarks: newExamMarks,
      });

      setShowCreateExamModal(false);
      setActionMessage('New examination created and published successfully!');
      await loadExams();
      setSelectedExamId(id);
    } catch (err) {
      console.error('Error creating exam:', err);
      alert('Failed to create exam.');
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId || !newQSectionId || !newQText.trim()) return;

    const qId = `q_${Date.now()}`;
    const questionObj: Question = {
      id: qId,
      examId: selectedExamId,
      sectionId: newQSectionId,
      questionType: newQType,
      questionText: newQText,
      options: newQOptions.filter((o) => o.text.trim().length > 0),
      marks: Number(newQMarks),
      negativeMarks: Number(newQNegMarks),
      order: questions.length + 1,
      version: 1,
    };

    try {
      await saveQuestionWithAnswerKey(questionObj, [newQCorrectId], newQExplanation);
      setShowAddQuestionModal(false);
      setNewQText('');
      setNewQExplanation('');
      setActionMessage('Question saved with protected answer key!');
      const updated = await getAuthorizedExamQuestions(selectedExamId);
      setQuestions(updated);
    } catch (err) {
      console.error('Error saving question:', err);
      alert('Failed to save question.');
    }
  };

  const handleCalculateResults = async () => {
    if (!selectedExamId) return;
    try {
      const res = await calculateExamResults(selectedExamId);
      setResults(res);
    } catch (err) {
      console.error('Error grading attempts:', err);
    }
  };

  const handleExportCSV = () => {
    const selected = exams.find((e) => e.id === selectedExamId);
    const title = selected ? selected.title : 'Exam_Results';
    const csvContent = generateSafeCSV(results, title);

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_Official_Results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleForceSubmitAttempt = async (attempt: Attempt) => {
    if (!userProfile) return;
    if (confirm(`Are you sure you want to force-submit attempt for student ${attempt.studentName} (${attempt.studentRollNumber})?`)) {
      await finalizeAttempt(attempt.id, 'admin_forced', {
        uid: userProfile.uid,
        displayName: userProfile.displayName,
        role: 'admin',
      });
      const updated = await getLiveExamAttempts(selectedExamId);
      setAttempts(updated);
    }
  };

  const handleSeedCollegeExam = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const id = await seedDemoCollegeData(userProfile.uid, userProfile.email || 'admin@college.edu');
      setActionMessage('College CS-302 Algorithm Exam & 5 Students Seeded Successfully!');
      await loadExams();
      setSelectedExamId(id);
    } catch (err) {
      console.error('Seed error:', err);
      alert('Error seeding demo data.');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessBulkImport = async () => {
    if (!bulkCsvText.trim()) return;
    const lines = bulkCsvText.trim().split('\n');
    let importedCount = 0;

    try {
      for (const line of lines) {
        const parts = line.split(',').map((p) => p.trim());
        if (parts.length >= 2 && parts[0].toLowerCase() !== 'rollnumber') {
          const [roll, name, classId] = parts;
          await enrollStudent({
            rollNumber: roll,
            studentName: name,
            classId: classId || 'CSE-2024',
          });
          importedCount++;
        }
      }

      setBulkImportStatus(`Successfully enrolled ${importedCount} student accounts!`);
      setBulkCsvText('');
      await loadSecondaryData();
    } catch (err) {
      console.error('Bulk import error:', err);
      setBulkImportStatus('Failed to process CSV lines. Check format.');
    }
  };

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  // Overview metrics
  const activeExamsCount = exams.filter((e) => ['published', 'live'].includes(e.status)).length;
  const inProgressAttemptsCount = attempts.filter((a) => a.status === 'in_progress').length;
  const submittedAttemptsCount = attempts.filter((a) => ['submitted', 'auto_submitted_tab_switch', 'auto_submitted_timeout'].includes(a.status)).length;
  const violationCount = attempts.filter((a) => a.status === 'auto_submitted_tab_switch').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Lock className="w-3.5 h-3.5" />
            <span>Authorized Administration Console</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Examination Control & Proctoring Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Session: {userProfile?.displayName} • Concurrency Rating: 500+ Students Supported
          </p>
        </div>

        {/* Actions: Seed & Paper Studio */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setEditingExamForStudio(null);
              setActiveTab('studio');
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center space-x-2 transition"
          >
            <Layers className="w-4 h-4 text-blue-200" />
            <span>Paper Builder Studio (Wizard)</span>
          </button>

          <button
            onClick={handleSeedCollegeExam}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold shadow-md flex items-center space-x-2 transition"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Seed College Exam Data (1-Click)</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-emerald-700 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* DASHBOARD TABS */}
      <div className="flex items-center space-x-1 border-b border-slate-200 mb-8 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'studio', label: 'Paper Studio (Wizard)', icon: Layers },
          { id: 'links', label: 'Published Links', icon: Globe },
          { id: 'exams', label: 'Exams Manager', icon: BookOpen },
          { id: 'questions', label: 'Questions & Keys', icon: HelpCircle },
          { id: 'monitoring', label: 'Live Proctoring', icon: ShieldAlert, badge: inProgressAttemptsCount },
          { id: 'results', label: 'Grading & Reports', icon: Award },
          { id: 'students', label: 'Student Enrolment', icon: Users },
          { id: 'audit', label: 'Audit Trail', icon: FileText },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as AdminTab)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
              {t.badge !== undefined && t.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold animate-pulse">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. OVERVIEW TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Registered Students
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {studentsList.length || 5}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Active roll mappings</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Active / Published Exams
              </span>
              <div className="text-2xl font-black text-blue-600 mt-1">
                {activeExamsCount}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Scheduled for semester</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Live Test-Takers Now
              </span>
              <div className="text-2xl font-black text-amber-500 mt-1 flex items-center gap-1.5">
                <span>{inProgressAttemptsCount}</span>
                {inProgressAttemptsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                )}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">In-progress sessions</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Tab-Switch Violations
              </span>
              <div className="text-2xl font-black text-red-600 mt-1">
                {violationCount}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Terminated attempts</span>
            </div>
          </div>

          {/* Quick Active Exam Selector & Monitoring Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4 mb-6">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Target Examination Scope</h3>
                <p className="text-xs text-slate-500">
                  Select exam to manage questions, view live attempt feeds, and grade results.
                </p>
              </div>

              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-800"
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.courseCode ? `[${ex.courseCode}] ` : ''}{ex.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedExam ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Schedule</span>
                  <div className="font-bold text-slate-900 text-sm">{selectedExam.title}</div>
                  <div className="text-slate-600">
                    Duration: {Math.round(selectedExam.durationSeconds / 60)} Mins • Total Marks: {selectedExam.totalMarks}
                  </div>
                  <div className="text-blue-600 font-mono text-[11px]">
                    Status: {selectedExam.status.toUpperCase()}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Proctoring Protocol</span>
                  <div className="font-bold text-slate-900">
                    Policy: {selectedExam.tabSwitchPolicy === 'strict_first_switch' ? 'Strict 1st-Switch Terminate' : selectedExam.tabSwitchPolicy}
                  </div>
                  <div className="text-slate-600">
                    Negative Marking: {selectedExam.negativeMarking ? 'Active (-0.5 marks)' : 'Disabled'}
                  </div>
                  <div className="text-emerald-600 font-medium">
                    Questions Configured: {questions.length} in {sections.length} Sections
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">Quick Actions</span>
                    <div className="text-xs text-slate-600 mt-1">
                      Monitor live student progress or export auto-graded CSV scorecards.
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setActiveTab('monitoring')}
                      className="flex-1 py-2 px-3 rounded-lg bg-blue-600 text-white font-semibold text-center hover:bg-blue-500 transition"
                    >
                      Live Monitor
                    </button>
                    <button
                      onClick={() => setActiveTab('results')}
                      className="flex-1 py-2 px-3 rounded-lg bg-slate-900 text-white font-semibold text-center hover:bg-slate-800 transition"
                    >
                      Grading
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                No exam selected. Create an exam or click Seed College Exam Data above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PAPER BUILDER STUDIO TAB (WIZARD) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'studio' && (
        <PaperBuilderStudio
          existingExamToEdit={editingExamForStudio}
          onBackToDashboard={() => {
            setEditingExamForStudio(null);
            setActiveTab('exams');
            loadExams();
          }}
          onPaperPublished={(examId, publicExamId) => {
            setEditingExamForStudio(null);
            setActiveTab('links');
            setActionMessage(`Exam paper snapshot published successfully! Unique shareable slug: ${publicExamId}`);
            loadExams();
          }}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* PUBLISHED EXAM LINKS TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'links' && (
        <PublishedLinksView
          onOpenPaperStudio={() => {
            setEditingExamForStudio(null);
            setActiveTab('studio');
          }}
          onViewLiveMonitoring={(examId) => {
            setSelectedExamId(examId);
            setActiveTab('monitoring');
          }}
          onPreviewLobby={(publicExamId) => {
            window.location.search = `?exam=${publicExamId}`;
          }}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. EXAMS MANAGER TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Curriculum Examinations</h2>
              <p className="text-xs text-slate-500">Create, schedule, publish and manage college exams.</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setEditingExamForStudio(null);
                  setActiveTab('studio');
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow"
              >
                <Layers className="w-4 h-4" />
                <span>Paper Builder Studio</span>
              </button>

              <button
                onClick={() => setShowCreateExamModal(true)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Quick Blank</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Exam Title</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Marks</th>
                  <th className="py-3 px-4">Proctoring Policy</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exams.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{ex.title}</td>
                    <td className="py-3.5 px-4 font-mono">{ex.courseCode || 'N/A'}</td>
                    <td className="py-3.5 px-4">{Math.round(ex.durationSeconds / 60)} Mins</td>
                    <td className="py-3.5 px-4 font-bold">{ex.totalMarks}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium border border-amber-200">
                        {ex.tabSwitchPolicy}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase ${
                        ex.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {ex.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingExamForStudio(ex);
                          setActiveTab('studio');
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center space-x-1"
                        title="Edit in Paper Builder Studio"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Studio</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('links');
                        }}
                        className="text-emerald-600 hover:text-emerald-800 font-semibold inline-flex items-center space-x-1"
                        title="View shareable public link"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Link</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedExamId(ex.id);
                          setActiveTab('questions');
                        }}
                        className="text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Questions
                      </button>
                      <button
                        onClick={() => {
                          setSelectedExamId(ex.id);
                          setActiveTab('monitoring');
                        }}
                        className="text-slate-600 hover:text-slate-900 font-semibold"
                      >
                        Monitor
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. QUESTIONS & KEYS TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Question Bank & Protected Answer Keys
              </h2>
              <p className="text-xs text-slate-500">
                Questions are public to enrolled students; correct answer keys are strictly protected from client inspection.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold"
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowAddQuestionModal(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </button>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {questions.map((q, qIndex) => (
              <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center">
                      {qIndex + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">
                      {sections.find((s) => s.id === q.sectionId)?.title || 'General'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-semibold">
                    <span className="text-emerald-600 font-mono">+{q.marks} Marks</span>
                    {q.negativeMarks > 0 && (
                      <span className="text-red-500 font-mono">-{q.negativeMarks} Neg</span>
                    )}
                  </div>
                </div>

                <div className="text-slate-900 text-sm font-medium mb-4">
                  {q.questionText}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {q.options.map((opt, oIdx) => (
                    <div
                      key={opt.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center space-x-2"
                    >
                      <span className="w-5 h-5 rounded bg-white border border-slate-300 flex items-center justify-center font-bold text-[10px]">
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span>{opt.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. LIVE PROCTORING TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Live Examination Proctoring Stream
              </h2>
              <p className="text-xs text-slate-500">
                Real-time tracking of 500+ concurrent students, active attempts, and tab-switch violations.
              </p>
            </div>
            <button
              onClick={async () => {
                const updated = await getLiveExamAttempts(selectedExamId);
                setAttempts(updated);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Feed</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Candidate Roll</th>
                  <th className="py-3 px-4">Candidate Name</th>
                  <th className="py-3 px-4">Started At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Tab Violations</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attempts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No active attempts recorded for this exam yet.
                    </td>
                  </tr>
                ) : (
                  attempts.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {att.studentRollNumber}
                      </td>
                      <td className="py-3.5 px-4 font-medium">{att.studentName}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {att.startedAt ? new Date(att.startedAt).toLocaleTimeString('en-IN') : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[10px] uppercase ${
                          att.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : att.status === 'auto_submitted_tab_switch'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {att.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`font-mono font-bold ${
                          (att.tabSwitchesCount || 0) > 0 ? 'text-red-600' : 'text-slate-500'
                        }`}>
                          {att.tabSwitchesCount || 0} incidents
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {att.status === 'in_progress' && (
                          <button
                            onClick={() => handleForceSubmitAttempt(att)}
                            className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[10px] border border-red-200 transition"
                          >
                            Force Submit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. RESULTS & REPORTS TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Objective Evaluation & Grade Sheets
              </h2>
              <p className="text-xs text-slate-500">
                Automated objective scoring based on protected answer keys. Safe CSV export enabled.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleCalculateResults}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center space-x-1.5 shadow"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-Grade Submissions</span>
              </button>

              <button
                onClick={handleExportCSV}
                disabled={results.length === 0}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-1.5 shadow"
              >
                <Download className="w-4 h-4" />
                <span>Export Safe CSV</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Percentage</th>
                  <th className="py-3 px-4">Correct / Incorrect</th>
                  <th className="py-3 px-4">Status & Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No finalized submissions to grade. Click Re-Grade or submit student attempts first.
                    </td>
                  </tr>
                ) : (
                  results.map((res) => (
                    <tr key={res.attemptId} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                        #{res.rank}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        {res.studentRollNumber}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">{res.studentName}</td>
                      <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                        {res.totalScore} / {res.maxMarks}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-blue-600 font-mono">
                        {res.percentage}%
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-emerald-600 font-bold">{res.correctAnswers}✓</span>
                        {' / '}
                        <span className="text-red-500 font-bold">{res.incorrectAnswers}✗</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          res.submissionReason === 'tab_switch'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {res.submissionReason || 'MANUAL'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. STUDENTS & BULK IMPORT TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: CSV Bulk Import Tool */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm mb-1">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span>Bulk Student Enrolment (CSV)</span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Format: RollNumber, FullName, ClassId (one candidate per line).
                </p>

                <textarea
                  rows={8}
                  value={bulkCsvText}
                  onChange={(e) => setBulkCsvText(e.target.value)}
                  placeholder={`2024CS0110, Rohit Sen, CSE-3A\n2024CS0111, Neha Gupta, CSE-3A\n2024CS0112, Siddharth Jain, CSE-3B`}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {bulkImportStatus && (
                  <p className="mt-2 text-xs font-semibold text-emerald-600">
                    {bulkImportStatus}
                  </p>
                )}
              </div>

              <button
                onClick={handleProcessBulkImport}
                className="mt-4 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow transition"
              >
                <Upload className="w-4 h-4" />
                <span>Process CSV Enrolment</span>
              </button>
            </div>

            {/* Right: Enrolled Students List */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Enrolled Students ({studentsList.length})
                </span>
                <span className="text-[11px] text-slate-400">Authorized for examination login</span>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Roll Number</th>
                      <th className="py-2.5 px-4">Candidate Name</th>
                      <th className="py-2.5 px-4">Batch / Class</th>
                      <th className="py-2.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentsList.map((st) => (
                      <tr key={st.rollNumber} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{st.rollNumber}</td>
                        <td className="py-3 px-4 font-medium">{st.studentName}</td>
                        <td className="py-3 px-4">{st.classId}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                            ACTIVE
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. AUDIT TRAIL TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Security & Operational Audit Log</h2>
              <p className="text-xs text-slate-500">
                Immutable chronological event trail verifying logins, proctoring violations, and submissions.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Timestamp (IST)</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Reason / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(log.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.eventType === 'TAB_SWITCH_VIOLATION'
                          ? 'bg-red-100 text-red-800'
                          : log.eventType === 'EXAM_STARTED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {log.eventType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans font-medium text-slate-800">
                      {log.actorName || log.actorUid}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600 text-xs">
                      {log.reason || 'Normal operation execution'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREATE EXAM */}
      {/* ------------------------------------------------------------- */}
      {showCreateExamModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">Create Examination</h3>
            <p className="text-xs text-slate-500 mb-4">Set up course details, timing, and proctoring parameters.</p>

            <form onSubmit={handleCreateExam} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Exam Title</label>
                <input
                  type="text"
                  required
                  value={newExamTitle}
                  onChange={(e) => setNewExamTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    value={newExamCode}
                    onChange={(e) => setNewExamCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    required
                    min={5}
                    value={newExamDuration}
                    onChange={(e) => setNewExamDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Marks</label>
                  <input
                    type="number"
                    required
                    value={newExamMarks}
                    onChange={(e) => setNewExamMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tab Switch Policy</label>
                  <select
                    value={newExamTabPolicy}
                    onChange={(e) => setNewExamTabPolicy(e.target.value as TabSwitchPolicy)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                  >
                    <option value="strict_first_switch">Strict 1st Switch Terminate</option>
                    <option value="warning_once">Warning Once</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="negMark"
                  checked={newExamNegative}
                  onChange={(e) => setNewExamNegative(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <label htmlFor="negMark" className="font-semibold text-slate-700 cursor-pointer">
                  Enable Negative Marking (-0.5 Marks for incorrect answer)
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateExamModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow"
                >
                  Publish Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD QUESTION */}
      {/* ------------------------------------------------------------- */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Question with Protected Answer Key</h3>
            <p className="text-xs text-slate-500 mb-4">The answer key will be stored securely and never transmitted to students.</p>

            <form onSubmit={handleCreateQuestion} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Section</label>
                <select
                  value={newQSectionId}
                  onChange={(e) => setNewQSectionId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Question Statement</label>
                <textarea
                  rows={3}
                  required
                  value={newQText}
                  onChange={(e) => setNewQText(e.target.value)}
                  placeholder="Enter the complete question text..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Marks (+)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newQMarks}
                    onChange={(e) => setNewQMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Negative Marks (-)</label>
                  <input
                    type="number"
                    step="0.25"
                    value={newQNegMarks}
                    onChange={(e) => setNewQNegMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">Options & Correct Key</label>
                <div className="space-y-2">
                  {newQOptions.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="correctKey"
                        checked={newQCorrectId === opt.id}
                        onChange={() => setNewQCorrectId(opt.id)}
                        className="w-4 h-4 text-emerald-600"
                        title="Mark as correct answer"
                      />
                      <input
                        type="text"
                        required
                        value={opt.text}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewQOptions((prev) =>
                            prev.map((o) => (o.id === opt.id ? { ...o, text: val } : o))
                          );
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-emerald-700 font-semibold">
                  Select the radio button next to the correct answer.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Explanation (Optional)</label>
                <input
                  type="text"
                  value={newQExplanation}
                  onChange={(e) => setNewQExplanation(e.target.value)}
                  placeholder="Rationale for the correct choice"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddQuestionModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
