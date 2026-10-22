import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Exam,
  ExamSection,
  Question,
  ExamAnswerKey,
  ExamAssignment,
  Attempt,
  AttemptAnswer,
  AuditLogEntry,
  AuditEventType,
  ExamResultSummary,
  UserProfile,
  AttemptStatus,
  SubmissionReason,
  PublishedExamLink,
  ExamVersionSnapshot,
} from '../types/exam';

// Local storage keys for resilient offline / demo testing fallback
const LS_EXAMS = 'academia_exams';
const LS_SECTIONS = 'academia_sections';
const LS_QUESTIONS = 'academia_questions';
const LS_KEYS = 'academia_answer_keys';
const LS_ATTEMPTS = 'academia_attempts';
const LS_ANSWERS = 'academia_answers';
const LS_LOGS = 'academia_audit_logs';
const LS_LINKS = 'academia_published_links';
const LS_SNAPSHOTS = 'academia_version_snapshots';

function getLocalItem<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota
  }
}

// -------------------------------------------------------------
// DEFAULT PRE-SEEDED EXAM DATA FOR INSTANT PREVIEW & EVALUATION
// -------------------------------------------------------------

const DEFAULT_EXAM_ID = 'exam_cs302_endsem';
const DEFAULT_PUBLIC_SLUG = 'cs302-endsem-2026';

const DEFAULT_EXAM: Exam = {
  id: DEFAULT_EXAM_ID,
  title: 'CS-302: Design and Analysis of Algorithms (End-Semester)',
  subject: 'Computer Science & Engineering',
  course: 'B.Tech Computer Science',
  department: 'Department of Computer Engineering',
  semester: '6th Semester',
  academicYear: '2026-27',
  collegeName: 'Apex Institute of Technology & Engineering',
  examType: 'End-Semester',
  description: 'Comprehensive college end-semester exam covering Divide and Conquer, Dynamic Programming, Greedy Algorithms, Code Analysis, and NP-Completeness.',
  instructions: '1. Duration: 60 Minutes. Total Questions: 10. Total Marks: 30.\n2. Negative Marking: -0.5 marks for wrong objective answers.\n3. STRICT PROCTORING: Any tab-switch or minimizing window will instantly lock your exam and auto-submit your attempt.\n4. Ensure steady internet connectivity. Answers are auto-saved continuously.\n5. Click Submit once completed.',
  status: 'published',
  scheduledStartAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  durationSeconds: 3600,
  lateEntrySeconds: 900,
  totalMarks: 30,
  passingMarks: 12,
  negativeMarking: true,
  negativeMarkingRate: 0.5,
  examVersion: 1,
  publishedVersion: 1,
  createdBy: 'admin_prof_sharma',
  createdAt: new Date().toISOString(),
  publishedAt: new Date().toISOString(),
  tabSwitchPolicy: 'strict_first_switch',
  allowReview: true,
  allowBackwardNav: true,
  warnUnanswered: true,
  maxAttempts: 1,
  courseCode: 'CS-302',
  sectionIds: ['sec_part_a', 'sec_part_b'],
  publicExamId: DEFAULT_PUBLIC_SLUG,
  shareableUrl: typeof window !== 'undefined' ? `${window.location.origin}/?exam=${DEFAULT_PUBLIC_SLUG}` : '',
  isLinkActive: true,
};

const DEFAULT_SECTIONS: ExamSection[] = [
  {
    id: 'sec_part_a',
    examId: DEFAULT_EXAM_ID,
    title: 'Section A: Algorithm Complexity & Code Analysis',
    instructions: 'Answer all questions in this section. Negative marking applies.',
    order: 1,
    sectionMarks: 15,
    isRequired: true,
  },
  {
    id: 'sec_part_b',
    examId: DEFAULT_EXAM_ID,
    title: 'Section B: Dynamic Programming, Graph Theory & Numericals',
    instructions: 'Technical numerical and algorithmic questions.',
    order: 2,
    sectionMarks: 15,
    isRequired: true,
  },
];

