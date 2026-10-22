import React, { useState } from 'react';
import { 
  FileText, 
  Layers, 
  HelpCircle, 
  ShieldAlert, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Copy, 
  Code2, 
  Calculator, 
  ArrowRight, 
  ArrowLeft, 
  Save, 
  Upload, 
  Sparkles, 
  Clock, 
  Award,
  Globe,
  Share2,
  ExternalLink,
  Check,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  Exam, 
  ExamSection, 
  Question, 
  QuestionType, 
  TabSwitchPolicy 
} from '../../types/exam';
import { 
  createExam, 
  updateExam, 
  saveExamSection, 
  saveQuestionWithAnswerKey, 
  publishExamWithSnapshot 
} from '../../services/examService';

interface PaperBuilderStudioProps {
  onBackToDashboard: () => void;
  onPaperPublished: (examId: string, publicExamId: string) => void;
  existingExamToEdit?: Exam | null;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

export const PaperBuilderStudio: React.FC<PaperBuilderStudioProps> = ({
  onBackToDashboard,
  onPaperPublished,
  existingExamToEdit,
}) => {
  const { userProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [saving, setSaving] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // STEP 1: Basic Specifications
  const [examTitle, setExamTitle] = useState<string>(
    existingExamToEdit?.title || 'CS-401: Cloud Computing & Distributed Systems'
  );
  const [subject, setSubject] = useState<string>(existingExamToEdit?.subject || 'Computer Science & Engineering');
  const [courseCode, setCourseCode] = useState<string>(existingExamToEdit?.courseCode || 'CS-401');
  const [course, setCourse] = useState<string>(existingExamToEdit?.course || 'B.Tech Computer Science');
  const [department, setDepartment] = useState<string>(existingExamToEdit?.department || 'Department of Computing');
  const [semester, setSemester] = useState<string>(existingExamToEdit?.semester || '7th Semester');
  const [academicYear, setAcademicYear] = useState<string>(existingExamToEdit?.academicYear || '2026-27');
  const [collegeName, setCollegeName] = useState<string>(
    existingExamToEdit?.collegeName || 'Apex Institute of Technology & Engineering'
  );
  const [examType, setExamType] = useState<Exam['examType']>(existingExamToEdit?.examType || 'End-Semester');
  const [scheduledStart, setScheduledStart] = useState<string>(
    existingExamToEdit?.scheduledStartAt || new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(
    existingExamToEdit ? Math.round(existingExamToEdit.durationSeconds / 60) : 60
  );
  const [totalMarks, setTotalMarks] = useState<number>(existingExamToEdit?.totalMarks || 30);
  const [passingMarks, setPassingMarks] = useState<number>(existingExamToEdit?.passingMarks || 12);
  const [negativeMarking, setNegativeMarking] = useState<boolean>(existingExamToEdit?.negativeMarking ?? true);
  const [negativeRate, setNegativeRate] = useState<number>(existingExamToEdit?.negativeMarkingRate || 0.5);
  const [instructions, setInstructions] = useState<string>(
    existingExamToEdit?.instructions ||
      '1. Read all questions carefully before selecting your answers.\n2. Continuous cloud auto-save is active.\n3. Proctoring rule: Switching tabs or minimizing browser window triggers immediate auto-submission.\n4. Click Submit once finished.'
  );

  // STEP 2: Sections Builder
  const [sections, setSections] = useState<ExamSection[]>([
    {
      id: 'sec_1',
      examId: existingExamToEdit?.id || 'temp_exam',
      title: 'Section A: Architecture, Scalability & MCQs',
      instructions: 'Objective questions assessing distributed consensus and CAP theorem.',
      order: 1,
      sectionMarks: 15,
      isRequired: true,
    },
    {
      id: 'sec_2',
      examId: existingExamToEdit?.id || 'temp_exam',
      title: 'Section B: Code Analysis & Numerical Computations',
      instructions: 'Technical questions with code snippets and numerical calculations.',
      order: 2,
      sectionMarks: 15,
      isRequired: true,
    },
  ]);

  // STEP 3: Questions State
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 'q_init_1',
      examId: existingExamToEdit?.id || 'temp_exam',
      sectionId: 'sec_1',
      questionType: 'mcq_single',
      questionText: 'According to Eric Brewer’s CAP Theorem, which pair of guarantees does an Apache Cassandra cluster prioritize during network partitions?',
      options: [
        { id: 'opt_1', text: 'Consistency and Partition Tolerance (CP)' },
        { id: 'opt_2', text: 'Availability and Partition Tolerance (AP)' },
        { id: 'opt_3', text: 'Consistency and Availability without partition tolerance (CA)' },
        { id: 'opt_4', text: 'Strict Serializability with linearizability' },
      ],
      marks: 3,
      negativeMarks: 0.5,
      order: 1,
      version: 1,
      explanation: 'Cassandra adopts an AP model offering eventual consistency while remaining available during partitions.',
    },
    {
      id: 'q_init_2',
      examId: existingExamToEdit?.id || 'temp_exam',
      sectionId: 'sec_2',
      questionType: 'mcq_single',
      questionText: 'Analyze this Raft consensus heartbeat routine. Under what condition will the follower reject the AppendEntries RPC?',
      codeSnippet: {
        language: 'python',
        title: 'raft_node.py',
        code: `def handle_append_entries(self, term, leader_id, prev_log_idx, prev_log_term, entries):
    if term < self.current_term:
        return {"term": self.current_term, "success": False}
    if not self.match_log(prev_log_idx, prev_log_term):
        return {"term": self.current_term, "success": False}
    self.append_entries(entries)
    return {"term": self.current_term, "success": True}`,
      },
      options: [
        { id: 'opt_a', text: 'Only if the leader term is higher than current_term' },
        { id: 'opt_b', text: 'If term < current_term OR log entry mismatch at prev_log_idx' },
        { id: 'opt_c', text: 'Whenever entries list contains more than 10 records' },
        { id: 'opt_d', text: 'If leader_id is not already in the cluster directory' },
      ],
      marks: 4,
      negativeMarks: 1,
      order: 2,
      version: 1,
      explanation: 'Raft safety requires rejecting RPC if leader term is stale or previous log term does not match.',
    },
  ]);

