export type UserRole = 'admin' | 'student';

export interface UserProfile {
  uid: string;
  email?: string;
  displayName: string;
  normalizedRollNumber?: string;
  role: UserRole;
  classId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface RollNumberMapping {
  rollNumber: string;
  uid: string;
  studentName: string;
  classId: string;
  active: boolean;
}

export type ExamStatus = 'draft' | 'scheduled' | 'published' | 'live' | 'completed' | 'cancelled';
export type TabSwitchPolicy = 'strict_first_switch' | 'warning_once' | 'disabled';

export interface Exam {
  id: string;
  title: string;
  subject?: string;
  course?: string;
  department?: string;
  semester?: string;
  academicYear?: string;
  collegeName?: string;
  examType?: 'End-Semester' | 'Mid-Term' | 'Quiz' | 'Practical Assessment' | 'Internal';
  description: string;
  instructions: string;
  status: ExamStatus;
  scheduledStartAt: string; // ISO string
  durationSeconds: number; // e.g. 3600 (60 minutes)
  lateEntrySeconds: number; // e.g. 900 (15 minutes)
  totalMarks: number;
  passingMarks?: number;
  negativeMarking: boolean;
  negativeMarkingRate?: number; // e.g. 0.5
  examVersion: number;
  publishedVersion?: number;
  createdBy: string;
  createdAt: string;
  publishedAt?: string;
  tabSwitchPolicy: TabSwitchPolicy;
  allowReview?: boolean;
  allowBackwardNav?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  warnUnanswered?: boolean;
  maxAttempts?: number;
  courseCode?: string;
  sectionIds?: string[];
  publicExamId?: string;
  shareableUrl?: string;
  isLinkActive?: boolean;
}

export interface ExamSection {
  id: string;
  examId: string;
  title: string;
  instructions?: string;
  order: number;
  sectionMarks: number;
  questionIds?: string[];
  isRequired?: boolean;
  sectionTimerSeconds?: number;
}

export type QuestionType = 
  | 'mcq_single' 
  | 'mcq_multiple' 
  | 'true_false' 
  | 'numerical' 
  | 'short_answer';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface CodeSnippet {
  code: string;
  language: string;
  title?: string;
}

export interface Question {
  id: string;
  examId: string;
  sectionId: string;
  questionType: QuestionType;
  questionText: string;
  options: QuestionOption[];
  marks: number;
  negativeMarks: number;
  order: number;
  version: number;
  codeSnippet?: CodeSnippet;
  mathFormula?: string;
  numericalAnswer?: number;
  numericalTolerance?: number;
  shortAnswerRubric?: string;
  imageUrl?: string;
  explanation?: string;
}

export interface AnswerKeyQuestion {
  questionId: string;
  correctOptionIds: string[];
  marks: number;
  negativeMarks: number;
  numericalAnswer?: number;
  numericalTolerance?: number;
  explanation?: string;
}

export interface ExamAnswerKey {
  examId: string;
  questions: Record<string, AnswerKeyQuestion>;
  updatedAt: string;
}

export type EligibilityStatus = 'assigned' | 'in_progress' | 'submitted' | 'disqualified';

export interface ExamAssignment {
  id: string;
  examId: string;
  studentId: string;
  studentRollNumber: string;
  studentName: string;
  classId: string;
  eligibilityStatus: EligibilityStatus;
}

export interface PublishedExamLink {
  publicExamId: string;
  examId: string;
  versionId: string;
  status: 'active' | 'disabled' | 'expired';
  title: string;
  subject: string;
  courseCode?: string;
  collegeName?: string;
  scheduledStartAt: string;
  durationMinutes: number;
  totalMarks: number;
  passingMarks?: number;
  negativeMarking: boolean;
  expiresAt?: string;
  createdAt: string;
  createdBy: string;
  accessCount: number;
}

export interface ExamVersionSnapshot {
  versionId: string;
  examId: string;
  versionNumber: number;
  publishedAt: string;
  examData: Exam;
  sections: ExamSection[];
  questions: Question[];
  answerKeys: Record<string, AnswerKeyQuestion>;
}

export type AttemptStatus = 
  | 'in_progress' 
  | 'submitted' 
  | 'auto_submitted_tab_switch' 
  | 'auto_submitted_timeout' 
  | 'disqualified';

export type SubmissionReason = 
  | 'manual' 
  | 'tab_switch' 
  | 'timeout' 
  | 'admin_forced';

export interface Attempt {
  id: string;
  examId: string;
  publicExamId?: string;
  studentId: string;
  studentRollNumber: string;
  studentName: string;
  examVersion: number;
  status: AttemptStatus;
  startedAt: string;
  deadlineAt: string;
  submittedAt?: string;
  submissionReason?: SubmissionReason;
  finalizedAt?: string;
  answerRevision: number;
  tabSwitchesCount: number;
  totalScore?: number;
  maxMarks?: number;
  percentage?: number;
  isPassed?: boolean;
}

export interface AttemptAnswer {
  id: string; // usually questionId
  attemptId: string;
  studentId: string;
  questionId: string;
  selectedOptionIds: string[]; // option ids
  answerValue?: string; // string or numerical input
  numericalValue?: number;
  revision: number;
  isMarkedForReview: boolean;
  updatedAt: string;
}

export type AuditEventType = 
  | 'USER_LOGIN'
  | 'EXAM_STARTED'
  | 'ANSWER_SAVED'
  | 'TAB_SWITCH_VIOLATION'
  | 'EXAM_SUBMITTED'
  | 'TIMEOUT_AUTO_SUBMIT'
  | 'ADMIN_EXAM_PUBLISHED'
  | 'ADMIN_LINK_GENERATED'
  | 'ADMIN_LINK_STATUS_CHANGED'
  | 'ADMIN_FORCE_SUBMIT'
  | 'STUDENT_IMPORTED';

export interface AuditLogEntry {
  id: string;
  actorUid: string;
  actorRole: UserRole;
  actorName?: string;
  eventType: AuditEventType;
  examId?: string;
  attemptId?: string;
  reason?: string;
  safeMetadata?: Record<string, unknown>;
  timestamp: string;
}

export interface ExamResultSummary {
  attemptId: string;
  studentId: string;
  studentRollNumber: string;
  studentName: string;
  classId?: string;
  status: AttemptStatus;
  submissionReason?: SubmissionReason;
  startedAt: string;
  submittedAt?: string;
  tabSwitchesCount: number;
  totalQuestions: number;
  attemptedQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  totalScore: number;
  maxMarks: number;
  percentage: number;
  isPassed?: boolean;
  rank?: number;
}