const DEFAULT_QUESTIONS: Question[] = [
  {
    id: 'q1',
    examId: DEFAULT_EXAM_ID,
    sectionId: 'sec_part_a',
    questionType: 'mcq_single',
    questionText: 'What is the tight asymptotic time complexity bound for the recurrence T(n) = 2T(n/2) + O(n)?',
    options: [
      { id: 'opt_a', text: 'O(n)' },
      { id: 'opt_b', text: 'O(n log n)' },
      { id: 'opt_c', text: 'O(n^2)' },
      { id: 'opt_d', text: 'O(log n)' },
    ],
    marks: 3,
    negativeMarks: 0.5,
    order: 1,
    version: 1,
    mathFormula: 'T(n) = 2T(n/2) + \\Theta(n)',
    explanation: 'By the Master Theorem (Case 2), log_2(2) = 1, so T(n) = Θ(n log n).',
  },
  {
    id: 'q2',
    examId: DEFAULT_EXAM_ID,
    sectionId: 'sec_part_a',
    questionType: 'mcq_single',
    questionText: 'Analyze the following Python implementation of Binary Search. What is returned when target is not in arr?',
    codeSnippet: {
      language: 'python',
      title: 'binary_search.py',
      code: `def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1`,
    },
    options: [
      { id: 'opt_a', text: 'Index 0' },
      { id: 'opt_b', text: 'Returns -1' },
      { id: 'opt_c', text: 'Throws IndexError' },
      { id: 'opt_d', text: 'None' },
    ],
    marks: 3,
    negativeMarks: 0.5,
    order: 2,
    version: 1,
    explanation: 'When target is not found and low exceeds high, the function exits the loop and returns -1.',
  },
  {
    id: 'q3',
    examId: DEFAULT_EXAM_ID,
    sectionId: 'sec_part_a',
    questionType: 'mcq_multiple',
    questionText: 'Which of the following problems belong to the NP-Complete complexity class? (Select all that apply)',
    options: [
      { id: 'opt_a', text: '3-SAT (Boolean Satisfiability)' },
      { id: 'opt_b', text: 'Traveling Salesperson Problem (Decision version)' },
      { id: 'opt_c', text: 'Shortest Path with non-negative weights' },
      { id: 'opt_d', text: 'Vertex Cover Problem' },
    ],
    marks: 3,
    negativeMarks: 0.5,
    order: 3,
    version: 1,
    explanation: '3-SAT, TSP (decision), and Vertex Cover are all NP-complete; Shortest path is solvable in polynomial time.',
  },
  {
    id: 'q4',
    examId: DEFAULT_EXAM_ID,
    sectionId: 'sec_part_a',
    questionType: 'true_false',
    questionText: 'Every Directed Acyclic Graph (DAG) possesses at least one valid topological ordering.',
    options: [
      { id: 'opt_true', text: 'True' },
      { id: 'opt_false', text: 'False' },
    ],
    marks: 3,
    negativeMarks: 0.5,
    order: 4,
    version: 1,
    explanation: 'A topological sort is guaranteed to exist for any finite directed graph without directed cycles (DAG).',
  },
  {
    id: 'q5',
    examId: DEFAULT_EXAM_ID,
    sectionId: 'sec_part_a',
    questionType: 'mcq_single',
    questionText: 'What is the optimal substructure formulation of the 0/1 Knapsack Problem?',
    options: [
      { id: 'opt_a', text: 'DP[i][w] = max(DP[i-1][w], DP[i-1][w - wt[i]] + val[i])' },
      { id: 'opt_b', text: 'Local greedy choice always guarantees global optimum' },
      { id: 'opt_c', text: 'Fractional item portions can be recursively sub-divided' },
      { id: 'opt_d', text: 'DP[i][w] = min(DP[i][w-1], val[i])' },
    ],
    marks: 3,
    negativeMarks: 0.5,
    order: 5,
    version: 1,
  },
  {
    id: 'q6',
    examId: DEFAULT_EXAM_ID,
    sectionId: 'sec_part_b',
    questionType: 'mcq_single',
    questionText: 'In the Floyd-Warshall all-pairs shortest paths algorithm, what is the asymptotic runtime complexity?',
    options: [
      { id: 'opt_a', text: 'O(V^3)' },
      { id: 'opt_b', text: 'O(V^2 log V)' },
      { id: 'opt_c', text: 'O(VE)' },
      { id: 'opt_d', text: 'O(V!)' },
    ],
    marks: 3,
    negativeMarks: 0.5,
    order: 6,
    version: 1,
  },
  {
    id: 'q7',
    examId: DEFAULT_EXAM_ID,
    sectionId: 'sec_part_b',
    questionType: 'numerical',
    questionText: 'In a complete undirected graph K_6 with 6 vertices, calculate the exact number of edges.',
    options: [],
    marks: 3,
    negativeMarks: 0,
    order: 7,
    version: 1,
    numericalAnswer: 15,
    numericalTolerance: 0,
    mathFormula: 'E = \\frac{n(n-1)}{2} = \\frac{6 \\times 5}{2} = 15',
    explanation: 'A complete graph K_n has n(n-1)/2 edges. For n=6, 6*5/2 = 15.',
  },
  {
    id: 'q8',
    examId: DEFAULT_EXAM_ID,
    sectionId: 'sec_part_b',
    questionType: 'mcq_single',
    questionText: 'Which graph traversal technique can detect negative-weight cycles in a directed graph?',
    options: [
      { id: 'opt_a', text: 'Breadth First Search (BFS)' },
      { id: 'opt_b', text: 'Bellman-Ford Algorithm' },
      { id: 'opt_c', text: 'Kosaraju Strongly Connected Components' },
      { id: 'opt_d', text: 'Tarjan’s Bridge Finding' },
    ],
    marks: 3,
    negativeMarks: 0.5,
    order: 8,
    version: 1,
  },
  {
    id: 'q9',
    examId: DEFAULT_EXAM_ID,
    sectionId: 'sec_part_b',
    questionType: 'mcq_single',
    questionText: 'In Huffman coding, what type of tree is constructed to minimize expected weighted path length?',
    options: [
      { id: 'opt_a', text: 'Binary Search Tree' },
      { id: 'opt_b', text: 'Full Binary Prefix-Free Tree' },
      { id: 'opt_c', text: 'B-Tree with minimum degree 2' },
      { id: 'opt_d', text: 'Red-Black Balancing Tree' },
    ],
    marks: 3,
    negativeMarks: 0.5,
    order: 9,
    version: 1,
  },
  {
    id: 'q10',
    examId: DEFAULT_EXAM_ID,
    sectionId: 'sec_part_b',
    questionType: 'numerical',
    questionText: 'What is the height of a full binary tree with 15 nodes? (Root node at height 0)',
    options: [],
    marks: 3,
    negativeMarks: 0,
    order: 10,
    version: 1,
    numericalAnswer: 3,
    numericalTolerance: 0,
    mathFormula: 'h = \\log_2(n+1) - 1 = \\log_2(16) - 1 = 3',
    explanation: 'For n = 15, nodes = 2^(h+1) - 1 -> 16 = 2^(h+1) -> h+1 = 4 -> h = 3.',
  },
];

const DEFAULT_KEY: ExamAnswerKey = {
  examId: DEFAULT_EXAM_ID,
  questions: {
    q1: { questionId: 'q1', correctOptionIds: ['opt_b'], marks: 3, negativeMarks: 0.5 },
    q2: { questionId: 'q2', correctOptionIds: ['opt_b'], marks: 3, negativeMarks: 0.5 },
    q3: { questionId: 'q3', correctOptionIds: ['opt_a', 'opt_b', 'opt_d'], marks: 3, negativeMarks: 0.5 },
    q4: { questionId: 'q4', correctOptionIds: ['opt_true'], marks: 3, negativeMarks: 0.5 },
    q5: { questionId: 'q5', correctOptionIds: ['opt_a'], marks: 3, negativeMarks: 0.5 },
    q6: { questionId: 'q6', correctOptionIds: ['opt_a'], marks: 3, negativeMarks: 0.5 },
    q7: { questionId: 'q7', correctOptionIds: [], numericalAnswer: 15, numericalTolerance: 0, marks: 3, negativeMarks: 0 },
    q8: { questionId: 'q8', correctOptionIds: ['opt_b'], marks: 3, negativeMarks: 0.5 },
    q9: { questionId: 'q9', correctOptionIds: ['opt_b'], marks: 3, negativeMarks: 0.5 },
    q10: { questionId: 'q10', correctOptionIds: [], numericalAnswer: 3, numericalTolerance: 0, marks: 3, negativeMarks: 0 },
  },
  updatedAt: new Date().toISOString(),
};