  // Keys state for Step 3: questionId -> correctOptionIds & numericalAnswer
  const [answerKeys, setAnswerKeys] = useState<Record<string, { correctOptionIds: string[]; numericalAnswer?: number; numericalTolerance?: number }>>({
    q_init_1: { correctOptionIds: ['opt_2'] },
    q_init_2: { correctOptionIds: ['opt_b'] },
  });

  // Editor form for a question being added or edited
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question>>({
    questionType: 'mcq_single',
    questionText: '',
    sectionId: 'sec_1',
    marks: 3,
    negativeMarks: 0.5,
    options: [
      { id: 'opt_a', text: '' },
      { id: 'opt_b', text: '' },
      { id: 'opt_c', text: '' },
      { id: 'opt_d', text: '' },
    ],
  });
  const [editingCodeSnippet, setEditingCodeSnippet] = useState<{ enabled: boolean; language: string; title: string; code: string }>({
    enabled: false,
    language: 'python',
    title: 'snippet.py',
    code: '',
  });
  const [editingMathFormula, setEditingMathFormula] = useState<string>('');
  const [editingCorrectOptions, setEditingCorrectOptions] = useState<string[]>(['opt_a']);
  const [editingNumericalAns, setEditingNumericalAns] = useState<string>('');
  const [editingNumericalTol, setEditingNumericalTol] = useState<string>('0');
  const [editingExplanation, setEditingExplanation] = useState<string>('');
  const [showQuestionModal, setShowQuestionModal] = useState<boolean>(false);

  // STEP 4: Advanced Security & Proctoring Settings
  const [tabSwitchPolicy, setTabSwitchPolicy] = useState<TabSwitchPolicy>(
    existingExamToEdit?.tabSwitchPolicy || 'strict_first_switch'
  );
  const [allowReview, setAllowReview] = useState<boolean>(existingExamToEdit?.allowReview ?? true);
  const [allowBackwardNav, setAllowBackwardNav] = useState<boolean>(existingExamToEdit?.allowBackwardNav ?? true);
  const [warnUnanswered, setWarnUnanswered] = useState<boolean>(existingExamToEdit?.warnUnanswered ?? true);
  const [maxAttempts, setMaxAttempts] = useState<number>(existingExamToEdit?.maxAttempts || 1);
  const [customSlug, setCustomSlug] = useState<string>('');