const DEFAULT_LINK: PublishedExamLink = {
  publicExamId: DEFAULT_PUBLIC_SLUG,
  examId: DEFAULT_EXAM_ID,
  versionId: `${DEFAULT_EXAM_ID}_v1`,
  status: 'active',
  title: DEFAULT_EXAM.title,
  subject: DEFAULT_EXAM.subject || 'Computer Science',
  courseCode: DEFAULT_EXAM.courseCode,
  collegeName: DEFAULT_EXAM.collegeName,
  scheduledStartAt: DEFAULT_EXAM.scheduledStartAt,
  durationMinutes: 60,
  totalMarks: 30,
  passingMarks: 12,
  negativeMarking: true,
  createdAt: new Date().toISOString(),
  createdBy: 'admin_prof_sharma',
  accessCount: 14,
};

// Ensure default fallback is populated
function ensureInitializedFallback() {
  const existingExams = getLocalItem<Exam[]>(LS_EXAMS, []);
  if (existingExams.length === 0) {
    setLocalItem<Exam[]>(LS_EXAMS, [DEFAULT_EXAM]);
    setLocalItem<Record<string, ExamSection[]>>(LS_SECTIONS, { [DEFAULT_EXAM_ID]: DEFAULT_SECTIONS });
    setLocalItem<Record<string, Question[]>>(LS_QUESTIONS, { [DEFAULT_EXAM_ID]: DEFAULT_QUESTIONS });
    setLocalItem<Record<string, ExamAnswerKey>>(LS_KEYS, { [DEFAULT_EXAM_ID]: DEFAULT_KEY });
  }

  const existingLinks = getLocalItem<PublishedExamLink[]>(LS_LINKS, []);
  if (existingLinks.length === 0) {
    setLocalItem<PublishedExamLink[]>(LS_LINKS, [DEFAULT_LINK]);
  }
}
ensureInitializedFallback();

// -------------------------------------------------------------
// AUDIT LOGGING HELPER
// -------------------------------------------------------------

export async function logAuditEvent(
  actorUid: string,
  actorRole: 'admin' | 'student',
  actorName: string,
  eventType: AuditEventType,
  details: {
    examId?: string;
    attemptId?: string;
    reason?: string;
    safeMetadata?: Record<string, unknown>;
  }
): Promise<void> {
  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const entry: AuditLogEntry = {
    id: logId,
    actorUid,
    actorRole,
    actorName,
    eventType,
    examId: details.examId,
    attemptId: details.attemptId,
    reason: details.reason,
    safeMetadata: details.safeMetadata,
    timestamp: new Date().toISOString(),
  };

  const logs = getLocalItem<AuditLogEntry[]>(LS_LOGS, []);
  logs.unshift(entry);
  setLocalItem(LS_LOGS, logs.slice(0, 200));

  try {
    await setDoc(doc(db, 'auditLogs', logId), entry);
  } catch (error) {
    // Non-fatal
  }
}

// -------------------------------------------------------------
// EXAM OPERATIONS
// -------------------------------------------------------------

export async function getAllExams(): Promise<Exam[]> {
  try {
    const snap = await getDocs(collection(db, 'exams'));
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as Exam);
      setLocalItem(LS_EXAMS, list);
      return list;
    }
  } catch (err) {
    // Fall back to local storage
  }
  return getLocalItem<Exam[]>(LS_EXAMS, [DEFAULT_EXAM]);
}

export async function getExamById(examId: string): Promise<Exam | null> {
  try {
    const snap = await getDoc(doc(db, 'exams', examId));
    if (snap.exists()) return snap.data() as Exam;
  } catch (err) {
    // Fall back
  }
  const exams = getLocalItem<Exam[]>(LS_EXAMS, [DEFAULT_EXAM]);
  return exams.find((e) => e.id === examId) || null;
}

export async function createExam(examData: Omit<Exam, 'id' | 'createdAt' | 'examVersion'>): Promise<string> {
  const examId = `exam_${Date.now()}`;
  const newExam: Exam = {
    ...examData,
    id: examId,
    examVersion: 1,
    createdAt: new Date().toISOString(),
  };

  const list = getLocalItem<Exam[]>(LS_EXAMS, [DEFAULT_EXAM]);
  list.unshift(newExam);
  setLocalItem(LS_EXAMS, list);

  try {
    await setDoc(doc(db, 'exams', examId), newExam);
  } catch (err) {
    console.warn('Exam saved locally (Firestore sync pending auth):', err);
  }

  return examId;
}

export async function updateExam(examId: string, updates: Partial<Exam>): Promise<void> {
  const list = getLocalItem<Exam[]>(LS_EXAMS, [DEFAULT_EXAM]);
  const idx = list.findIndex((e) => e.id === examId);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updates, examVersion: (list[idx].examVersion || 1) + 1 };
    setLocalItem(LS_EXAMS, list);
  }

  try {
    await updateDoc(doc(db, 'exams', examId), {
      ...updates,
      examVersion: (updates.examVersion || 1) + 1,
    });
  } catch (err) {
    // Local update done
  }
}

export async function deleteExam(examId: string): Promise<void> {
  const list = getLocalItem<Exam[]>(LS_EXAMS, []);
  const filtered = list.filter((e) => e.id !== examId);
  setLocalItem(LS_EXAMS, filtered);

  try {
    await deleteDoc(doc(db, 'exams', examId));
  } catch (err) {
    // Handled in local
  }
}

export async function duplicateExam(examId: string): Promise<string> {
  const original = await getExamById(examId);
  if (!original) throw new Error('Exam not found');

  const newId = `exam_${Date.now()}`;
  const duplicated: Exam = {
    ...original,
    id: newId,
    title: `${original.title} (Copy)`,
    status: 'draft',
    examVersion: 1,
    publishedVersion: undefined,
    publicExamId: undefined,
    shareableUrl: undefined,
    isLinkActive: false,
    createdAt: new Date().toISOString(),
  };

  const exams = getLocalItem<Exam[]>(LS_EXAMS, []);
  exams.unshift(duplicated);
  setLocalItem(LS_EXAMS, exams);

  // Duplicate sections
  const secs = await getExamSections(examId);
  const newSecs = secs.map((s, idx) => ({
    ...s,
    id: `sec_${newId}_${idx + 1}`,
    examId: newId,
  }));
  const secMap = getLocalItem<Record<string, ExamSection[]>>(LS_SECTIONS, {});
  secMap[newId] = newSecs;
  setLocalItem(LS_SECTIONS, secMap);

  // Duplicate questions
  const qs = await getAuthorizedExamQuestions(examId);
  const newQs = qs.map((q, idx) => ({
    ...q,
    id: `q_${newId}_${idx + 1}`,
    examId: newId,
    sectionId: newSecs[0]?.id || `sec_${newId}_1`,
  }));
  const qMap = getLocalItem<Record<string, Question[]>>(LS_QUESTIONS, {});
  qMap[newId] = newQs;
  setLocalItem(LS_QUESTIONS, qMap);

  return newId;
}

// -------------------------------------------------------------
// SECTIONS & QUESTIONS
// -------------------------------------------------------------

export async function getExamSections(examId: string): Promise<ExamSection[]> {
  try {
    const snap = await getDocs(collection(db, 'exams', examId, 'sections'));
    if (!snap.empty) {
      const secs = snap.docs.map((d) => d.data() as ExamSection);
      return secs.sort((a, b) => a.order - b.order);
    }
  } catch (err) {
    // Fall back
  }
  const map = getLocalItem<Record<string, ExamSection[]>>(LS_SECTIONS, { [DEFAULT_EXAM_ID]: DEFAULT_SECTIONS });
  return (map[examId] || DEFAULT_SECTIONS).sort((a, b) => a.order - b.order);
}

export async function saveExamSection(section: ExamSection): Promise<void> {
  const map = getLocalItem<Record<string, ExamSection[]>>(LS_SECTIONS, {});
  const list = map[section.examId] || [];
  const idx = list.findIndex((s) => s.id === section.id);
  if (idx !== -1) {
    list[idx] = section;
  } else {
    list.push(section);
  }
  map[section.examId] = list;
  setLocalItem(LS_SECTIONS, map);

  try {
    await setDoc(doc(db, 'exams', section.examId, 'sections', section.id), section, { merge: true });
  } catch (err) {
    // Handled in local
  }
}

export async function deleteExamSection(examId: string, sectionId: string): Promise<void> {
  const map = getLocalItem<Record<string, ExamSection[]>>(LS_SECTIONS, {});
  if (map[examId]) {
    map[examId] = map[examId].filter((s) => s.id !== sectionId);
    setLocalItem(LS_SECTIONS, map);
  }
  try {
    await deleteDoc(doc(db, 'exams', examId, 'sections', sectionId));
  } catch (e) {
    // Handled in local
  }
}

export async function getAuthorizedExamQuestions(examId: string): Promise<Question[]> {
  try {
    const snap = await getDocs(collection(db, 'exams', examId, 'questions'));
    if (!snap.empty) {
      const qs = snap.docs.map((d) => {
        const data = d.data() as Question;
        return {
          id: data.id,
          examId: data.examId,
          sectionId: data.sectionId,
          questionType: data.questionType,
          questionText: data.questionText,
          options: data.options || [],
          marks: data.marks,
          negativeMarks: data.negativeMarks || 0,
          order: data.order,
          version: data.version || 1,
          codeSnippet: data.codeSnippet,
          mathFormula: data.mathFormula,
          numericalAnswer: undefined, // Hide correct answer from students
          numericalTolerance: undefined,
          imageUrl: data.imageUrl,
        };
      });
      return qs.sort((a, b) => a.order - b.order);
    }
  } catch (err) {
    // Fall back
  }
  const map = getLocalItem<Record<string, Question[]>>(LS_QUESTIONS, { [DEFAULT_EXAM_ID]: DEFAULT_QUESTIONS });
  const rawList = map[examId] || DEFAULT_QUESTIONS;
  return rawList.map((q) => ({
    ...q,
    numericalAnswer: undefined,
    numericalTolerance: undefined,
  })).sort((a, b) => a.order - b.order);
}

export async function saveQuestionWithAnswerKey(
  question: Question,
  correctOptionIds: string[],
  explanation?: string
): Promise<void> {
  const qMap = getLocalItem<Record<string, Question[]>>(LS_QUESTIONS, {});
  const qList = qMap[question.examId] || [];
  const qIdx = qList.findIndex((q) => q.id === question.id);
  if (qIdx !== -1) {
    qList[qIdx] = question;
  } else {
    qList.push(question);
  }
  qMap[question.examId] = qList;
  setLocalItem(LS_QUESTIONS, qMap);

  const keyMap = getLocalItem<Record<string, ExamAnswerKey>>(LS_KEYS, {});
  const existingKey = keyMap[question.examId] || { examId: question.examId, questions: {}, updatedAt: '' };
  existingKey.questions[question.id] = {
    questionId: question.id,
    correctOptionIds,
    marks: question.marks,
    negativeMarks: question.negativeMarks || 0,
    numericalAnswer: question.numericalAnswer,
    numericalTolerance: question.numericalTolerance || 0,
    explanation,
  };
  existingKey.updatedAt = new Date().toISOString();
  keyMap[question.examId] = existingKey;
  setLocalItem(LS_KEYS, keyMap);

  try {
    await setDoc(doc(db, 'exams', question.examId, 'questions', question.id), question, { merge: true });
    await setDoc(doc(db, 'answerKeys', question.examId), existingKey, { merge: true });
  } catch (err) {
    // Handled in local
  }
}

export async function deleteQuestion(examId: string, questionId: string): Promise<void> {
  const qMap = getLocalItem<Record<string, Question[]>>(LS_QUESTIONS, {});
  if (qMap[examId]) {
    qMap[examId] = qMap[examId].filter((q) => q.id !== questionId);
    setLocalItem(LS_QUESTIONS, qMap);
  }

  const keyMap = getLocalItem<Record<string, ExamAnswerKey>>(LS_KEYS, {});
  if (keyMap[examId]?.questions[questionId]) {
    delete keyMap[examId].questions[questionId];
    setLocalItem(LS_KEYS, keyMap);
  }

  try {
    await deleteDoc(doc(db, 'exams', examId, 'questions', questionId));
  } catch (e) {
    // Handled in local
  }
}

// -------------------------------------------------------------
// PUBLISHED EXAM LINKS & IMMUTABLE VERSION SNAPSHOTS
// -------------------------------------------------------------