  // STEP 2 Section handlers
  const handleAddSection = () => {
    const secId = `sec_${Date.now()}`;
    const newSec: ExamSection = {
      id: secId,
      examId: existingExamToEdit?.id || 'temp_exam',
      title: `Section ${String.fromCharCode(65 + sections.length)}: New Topic Area`,
      instructions: 'Answer all questions in this section.',
      order: sections.length + 1,
      sectionMarks: 10,
      isRequired: true,
    };
    setSections([...sections, newSec]);
  };

  const handleRemoveSection = (secId: string) => {
    if (sections.length <= 1) {
      alert('Examination must have at least one section.');
      return;
    }
    setSections(sections.filter((s) => s.id !== secId));
    setQuestions(questions.filter((q) => q.sectionId !== secId));
  };

  // STEP 3 Question handlers
  const handleOpenAddQuestion = (secId?: string) => {
    setEditingQuestion({
      id: `q_${Date.now()}`,
      examId: existingExamToEdit?.id || 'temp_exam',
      sectionId: secId || sections[0]?.id || 'sec_1',
      questionType: 'mcq_single',
      questionText: '',
      marks: 3,
      negativeMarks: negativeMarking ? negativeRate : 0,
      options: [
        { id: 'opt_a', text: '' },
        { id: 'opt_b', text: '' },
        { id: 'opt_c', text: '' },
        { id: 'opt_d', text: '' },
      ],
    });
    setEditingCodeSnippet({ enabled: false, language: 'python', title: 'code.py', code: '' });
    setEditingMathFormula('');
    setEditingCorrectOptions(['opt_a']);
    setEditingNumericalAns('');
    setEditingNumericalTol('0');
    setEditingExplanation('');
    setShowQuestionModal(true);
  };

  const handleSaveQuestionFromModal = () => {
    if (!editingQuestion.questionText?.trim()) {
      alert('Please enter question statement.');
      return;
    }

    const qId = editingQuestion.id || `q_${Date.now()}`;
    const qType = editingQuestion.questionType || 'mcq_single';

    let optionsToSave = editingQuestion.options || [];
    if (qType === 'true_false') {
      optionsToSave = [
        { id: 'opt_true', text: 'True' },
        { id: 'opt_false', text: 'False' },
      ];
    } else if (qType === 'numerical' || qType === 'short_answer') {
      optionsToSave = [];
    } else {
      optionsToSave = optionsToSave.filter((o) => o.text.trim().length > 0);
      if (optionsToSave.length < 2) {
        alert('Multiple choice questions require at least two non-empty options.');
        return;
      }
    }

    const compiledQuestion: Question = {
      id: qId,
      examId: existingExamToEdit?.id || 'temp_exam',
      sectionId: editingQuestion.sectionId || sections[0].id,
      questionType: qType,
      questionText: editingQuestion.questionText,
      options: optionsToSave,
      marks: Number(editingQuestion.marks || 3),
      negativeMarks: negativeMarking ? Number(editingQuestion.negativeMarks || 0) : 0,
      order: questions.length + 1,
      version: 1,
      codeSnippet: editingCodeSnippet.enabled && editingCodeSnippet.code.trim() ? {
        language: editingCodeSnippet.language,
        title: editingCodeSnippet.title || 'snippet',
        code: editingCodeSnippet.code,
      } : undefined,
      mathFormula: editingMathFormula.trim() || undefined,
      numericalAnswer: qType === 'numerical' && editingNumericalAns ? Number(editingNumericalAns) : undefined,
      numericalTolerance: qType === 'numerical' ? Number(editingNumericalTol || 0) : undefined,
      explanation: editingExplanation.trim() || undefined,
    };

    // Update questions array
    const existingIndex = questions.findIndex((q) => q.id === qId);
    if (existingIndex !== -1) {
      const copy = [...questions];
      copy[existingIndex] = compiledQuestion;
      setQuestions(copy);
    } else {
      setQuestions([...questions, compiledQuestion]);
    }

    // Save answer keys
    setAnswerKeys((prev) => ({
      ...prev,
      [qId]: {
        correctOptionIds: qType === 'true_false' || qType === 'mcq_single' || qType === 'mcq_multiple' ? editingCorrectOptions : [],
        numericalAnswer: qType === 'numerical' ? Number(editingNumericalAns) : undefined,
        numericalTolerance: qType === 'numerical' ? Number(editingNumericalTol || 0) : undefined,
      },
    }));

    setShowQuestionModal(false);
  };