export async function publishExamWithSnapshot(
  examId: string,
  actor: { uid: string; displayName: string },
  customSlug?: string
): Promise<{ publicExamId: string; shareableUrl: string }> {
  const exam = await getExamById(examId);
  if (!exam) throw new Error('Exam not found');

  const sections = await getExamSections(examId);
  const questions = await getAuthorizedExamQuestions(examId);

  const keyMap = getLocalItem<Record<string, ExamAnswerKey>>(LS_KEYS, {});
  const answerKey = keyMap[examId] || DEFAULT_KEY;

  const versionNum = (exam.publishedVersion || 0) + 1;
  const versionId = `${examId}_v${versionNum}`;

  // 1. Immutable snapshot
  const snapshot: ExamVersionSnapshot = {
    versionId,
    examId,
    versionNumber: versionNum,
    publishedAt: new Date().toISOString(),
    examData: { ...exam, status: 'published', publishedVersion: versionNum },
    sections,
    questions,
    answerKeys: answerKey.questions,
  };

  const snapshotsMap = getLocalItem<Record<string, ExamVersionSnapshot>>(LS_SNAPSHOTS, {});
  snapshotsMap[versionId] = snapshot;
  setLocalItem(LS_SNAPSHOTS, snapshotsMap);

  // 2. Generate unique shareable slug
  const publicExamId =
    customSlug?.trim() ||
    exam.publicExamId ||
    `ex-${Math.random().toString(36).substring(2, 8)}${Date.now().toString(36).substring(4)}`;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://academiaexam.edu';
  const shareableUrl = `${origin}/?exam=${publicExamId}`;

  // 3. Create or update PublishedExamLink
  const linkRecord: PublishedExamLink = {
    publicExamId,
    examId,
    versionId,
    status: 'active',
    title: exam.title,
    subject: exam.subject || 'Curriculum Subject',
    courseCode: exam.courseCode,
    collegeName: exam.collegeName || 'College of Engineering & Technology',
    scheduledStartAt: exam.scheduledStartAt,
    durationMinutes: Math.round(exam.durationSeconds / 60),
    totalMarks: exam.totalMarks,
    passingMarks: exam.passingMarks || Math.round(exam.totalMarks * 0.4),
    negativeMarking: exam.negativeMarking,
    createdAt: new Date().toISOString(),
    createdBy: actor.displayName || actor.uid,
    accessCount: 0,
  };

  const links = getLocalItem<PublishedExamLink[]>(LS_LINKS, []);
  const existingLinkIdx = links.findIndex((l) => l.publicExamId === publicExamId || l.examId === examId);
  if (existingLinkIdx !== -1) {
    links[existingLinkIdx] = linkRecord;
  } else {
    links.unshift(linkRecord);
  }
  setLocalItem(LS_LINKS, links);

  // 4. Update Exam document
  await updateExam(examId, {
    status: 'published',
    publishedVersion: versionNum,
    publicExamId,
    shareableUrl,
    isLinkActive: true,
    publishedAt: new Date().toISOString(),
  });

  // Audit
  await logAuditEvent(actor.uid, 'admin', actor.displayName, 'ADMIN_EXAM_PUBLISHED', {
    examId,
    reason: `Published version ${versionNum} with shareable link ${publicExamId}`,
    safeMetadata: { versionId, publicExamId, shareableUrl },
  });

  // Firestore sync
  try {
    await setDoc(doc(db, 'publishedExamLinks', publicExamId), linkRecord, { merge: true });
    await setDoc(doc(db, 'exams', examId, 'versions', versionId), snapshot, { merge: true });
  } catch (err) {
    // Handled in local
  }

  return { publicExamId, shareableUrl };
}

export async function getPublishedExamLink(publicExamId: string): Promise<PublishedExamLink | null> {
  try {
    const snap = await getDoc(doc(db, 'publishedExamLinks', publicExamId));
    if (snap.exists()) {
      return snap.data() as PublishedExamLink;
    }
  } catch (err) {
    // Fall back
  }

  const links = getLocalItem<PublishedExamLink[]>(LS_LINKS, [DEFAULT_LINK]);
  return links.find((l) => l.publicExamId === publicExamId) || null;
}

export async function getAllPublishedExamLinks(): Promise<PublishedExamLink[]> {
  try {
    const snap = await getDocs(collection(db, 'publishedExamLinks'));
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as PublishedExamLink);
      setLocalItem(LS_LINKS, list);
      return list;
    }
  } catch (err) {
    // Fall back
  }
  return getLocalItem<PublishedExamLink[]>(LS_LINKS, [DEFAULT_LINK]);
}

export async function toggleExamLinkStatus(
  publicExamId: string,
  newStatus: 'active' | 'disabled',
  actor?: { uid: string; displayName: string }
): Promise<void> {
  const links = getLocalItem<PublishedExamLink[]>(LS_LINKS, []);
  const idx = links.findIndex((l) => l.publicExamId === publicExamId);
  if (idx !== -1) {
    links[idx].status = newStatus;
    setLocalItem(LS_LINKS, links);

    // Also update parent exam isLinkActive
    const exams = getLocalItem<Exam[]>(LS_EXAMS, []);
    const eIdx = exams.findIndex((e) => e.id === links[idx].examId);
    if (eIdx !== -1) {
      exams[eIdx].isLinkActive = newStatus === 'active';
      setLocalItem(LS_EXAMS, exams);
    }
  }

  if (actor) {
    await logAuditEvent(actor.uid, 'admin', actor.displayName, 'ADMIN_LINK_STATUS_CHANGED', {
      reason: `Changed link ${publicExamId} status to ${newStatus}`,
      safeMetadata: { publicExamId, newStatus },
    });
  }

  try {
    await updateDoc(doc(db, 'publishedExamLinks', publicExamId), { status: newStatus });
  } catch (e) {
    // Handled in local
  }
}

// -------------------------------------------------------------
// STUDENT ATTEMPTS & TIMERS
// -------------------------------------------------------------

export async function getStudentAttempt(examId: string, studentId: string): Promise<Attempt | null> {
  const attemptId = `${examId}_${studentId}`;
  try {
    const snap = await getDoc(doc(db, 'attempts', attemptId));
    if (snap.exists()) return snap.data() as Attempt;
  } catch (err) {
    // Fall back
  }
  const attempts = getLocalItem<Record<string, Attempt>>(LS_ATTEMPTS, {});
  return attempts[attemptId] || null;
}