  const handleDeleteQuestion = (qId: string) => {
    setQuestions(questions.filter((q) => q.id !== qId));
    setAnswerKeys((prev) => {
      const copy = { ...prev };
      delete copy[qId];
      return copy;
    });
  };

  const handleDuplicateQuestion = (q: Question) => {
    const newId = `q_${Date.now()}`;
    const duplicate: Question = {
      ...q,
      id: newId,
      questionText: `${q.questionText} (Copy)`,
      order: questions.length + 1,
    };
    setQuestions([...questions, duplicate]);
    if (answerKeys[q.id]) {
      setAnswerKeys((prev) => ({ ...prev, [newId]: { ...prev[q.id] } }));
    }
  };

  // STEP 5: Validation Calculation
  const totalQuestionMarksCalculated = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const totalSectionMarksCalculated = sections.reduce((sum, s) => sum + (s.sectionMarks || 0), 0);

  const validationIssues: string[] = [];
  if (!examTitle.trim()) validationIssues.push('Exam title is required.');
  if (questions.length === 0) validationIssues.push('At least one question is required.');
  if (totalQuestionMarksCalculated !== totalMarks) {
    validationIssues.push(`Sum of question marks (${totalQuestionMarksCalculated}) does not match exam Total Marks (${totalMarks}).`);
  }
  if (passingMarks > totalMarks) {
    validationIssues.push('Passing marks cannot exceed total marks.');
  }
  questions.forEach((q, idx) => {
    if (q.questionType === 'mcq_single' || q.questionType === 'true_false') {
      const keys = answerKeys[q.id]?.correctOptionIds || [];
      if (keys.length === 0) {
        validationIssues.push(`Question #${idx + 1} is missing a marked correct answer.`);
      }
    }
  });