export async function startAttempt(exam: Exam, student: UserProfile): Promise<Attempt> {
  const attemptId = `${exam.id}_${student.uid}`;
  const existing = await getStudentAttempt(exam.id, student.uid);
  if (existing) {
    return existing;
  }

  const now = new Date();
  const scheduledStart = new Date(exam.scheduledStartAt);
  const baseStart = now.getTime() > scheduledStart.getTime() ? now : scheduledStart;
  const deadline = new Date(baseStart.getTime() + exam.durationSeconds * 1000);

  const newAttempt: Attempt = {
    id: attemptId,
    examId: exam.id,
    publicExamId: exam.publicExamId,
    studentId: student.uid,
    studentRollNumber: student.normalizedRollNumber || 'STUDENT',
    studentName: student.displayName,
    examVersion: exam.examVersion,
    status: 'in_progress',
    startedAt: now.toISOString(),
    deadlineAt: deadline.toISOString(),
    answerRevision: 0,
    tabSwitchesCount: 0,
  };

  const attempts = getLocalItem<Record<string, Attempt>>(LS_ATTEMPTS, {});
  attempts[attemptId] = newAttempt;
  setLocalItem(LS_ATTEMPTS, attempts);

  await logAuditEvent(student.uid, 'student', student.displayName, 'EXAM_STARTED', {
    examId: exam.id,
    attemptId,
    reason: 'Student authorized and started live exam session',
  });

  try {
    await setDoc(doc(db, 'attempts', attemptId), newAttempt, { merge: true });
    await setDoc(doc(db, 'examAssignments', attemptId), {
      id: attemptId,
      examId: exam.id,
      studentId: student.uid,
      studentRollNumber: student.normalizedRollNumber,
      studentName: student.displayName,
      eligibilityStatus: 'in_progress',
    }, { merge: true });
  } catch (err) {
    // Local store is authoritative
  }

  return newAttempt;
}

export async function getAttemptAnswers(attemptId: string): Promise<Record<string, AttemptAnswer>> {
  try {
    const snap = await getDocs(collection(db, 'attempts', attemptId, 'answers'));
    if (!snap.empty) {
      const map: Record<string, AttemptAnswer> = {};
      snap.docs.forEach((d) => {
        map[d.id] = d.data() as AttemptAnswer;
      });
      return map;
    }
  } catch (err) {
    // Fall back
  }
  const allAns = getLocalItem<Record<string, Record<string, AttemptAnswer>>>(LS_ANSWERS, {});
  return allAns[attemptId] || {};
}

export async function saveAnswer(
  attemptId: string,
  studentId: string,
  questionId: string,
  selectedOptionIds: string[],
  isMarkedForReview: boolean,
  currentRevision: number,
  answerValue?: string,
  numericalValue?: number
): Promise<number> {
  const nextRevision = currentRevision + 1;
  const data: AttemptAnswer = {
    id: questionId,
    attemptId,
    studentId,
    questionId,
    selectedOptionIds,
    answerValue,
    numericalValue,
    revision: nextRevision,
    isMarkedForReview,
    updatedAt: new Date().toISOString(),
  };

  const allAns = getLocalItem<Record<string, Record<string, AttemptAnswer>>>(LS_ANSWERS, {});
  if (!allAns[attemptId]) allAns[attemptId] = {};
  allAns[attemptId][questionId] = data;
  setLocalItem(LS_ANSWERS, allAns);

  const attempts = getLocalItem<Record<string, Attempt>>(LS_ATTEMPTS, {});
  if (attempts[attemptId]) {
    attempts[attemptId].answerRevision = nextRevision;
    setLocalItem(LS_ATTEMPTS, attempts);
  }

  try {
    await setDoc(doc(db, 'attempts', attemptId, 'answers', questionId), data, { merge: true });
    await updateDoc(doc(db, 'attempts', attemptId), { answerRevision: nextRevision });
  } catch (err) {
    // Handled in local
  }

  return nextRevision;
}

// -------------------------------------------------------------
// STRICT TAB SWITCH & SUBMISSION
// -------------------------------------------------------------

export async function finalizeAttempt(
  attemptId: string,
  reason: SubmissionReason,
  actor: { uid: string; displayName: string; role: 'student' | 'admin' }
): Promise<void> {
  const attempts = getLocalItem<Record<string, Attempt>>(LS_ATTEMPTS, {});
  const current = attempts[attemptId];

  if (current && current.status !== 'in_progress') {
    return;
  }

  let finalStatus: AttemptStatus = 'submitted';
  let auditEvent: AuditEventType = 'EXAM_SUBMITTED';

  if (reason === 'tab_switch') {
    finalStatus = 'auto_submitted_tab_switch';
    auditEvent = 'TAB_SWITCH_VIOLATION';
  } else if (reason === 'timeout') {
    finalStatus = 'auto_submitted_timeout';
    auditEvent = 'TIMEOUT_AUTO_SUBMIT';
  } else if (reason === 'admin_forced') {
    finalStatus = 'submitted';
    auditEvent = 'ADMIN_FORCE_SUBMIT';
  }

  const now = new Date().toISOString();

  if (current) {
    current.status = finalStatus;
    current.submittedAt = now;
    current.finalizedAt = now;
    current.submissionReason = reason;
    if (reason === 'tab_switch') {
      current.tabSwitchesCount = (current.tabSwitchesCount || 0) + 1;
    }
    attempts[attemptId] = current;
    setLocalItem(LS_ATTEMPTS, attempts);
  }

  await logAuditEvent(actor.uid, actor.role, actor.displayName, auditEvent, {
    attemptId,
    reason: `Exam finalized due to ${reason}`,
    safeMetadata: { finalStatus, submittedAt: now },
  });

  try {
    await updateDoc(doc(db, 'attempts', attemptId), {
      status: finalStatus,
      submittedAt: now,
      finalizedAt: now,
      submissionReason: reason,
      tabSwitchesCount: current?.tabSwitchesCount || 1,
    });
  } catch (err) {
    // Handled
  }
}

export async function recordTabSwitchEvent(
  attemptId: string,
  actor: { uid: string; displayName: string; role: 'student' | 'admin' }
): Promise<number> {
  const attempts = getLocalItem<Record<string, Attempt>>(LS_ATTEMPTS, {});
  const current = attempts[attemptId];
  const newCount = (current?.tabSwitchesCount || 0) + 1;

  if (current) {
    current.tabSwitchesCount = newCount;
    attempts[attemptId] = current;
    setLocalItem(LS_ATTEMPTS, attempts);
  }

  await logAuditEvent(actor.uid, actor.role, actor.displayName, 'TAB_SWITCH_VIOLATION', {
    attemptId,
    reason: `Tab switch or window blur violation detected (Incident #${newCount})`,
  });

  try {
    await updateDoc(doc(db, 'attempts', attemptId), {
      tabSwitchesCount: newCount,
    });
  } catch (err) {
    // Handled
  }

  return newCount;
}

// -------------------------------------------------------------
// LIVE MONITORING & RESULTS WITH MULTI-TYPE SCORING
// -------------------------------------------------------------

export async function getLiveExamAttempts(examId: string): Promise<Attempt[]> {
  try {
    const q = query(collection(db, 'attempts'), where('examId', '==', examId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as Attempt);
    }
  } catch (err) {
    // Fall back
  }
  const attemptsMap = getLocalItem<Record<string, Attempt>>(LS_ATTEMPTS, {});
  return Object.values(attemptsMap).filter((a) => a.examId === examId);
}