  // Publish / Save draft
  const handleFinalPublish = async (isDraft = false) => {
    if (!userProfile) return;
    if (!isDraft && validationIssues.length > 0) {
      alert(`Cannot publish. Please resolve issues:\n\n• ${validationIssues.join('\n• ')}`);
      return;
    }

    setSaving(true);
    try {
      // 1. Create or update Exam
      let examId = existingExamToEdit?.id;
      const examData = {
        title: examTitle,
        subject,
        course,
        courseCode,
        department,
        semester,
        academicYear,
        collegeName,
        examType,
        description: `Official college examination for ${courseCode} - ${subject}.`,
        instructions,
        status: (isDraft ? 'draft' : 'published') as Exam['status'],
        scheduledStartAt: new Date(scheduledStart).toISOString(),
        durationSeconds: durationMinutes * 60,
        lateEntrySeconds: 900,
        totalMarks: Number(totalMarks),
        passingMarks: Number(passingMarks),
        negativeMarking,
        negativeMarkingRate: Number(negativeRate),
        createdBy: userProfile.uid,
        tabSwitchPolicy,
        allowReview,
        allowBackwardNav,
        warnUnanswered,
        maxAttempts: Number(maxAttempts),
      };

      if (!examId) {
        examId = await createExam(examData);
      } else {
        await updateExam(examId, examData);
      }

      // 2. Save Sections
      for (const sec of sections) {
        await saveExamSection({
          ...sec,
          examId,
        });
      }

      // 3. Save Questions & Answer Keys
      for (const q of questions) {
        const k = answerKeys[q.id] || { correctOptionIds: [] };
        await saveQuestionWithAnswerKey(
          { ...q, examId },
          k.correctOptionIds || [],
          q.explanation
        );
      }

      if (isDraft) {
        setSuccessToast('Draft saved successfully! You can resume authoring at any time.');
        setTimeout(() => setSuccessToast(null), 4000);
      } else {
        // Freeze snapshot and create published shareable link
        const { publicExamId, shareableUrl } = await publishExamWithSnapshot(
          examId,
          { uid: userProfile.uid, displayName: userProfile.displayName },
          customSlug.trim() || undefined
        );
        onPaperPublished(examId, publicExamId);
      }
    } catch (err) {
      console.error('Publish error:', err);
      alert('Error during paper compilation. Please verify connection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 mb-8 gap-4">
        <div>
          <button
            onClick={onBackToDashboard}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center space-x-1.5 mb-1 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Admin Console</span>
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Custom Paper Builder Studio
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Design multi-section curriculum papers, rich question types, and generate secure shareable exam links.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleFinalPublish(true)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center space-x-1.5"
          >
            <Save className="w-4 h-4 text-slate-500" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleFinalPublish(false)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-blue-600/25 flex items-center space-x-2 transition"
          >
            <Globe className="w-4 h-4" />
            <span>{saving ? 'Freezing Snapshot...' : 'Publish & Generate Shareable Link'}</span>
          </button>
        </div>
      </div>

      {successToast && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 5-Step Visual Wizard Stepper */}
      <div className="grid grid-cols-5 gap-2 mb-8 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        {[
          { step: 1, title: '1. Basic Info', icon: FileText },
          { step: 2, title: '2. Sections & Topics', icon: Layers },
          { step: 3, title: '3. Question Studio', icon: HelpCircle, badge: questions.length },
          { step: 4, title: '4. Security & Rules', icon: ShieldAlert },
          { step: 5, title: '5. Preview & Validate', icon: Eye, error: validationIssues.length > 0 },
        ].map((s) => {
          const Icon = s.icon;
          const isActive = currentStep === s.step;
          return (
            <button
              key={s.step}
              type="button"
              onClick={() => setCurrentStep(s.step as WizardStep)}
              className={`py-3 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 ring-1 ring-blue-500/20'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="hidden md:inline">{s.title}</span>
                <span className="md:hidden">Step {s.step}</span>
              </div>
              {s.badge !== undefined && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono">
                  {s.badge} Qs
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* STEP 1: BASIC INFORMATION */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Step 1: Examination Specifications & Calendar</h2>
            <p className="text-xs text-slate-500">Configure core metadata, academic credits, timing, and pass criteria.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Examination Paper Title</label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="e.g. CS-401: Distributed Systems End-Semester Examination"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subject / Discipline</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Computer Science & Engineering"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Course Code</label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="e.g. CS-401"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department / Branch</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Department of Computer Science"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">College / Institutional Name</label>
              <input
                type="text"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Examination Type</label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900"
              >
                <option value="End-Semester">End-Semester Final</option>
                <option value="Mid-Term">Mid-Term Assessment</option>
                <option value="Quiz">Continuous Assessment Quiz</option>
                <option value="Practical Assessment">Practical Lab Assessment</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Scheduled Start Date & Time (IST)</label>
              <input
                type="datetime-local"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Duration (Minutes)</label>
              <input
                type="number"
                min={5}
                max={360}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Total Marks</label>
              <input
                type="number"
                min={1}
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Passing Minimum Marks</label>
              <input
                type="number"
                min={0}
                value={passingMarks}
                onChange={(e) => setPassingMarks(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono"
              />
            </div>

            <div className="flex items-center space-x-3 pt-6">
              <input
                type="checkbox"
                id="negToggle"
                checked={negativeMarking}
                onChange={(e) => setNegativeMarking(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="negToggle" className="font-semibold text-slate-800 cursor-pointer">
                Enforce Negative Marking (-{negativeRate} marks on incorrect choice)
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">General Examination Instructions</label>
              <textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 leading-relaxed font-sans"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 transition"
            >
              <span>Proceed to Section Builder</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SECTIONS & STRUCTURE BUILDER */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Step 2: Paper Sections & Modular Topics</h2>
              <p className="text-xs text-slate-500">Divide paper into ordered sections with specific mark allocations.</p>
            </div>
            <button
              type="button"
              onClick={handleAddSection}
              className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs flex items-center space-x-1.5 border border-blue-200 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Section</span>
            </button>
          </div>

          <div className="space-y-4">
            {sections.map((sec, idx) => (
              <div key={sec.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Section {String.fromCharCode(65 + idx)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveSection(sec.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-white transition"
                    title="Delete section"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Section Title</label>
                    <input
                      type="text"
                      value={sec.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSections(sections.map((s) => (s.id === sec.id ? { ...s, title: val } : s)));
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Allocated Marks</label>
                    <input
                      type="number"
                      value={sec.sectionMarks}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setSections(sections.map((s) => (s.id === sec.id ? { ...s, sectionMarks: val } : s)));
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block font-semibold text-slate-700 mb-1">Section Instructions (Optional)</label>
                    <input
                      type="text"
                      value={sec.instructions || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSections(sections.map((s) => (s.id === sec.id ? { ...s, instructions: val } : s)));
                      }}
                      placeholder="e.g. Answer all technical questions. Formula sheet provided."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800 text-xs font-semibold"
            >
              Back to Basic Info
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 transition"
            >
              <span>Proceed to Question Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: QUESTION CREATION STUDIO */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Step 3: Question Creation Studio</h2>
              <p className="text-xs text-slate-500">
                Author Single MCQs, Multi-Select, True/False, Code Snippet problems, and Numericals.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleOpenAddQuestion()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Question</span>
              </button>
            </div>
          </div>

          {/* Questions Roster grouped by section */}
          <div className="space-y-6">
            {sections.map((sec, secIdx) => {
              const secQuestions = questions.filter((q) => q.sectionId === sec.id);
              return (
                <div key={sec.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                      Section {String.fromCharCode(65 + secIdx)}: {sec.title} ({secQuestions.length} Questions)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenAddQuestion(sec.id)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to this section</span>
                    </button>
                  </div>

                  <div className="p-4 space-y-3">
                    {secQuestions.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No questions in this section yet. Click 'Add to this section' above.
                      </div>
                    ) : (
                      secQuestions.map((q, qIdx) => (
                        <div
                          key={q.id}
                          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-3"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start space-x-3">
                              <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                {qIdx + 1}
                              </span>
                              <div>
                                <div className="text-xs font-semibold text-slate-900 leading-relaxed">
                                  {q.questionText}
                                </div>
                                <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-1 font-mono">
                                  <span className="uppercase text-blue-600 font-bold">{q.questionType.replace('_', ' ')}</span>
                                  <span>•</span>
                                  <span>+{q.marks} Marks</span>
                                  {q.negativeMarks > 0 && <span>(-{q.negativeMarks} Neg)</span>}
                                  {q.codeSnippet && <span className="text-purple-600">• Has Code Block</span>}
                                  {q.mathFormula && <span className="text-emerald-600">• Math Formula</span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleDuplicateQuestion(q)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                                title="Duplicate question"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                title="Delete question"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Code Preview if present */}
                          {q.codeSnippet && (
                            <div className="bg-slate-950 text-slate-200 p-3 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800">
                              <div className="text-[10px] text-slate-500 mb-1 uppercase font-bold">
                                {q.codeSnippet.language} — {q.codeSnippet.title}
                              </div>
                              <pre className="text-[11px] leading-relaxed">{q.codeSnippet.code}</pre>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800 text-xs font-semibold"
            >
              Back to Sections
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 transition"
            >
              <span>Proceed to Security Settings</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: ADVANCED SECURITY & PROCTORING */}
      {currentStep === 4 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Step 4: Proctoring & Examination Security Policies</h2>
            <p className="text-xs text-slate-500">Configure anti-cheating tab-switch triggers, navigation restrictions, and shareable slugs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <span>Strict Tab-Switch Auto-Submission</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                When student changes tabs, opens another application, or minimizes their browser window.
              </p>
              <select
                value={tabSwitchPolicy}
                onChange={(e) => setTabSwitchPolicy(e.target.value as TabSwitchPolicy)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-semibold"
              >
                <option value="strict_first_switch">Strict: First tab switch auto-submits exam</option>
                <option value="warning_once">Warning once: First switch warns, second auto-submits</option>
                <option value="disabled">Disabled: Proctoring flag logged without auto-submission</option>
              </select>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>Custom Shareable URL Slug (Optional)</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                Specify a friendly URL identifier for your paper link, or leave blank to auto-generate.
              </p>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-slate-400">/exam/</span>
                <input
                  type="text"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                  placeholder="e.g. cs401-final-2026"
                  className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="space-y-3 p-5 rounded-2xl border border-slate-200 bg-slate-50 md:col-span-2">
              <span className="font-bold text-slate-900 text-sm block">Navigation & Answer Controls</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center space-x-3 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowBackwardNav}
                    onChange={(e) => setAllowBackwardNav(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <div className="font-bold text-slate-800">Permit Backward Navigation</div>
                    <div className="text-[11px] text-slate-500">Allow returning to previously viewed questions</div>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowReview}
                    onChange={(e) => setAllowReview(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <div className="font-bold text-slate-800">Allow "Mark for Review"</div>
                    <div className="text-[11px] text-slate-500">Enables review flag tag on the question palette</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800 text-xs font-semibold"
            >
              Back to Questions
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 transition"
            >
              <span>Review Paper Preview & Validate</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: PREVIEW, VALIDATION & PUBLISH */}
      {currentStep === 5 && (
        <div className="space-y-6">
          {/* Validation Banner */}
          <div className={`p-6 rounded-2xl border ${
            validationIssues.length === 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 font-bold text-sm">
                {validationIssues.length === 0 ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Examination Paper Fully Validated & Ready for Publishing</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span>Validation Items Requiring Attention</span>
                  </>
                )}
              </div>

              <div className="text-xs font-mono font-bold">
                Total Score: {totalQuestionMarksCalculated} / {totalMarks} Marks
              </div>
            </div>

            {validationIssues.length > 0 ? (
              <ul className="text-xs space-y-1 list-disc list-inside mt-2">
                {validationIssues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-emerald-800 mt-1">
                All objective questions have verified answer keys, sections match total marks, and proctoring parameters are locked.
              </p>
            )}
          </div>

          {/* Student-View Interactive Paper Preview */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8 space-y-8">
            <div className="border-b border-slate-200 pb-6 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
                {collegeName}
              </span>
              <h2 className="text-2xl font-black text-slate-900">{examTitle}</h2>
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 mt-2 font-mono">
                <span>Course: {courseCode}</span>
                <span>•</span>
                <span>Duration: {durationMinutes} Minutes</span>
                <span>•</span>
                <span>Total Marks: {totalMarks}</span>
                <span>•</span>
                <span>Passing: {passingMarks}</span>
              </div>
            </div>

            {/* Questions list preview */}
            <div className="space-y-6">
              {sections.map((sec, sIdx) => {
                const sQuestions = questions.filter((q) => q.sectionId === sec.id);
                return (
                  <div key={sec.id} className="space-y-4">
                    <div className="bg-slate-100 p-3 rounded-xl font-bold text-xs text-slate-800 uppercase tracking-wider flex justify-between">
                      <span>Section {String.fromCharCode(65 + sIdx)}: {sec.title}</span>
                      <span>{sec.sectionMarks} Marks</span>
                    </div>

                    <div className="space-y-4">
                      {sQuestions.map((q, qIdx) => (
                        <div key={q.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-slate-900">
                              Q{qIdx + 1}. {q.questionText}
                            </span>
                            <span className="text-xs font-mono font-bold text-blue-600 shrink-0 ml-2">
                              +{q.marks} M
                            </span>
                          </div>

                          {q.codeSnippet && (
                            <div className="bg-slate-950 text-slate-200 p-3 rounded-xl font-mono text-xs border border-slate-800">
                              <pre className="text-[11px] leading-relaxed">{q.codeSnippet.code}</pre>
                            </div>
                          )}

                          {q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {q.options.map((opt, oIdx) => {
                                const isCorrect = answerKeys[q.id]?.correctOptionIds?.includes(opt.id);
                                return (
                                  <div
                                    key={opt.id}
                                    className={`p-2.5 rounded-xl border flex items-center space-x-2 ${
                                      isCorrect
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                                        : 'bg-white border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    <span className="font-bold font-mono text-[11px]">
                                      {String.fromCharCode(65 + oIdx)}.
                                    </span>
                                    <span>{opt.text}</span>
                                    {isCorrect && (
                                      <span className="ml-auto text-[10px] text-emerald-700 font-bold uppercase">
                                        (Key)
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {q.questionType === 'numerical' && (
                            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-600">
                              Numerical Input Expected. Correct Key: <strong>{answerKeys[q.id]?.numericalAnswer}</strong> (Tol: ±{answerKeys[q.id]?.numericalTolerance || 0})
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800 text-xs font-semibold"
              >
                Back to Security Settings
              </button>

              <button
                type="button"
                disabled={saving || validationIssues.length > 0}
                onClick={() => handleFinalPublish(false)}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs shadow-xl shadow-blue-600/30 flex items-center space-x-2 transition"
              >
                <Globe className="w-4 h-4" />
                <span>Publish Paper & Create Shareable Link</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUESTION BUILDER MODAL */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Question Authoring Canvas</h3>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Section</label>
                  <select
                    value={editingQuestion.sectionId}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, sectionId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900"
                  >
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Question Type</label>
                  <select
                    value={editingQuestion.questionType}
                    onChange={(e) => {
                      const t = e.target.value as QuestionType;
                      setEditingQuestion({ ...editingQuestion, questionType: t });
                      if (t === 'true_false') {
                        setEditingCorrectOptions(['opt_true']);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold"
                  >
                    <option value="mcq_single">Single-Correct MCQ</option>
                    <option value="mcq_multiple">Multi-Select MCQ</option>
                    <option value="true_false">True / False</option>
                    <option value="numerical">Numerical Value</option>
                    <option value="short_answer">Short Answer / Descriptive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Question Statement</label>
                <textarea
                  rows={3}
                  value={editingQuestion.questionText}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, questionText: e.target.value })}
                  placeholder="Type the full question prompt here..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 leading-relaxed font-sans"
                />
              </div>

              {/* Code Snippet Inclusion */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingCodeSnippet.enabled}
                      onChange={(e) => setEditingCodeSnippet({ ...editingCodeSnippet, enabled: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <Code2 className="w-4 h-4 text-purple-600" />
                    <span>Include Code Snippet / Programming Problem</span>
                  </label>

                  {editingCodeSnippet.enabled && (
                    <select
                      value={editingCodeSnippet.language}
                      onChange={(e) => setEditingCodeSnippet({ ...editingCodeSnippet, language: e.target.value })}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-mono"
                    >
                      <option value="python">Python</option>
                      <option value="javascript">JavaScript / TypeScript</option>
                      <option value="cpp">C++</option>
                      <option value="java">Java</option>
                      <option value="sql">SQL</option>
                      <option value="rust">Rust</option>
                    </select>
                  )}
                </div>

                {editingCodeSnippet.enabled && (
                  <textarea
                    rows={4}
                    value={editingCodeSnippet.code}
                    onChange={(e) => setEditingCodeSnippet({ ...editingCodeSnippet, code: e.target.value })}
                    placeholder={`# Paste source code to analyze\ndef solution(input):\n    return input`}
                    className="w-full p-3 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs border border-slate-800"
                  />
                )}
              </div>

              {/* Options for MCQ */}
              {(editingQuestion.questionType === 'mcq_single' || editingQuestion.questionType === 'mcq_multiple') && (
                <div className="space-y-2">
                  <label className="block font-semibold text-slate-700">Options & Correct Answer Key</label>
                  {editingQuestion.options?.map((opt, idx) => {
                    const isSelected = editingCorrectOptions.includes(opt.id);
                    return (
                      <div key={opt.id} className="flex items-center space-x-2">
                        <input
                          type={editingQuestion.questionType === 'mcq_single' ? 'radio' : 'checkbox'}
                          name="correctKeyRadio"
                          checked={isSelected}
                          onChange={() => {
                            if (editingQuestion.questionType === 'mcq_single') {
                              setEditingCorrectOptions([opt.id]);
                            } else {
                              if (isSelected) {
                                setEditingCorrectOptions(editingCorrectOptions.filter((id) => id !== opt.id));
                              } else {
                                setEditingCorrectOptions([...editingCorrectOptions, opt.id]);
                              }
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                          title="Mark as correct answer"
                        />
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditingQuestion({
                              ...editingQuestion,
                              options: editingQuestion.options?.map((o) => (o.id === opt.id ? { ...o, text: val } : o)),
                            });
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                        />
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-emerald-700 font-semibold">
                    Select the checkmark or radio button next to the option that represents the correct answer.
                  </p>
                </div>
              )}

              {/* Numerical Answer Fields */}
              {editingQuestion.questionType === 'numerical' && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Target Numerical Value</label>
                    <input
                      type="number"
                      step="any"
                      value={editingNumericalAns}
                      onChange={(e) => setEditingNumericalAns(e.target.value)}
                      placeholder="e.g. 15 or 3.1415"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Allowed Tolerance (±)</label>
                    <input
                      type="number"
                      step="any"
                      value={editingNumericalTol}
                      onChange={(e) => setEditingNumericalTol(e.target.value)}
                      placeholder="e.g. 0.05"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Marks & Negatives */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Award Marks (+)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingQuestion.marks}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, marks: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Negative Marks (-)</label>
                  <input
                    type="number"
                    step="0.25"
                    value={editingQuestion.negativeMarks}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, negativeMarks: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Explanation / Solution Rubric (Protected)</label>
                <input
                  type="text"
                  value={editingExplanation}
                  onChange={(e) => setEditingExplanation(e.target.value)}
                  placeholder="Detailed rationale for the correct response..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuestionFromModal}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow"
                >
                  Save Question to Paper
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