export async function calculateExamResults(examId: string): Promise<ExamResultSummary[]> {
  const exam = await getExamById(examId);
  const keyMap = getLocalItem<Record<string, ExamAnswerKey>>(LS_KEYS, { [DEFAULT_EXAM_ID]: DEFAULT_KEY });
  const answerKey = keyMap[examId] || DEFAULT_KEY;

  const questions = await getAuthorizedExamQuestions(examId);
  const totalQuestions = questions.length;
  let maxMarks = 0;
  questions.forEach((q) => {
    maxMarks += q.marks;
  });

  const attempts = await getLiveExamAttempts(examId);
  const results: ExamResultSummary[] = [];

  for (const attempt of attempts) {
    const answersMap = await getAttemptAnswers(attempt.id);

    let correctCount = 0;
    let incorrectCount = 0;
    let attemptedCount = 0;
    let totalScore = 0;

    questions.forEach((q) => {
      const studentAns = answersMap[q.id];
      const keyItem = answerKey.questions[q.id];

      if (!studentAns) return;

      const hasOptions = studentAns.selectedOptionIds && studentAns.selectedOptionIds.length > 0;
      const hasNumerical = studentAns.numericalValue !== undefined && studentAns.numericalValue !== null;
      const hasText = studentAns.answerValue && studentAns.answerValue.trim().length > 0;

      if (hasOptions || hasNumerical || hasText) {
        attemptedCount++;

        if (keyItem) {
          let isCorrect = false;

          if (q.questionType === 'numerical' && hasNumerical) {
            const studentNum = Number(studentAns.numericalValue);
            const targetNum = Number(keyItem.numericalAnswer);
            const tol = Math.abs(keyItem.numericalTolerance || 0);
            isCorrect = Math.abs(studentNum - targetNum) <= tol;
          } else if (q.questionType === 'mcq_multiple' && hasOptions) {
            const correctSet = new Set(keyItem.correctOptionIds);
            const studentSet = new Set(studentAns.selectedOptionIds);
            isCorrect =
              correctSet.size === studentSet.size &&
              [...correctSet].every((val) => studentSet.has(val));
          } else if (hasOptions) {
            // mcq_single or true_false
            isCorrect =
              studentAns.selectedOptionIds.length === 1 &&
              keyItem.correctOptionIds.includes(studentAns.selectedOptionIds[0]);
          }

          if (isCorrect) {
            correctCount++;
            totalScore += keyItem.marks;
          } else {
            incorrectCount++;
            totalScore -= Math.abs(keyItem.negativeMarks || 0);
          }
        }
      }
    });

    const unansweredCount = totalQuestions - attemptedCount;
    const scoreClamped = Math.max(0, Math.round(totalScore * 100) / 100);
    const percentage = maxMarks > 0 ? Math.round((scoreClamped / maxMarks) * 1000) / 10 : 0;
    const passingScore = exam?.passingMarks || Math.round(maxMarks * 0.4);
    const isPassed = scoreClamped >= passingScore;

    results.push({
      attemptId: attempt.id,
      studentId: attempt.studentId,
      studentRollNumber: attempt.studentRollNumber,
      studentName: attempt.studentName,
      status: attempt.status,
      submissionReason: attempt.submissionReason,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      tabSwitchesCount: attempt.tabSwitchesCount || 0,
      totalQuestions,
      attemptedQuestions: attemptedCount,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      unansweredQuestions: unansweredCount,
      totalScore: scoreClamped,
      maxMarks,
      percentage,
      isPassed,
    });
  }

  results.sort((a, b) => b.totalScore - a.totalScore);
  results.forEach((r, idx) => {
    r.rank = idx + 1;
  });

  return results;
}

// Formula Injection Safe CSV
export function generateSafeCSV(data: ExamResultSummary[], examTitle: string): string {
  const headers = [
    'Rank',
    'Roll Number',
    'Candidate Name',
    'Status',
    'Result',
    'Reason',
    'Score',
    'Max Marks',
    'Percentage',
    'Attempted',
    'Correct',
    'Incorrect',
    'Unanswered',
    'Tab Switches',
    'Submitted At',
  ];

  const sanitizeCell = (val: string | number | boolean | undefined): string => {
    if (val === undefined || val === null) return '""';
    let str = String(val);
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = data.map((r) => [
    sanitizeCell(r.rank),
    sanitizeCell(r.studentRollNumber),
    sanitizeCell(r.studentName),
    sanitizeCell(r.status),
    sanitizeCell(r.isPassed ? 'PASSED' : 'FAILED'),
    sanitizeCell(r.submissionReason || 'N/A'),
    sanitizeCell(r.totalScore),
    sanitizeCell(r.maxMarks),
    sanitizeCell(`${r.percentage}%`),
    sanitizeCell(r.attemptedQuestions),
    sanitizeCell(r.correctAnswers),
    sanitizeCell(r.incorrectAnswers),
    sanitizeCell(r.unansweredQuestions),
    sanitizeCell(r.tabSwitchesCount),
    sanitizeCell(r.submittedAt ? new Date(r.submittedAt).toLocaleString() : 'N/A'),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

export async function getAuditLogs(maxCount = 100): Promise<AuditLogEntry[]> {
  try {
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(maxCount));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as AuditLogEntry);
    }
  } catch (err) {
    // Fall back
  }
  return getLocalItem<AuditLogEntry[]>(LS_LOGS, []).slice(0, maxCount);
}

// 1-Click College Demo Seeder
export async function seedDemoCollegeData(adminUid: string, adminEmail: string): Promise<string> {
  setLocalItem<Exam[]>(LS_EXAMS, [DEFAULT_EXAM]);
  setLocalItem<Record<string, ExamSection[]>>(LS_SECTIONS, { [DEFAULT_EXAM_ID]: DEFAULT_SECTIONS });
  setLocalItem<Record<string, Question[]>>(LS_QUESTIONS, { [DEFAULT_EXAM_ID]: DEFAULT_QUESTIONS });
  setLocalItem<Record<string, ExamAnswerKey>>(LS_KEYS, { [DEFAULT_EXAM_ID]: DEFAULT_KEY });
  setLocalItem<PublishedExamLink[]>(LS_LINKS, [DEFAULT_LINK]);

  const priyaAttempt: Attempt = {
    id: `${DEFAULT_EXAM_ID}_demo_std_02`,
    examId: DEFAULT_EXAM_ID,
    publicExamId: DEFAULT_PUBLIC_SLUG,
    studentId: 'demo_std_02',
    studentRollNumber: '2024CS0102',
    studentName: 'Priya Patel',
    examVersion: 1,
    status: 'submitted',
    startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    deadlineAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    submittedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    submissionReason: 'manual',
    finalizedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    answerRevision: 9,
    tabSwitchesCount: 0,
    totalScore: 27,
    maxMarks: 30,
    percentage: 90,
    isPassed: true,
  };

  const priyaAnswers: Record<string, AttemptAnswer> = {
    q1: { id: 'q1', attemptId: priyaAttempt.id, studentId: 'demo_std_02', questionId: 'q1', selectedOptionIds: ['opt_b'], revision: 1, isMarkedForReview: false, updatedAt: new Date().toISOString() },
    q2: { id: 'q2', attemptId: priyaAttempt.id, studentId: 'demo_std_02', questionId: 'q2', selectedOptionIds: ['opt_b'], revision: 1, isMarkedForReview: false, updatedAt: new Date().toISOString() },
    q3: { id: 'q3', attemptId: priyaAttempt.id, studentId: 'demo_std_02', questionId: 'q3', selectedOptionIds: ['opt_a', 'opt_b', 'opt_d'], revision: 1, isMarkedForReview: false, updatedAt: new Date().toISOString() },
    q4: { id: 'q4', attemptId: priyaAttempt.id, studentId: 'demo_std_02', questionId: 'q4', selectedOptionIds: ['opt_true'], revision: 1, isMarkedForReview: false, updatedAt: new Date().toISOString() },
    q5: { id: 'q5', attemptId: priyaAttempt.id, studentId: 'demo_std_02', questionId: 'q5', selectedOptionIds: ['opt_a'], revision: 1, isMarkedForReview: false, updatedAt: new Date().toISOString() },
    q6: { id: 'q6', attemptId: priyaAttempt.id, studentId: 'demo_std_02', questionId: 'q6', selectedOptionIds: ['opt_a'], revision: 1, isMarkedForReview: false, updatedAt: new Date().toISOString() },
    q7: { id: 'q7', attemptId: priyaAttempt.id, studentId: 'demo_std_02', questionId: 'q7', selectedOptionIds: [], numericalValue: 15, revision: 1, isMarkedForReview: false, updatedAt: new Date().toISOString() },
    q8: { id: 'q8', attemptId: priyaAttempt.id, studentId: 'demo_std_02', questionId: 'q8', selectedOptionIds: ['opt_b'], revision: 1, isMarkedForReview: false, updatedAt: new Date().toISOString() },
    q9: { id: 'q9', attemptId: priyaAttempt.id, studentId: 'demo_std_02', questionId: 'q9', selectedOptionIds: ['opt_b'], revision: 1, isMarkedForReview: false, updatedAt: new Date().toISOString() },
    q10: { id: 'q10', attemptId: priyaAttempt.id, studentId: 'demo_std_02', questionId: 'q10', selectedOptionIds: [], numericalValue: 3, revision: 1, isMarkedForReview: false, updatedAt: new Date().toISOString() },
  };

  const attempts = getLocalItem<Record<string, Attempt>>(LS_ATTEMPTS, {});
  attempts[priyaAttempt.id] = priyaAttempt;
  setLocalItem(LS_ATTEMPTS, attempts);

  const allAns = getLocalItem<Record<string, Record<string, AttemptAnswer>>>(LS_ANSWERS, {});
  allAns[priyaAttempt.id] = priyaAnswers;
  setLocalItem(LS_ANSWERS, allAns);

  await logAuditEvent(adminUid, 'admin', 'System Controller', 'ADMIN_EXAM_PUBLISHED', {
    examId: DEFAULT_EXAM_ID,
    reason: 'Initial college algorithms exam package seeded successfully with 10 questions and answer keys.',
  });

  return DEFAULT_EXAM_ID;
}

export async function getStudentAssignments(studentId: string): Promise<ExamAssignment[]> {
  return [
    {
      id: `${DEFAULT_EXAM_ID}_${studentId}`,
      examId: DEFAULT_EXAM_ID,
      studentId,
      studentRollNumber: '2024CS0101',
      studentName: 'Aarav Sharma',
      classId: 'CSE-3A',
      eligibilityStatus: 'assigned',
    },
  ];
}

const DEFAULT_STUDENTS = [
  { rollNumber: '2024CS0101', studentName: 'Aarav Sharma', classId: 'CSE-3A', active: true },
  { rollNumber: '2024CS0102', studentName: 'Priya Patel', classId: 'CSE-3A', active: true },
  { rollNumber: '2024CS0103', studentName: 'Rohan Deshmukh', classId: 'CSE-3A', active: true },
  { rollNumber: '2024CS0104', studentName: 'Ananya Verma', classId: 'CSE-3B', active: true },
  { rollNumber: '2024CS0105', studentName: 'Vikramaditya Rao', classId: 'CSE-3B', active: true },
];

export async function getAllStudents(): Promise<Array<{ rollNumber: string; studentName: string; classId: string; active: boolean }>> {
  try {
    const snap = await getDocs(collection(db, 'rollNumberMappings'));
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as any);
      setLocalItem('academia_students_list', list);
      return list;
    }
  } catch (err) {
    // Fall back to local store
  }
  return getLocalItem('academia_students_list', DEFAULT_STUDENTS);
}

export async function enrollStudent(student: { rollNumber: string; studentName: string; classId: string }): Promise<void> {
  const norm = student.rollNumber.toUpperCase();
  const list = getLocalItem('academia_students_list', DEFAULT_STUDENTS);
  const existingIdx = list.findIndex((s) => s.rollNumber === norm);
  const entry = {
    rollNumber: norm,
    studentName: student.studentName,
    classId: student.classId || 'CSE-2024',
    active: true,
  };
  if (existingIdx !== -1) {
    list[existingIdx] = entry;
  } else {
    list.push(entry);
  }
  setLocalItem('academia_students_list', list);

  try {
    const uid = `std_${norm.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    await setDoc(doc(db, 'users', uid), {
      uid,
      displayName: student.studentName,
      normalizedRollNumber: norm,
      role: 'student',
      classId: student.classId || 'CSE-2024',
      isActive: true,
      createdAt: new Date().toISOString(),
    }, { merge: true });

    await setDoc(doc(db, 'rollNumberMappings', norm), {
      rollNumber: norm,
      uid,
      studentName: student.studentName,
      classId: student.classId || 'CSE-2024',
      active: true,
    }, { merge: true });
  } catch (err) {
    // Handled in local
  }
}
