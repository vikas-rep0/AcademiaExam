# Premium Custom Exam Paper Builder & Secure Shareable Examination Platform

A comprehensive, production-grade examination architecture enabling college administrators to author customized examination papers via a multi-step studio wizard, publish version-immutable snapshots with unique shareable links, and administer real-time proctored examinations to 500+ concurrent students.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following product decisions were confirmed during the planning phase:
> - **Paper Builder Studio Architecture**: Multi-step Studio wizard with real-time student-view preview (Basic Info → Sections & Subjects → Question Creation & Types → Proctoring Settings → Validation & Snapshot Publishing).
> - **Shareable Exam Access**: Open candidate enrollment with roll number verification. Students accessing via `/exam/{publicExamId}` provide their university roll number and passkey to generate an authenticated session.
> - **Rich Question Types**: Support for Code snippets (syntax highlighted), mathematical equations, Single-correct MCQ, Multi-select, True/False, and Numerical responses.
> - **Published Link Management**: Dynamic public exam identifiers (`/exam/{publicExamId}`) with copy/share actions, link disable/reopen controls, and attempt authorization guardrails.

---

## 1. Overview & Core Concept

AcademiaExam provides an end-to-end college examination lifecycle:
1. **Admin Paper Builder Studio**: An authoring environment where faculty design multi-section question papers with diverse question formats, custom marking schemes, code blocks, math formulas, and strict proctoring rules.
2. **Shareable Exam URLs**: Upon publishing, a non-sequential, cryptographically unpredictable public link (`/exam/:publicExamId`) is generated. Administrators can distribute this link via LMS, email, or institutional channels.
3. **Student Examination Lobby**: Students opening the shareable link review official paper metadata (duration, total marks, scheduled start), input their roll number credentials, acknowledge conduct regulations in the waiting room, and launch their session.
4. **Proctored Examination Hall**: Distraction-minimized live testing interface featuring authoritative countdown timers, dynamic question navigation palette, instant auto-save with revision concurrency, and strict tab-switch detection.
5. **Evaluation & Audit Engine**: Automated objective grading, safe CSV grade sheet export, attempt status tracking, and tamper-evident audit logs.

---

## 2. User Experience & Visual Design

### Key User Flows
- **Flow 1: Creating a Custom Paper**
  - Admin navigates to **Paper Builder Studio**.
  - **Step 1 (Basic Info)**: Configures Title, Course, Department, Semester, Total Marks, Passing Marks, Duration, and Instructions.
  - **Step 2 (Sections & Structure)**: Adds Sections (e.g., Section A: Theory, Section B: Coding & Numericals), sets section marks, and configures navigation rules.
  - **Step 3 (Question Bank & Editor)**: Adds questions using the rich editor (Code snippets, math formulas, single/multi MCQ, numericals), sets individual positive/negative marks, and marks correct keys.
  - **Step 4 (Advanced Proctoring & Policies)**: Sets tab-switch strictness, review permissions, backward navigation, and random order.
  - **Step 5 (Validation & Preview)**: Verifies total mark balance and question completeness in a live student preview pane; saves as Draft or Publishes an immutable Version 1 snapshot.
- **Flow 2: Sharing & Managing Exam Links**
  - In **Published Exam Links**, admin views generated URL (`https://.../exam/{publicExamId}`), copies the URL, triggers Web Share API, or disables access in real-time.
- **Flow 3: Student Shareable URL Access & Examination**
  - Student visits `/exam/{publicExamId}`, views the college exam banner, enters university Roll Number and passkey.
  - Enters Waiting Room with synchronized countdown to start time.
  - Completes test with auto-save; tab switches trigger instant lockout and auto-submission.
  - Receives an official digital submission receipt with timestamp and attempt hash.

### Visual Identity & Theme
- **Theme**: Deep navy (`#0B132B`, `#0F172A`), clean white (`#FFFFFF`), and refined royal blue accents (`#2563EB`).
- **Typography**: `Plus Jakarta Sans` for clean, professional display and body hierarchy; `JetBrains Mono` for tabular numerals, roll numbers, code snippets, and authoritative countdown timers.
- **Spatial Discipline**: 1440px desktop baseline, zero-pill metadata formatting (unboxed text with subtle `·` separators), clean hairline borders, and single-level elevation.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Version-Immutable Snapshots on Publish
- **Chosen Approach**: When an admin publishes an exam, the system saves an immutable version snapshot (`exams/{examId}/versions/{versionId}`). Active student attempts bind to this specific snapshot.
- **Why**: Prevents race conditions or unfair scoring changes if an administrator edits questions while hundreds of students are mid-exam.
- **Alternatives Considered**: In-place edits (rejected due to integrity violations and concurrency errors).

### Decision 2: Multi-Type Question Evaluation
- **Chosen Approach**: Native objective auto-grading for Single MCQ, Multi-select MCQ, True/False, and Numerical tolerance comparisons. Short-answer/descriptive questions include an administrative manual grading workflow.
- **Why**: Allows both technical coding/engineering assessments and traditional theoretical papers without claiming impossible automatic evaluation for long prose.

### Decision 3: Public Exam Link Architecture
- **Chosen Approach**: Public links use clean slug routing (`/exam/:publicExamId`). The slug acts as an entry point that renders the specific exam's landing lobby, requiring students to authenticate before question data is unlocked.
- **Why**: Eliminates security risks of putting authentication tokens in URLs while providing effortless sharing.

---

## 4. Technical Architecture & System Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        College Client Layer                            │
│                                                                        │
│  [Admin Console]           [Paper Builder Studio]     [Student Portal] │
│  - KPI Dashboard           - Step 1: Specs Wizard     - Shareable URL  │
│  - Published Links View    - Step 2: Sections         - Roll No. Auth  │
│  - Live Proctor Stream     - Step 3: Question Editor  - Waiting Room   │
│  - Auto-Grading & CSV      - Step 4: Proctor Rules    - Proctored Hall │
│                            - Step 5: Live Preview     - Digital Receipt│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      State & Service Gateway Layer                     │
│                                                                        │
│  - AuthContext (Google OAuth + University Roll No. Auth)               │
│  - examService (Snapshot creation, public slugs, authoritative timers) │
│  - codeQuestionEngine (Syntax highlighting & code snippet formatting)  │
│  - mathRenderer (LaTeX math formula rendering)                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  Persistent Database & Security Layer                  │
│                                                                        │
│  Cloud Firestore:                                                      │
│  ├── /exams/{examId} & /versions/{versionId} (Immutable snapshots)    │
│  ├── /publishedExamLinks/{publicExamId} (Unpredictable shareable slugs)│
│  ├── /questionBank/{questionId} (Public question contents)             │
│  ├── /answerKeys/{examId} (Protected confidential grading keys)        │
│  ├── /attempts/{attemptId} & /answers (Real-time student responses)    │
│  └── /auditLogs/{logId} (Immutable security trail)                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Execution Steps

1. **Schema & Types**: Extend `types/exam.ts` with `PublishedExamLink`, `ExamVersionSnapshot`, `CodeSnippetOptions`, `NumericalQuestionOptions`, and multi-type question properties.
2. **Paper Builder Studio Component**: Build `PaperBuilderStudio.tsx` with a 5-step interactive wizard, section editor, rich question builder (code, math, numerical, multi-select), and live student preview.
3. **Published Links & Shareable URL Routing**:
   - Implement `PublishedLinksView.tsx` with copy link, native browser share, and disable/enable access toggles.
   - Implement dynamic public route `/exam/:publicExamId` in `App.tsx` allowing students to access tests directly via shared links.
4. **Student Shareable Exam Lobby & Auth**: Build `ExamShareableLobby.tsx` verifying published status, roll number enrollment, and attempt limits before unlocking the test hall.
5. **Question Rendering Upgrades**: Enhance `ExamLiveInterface.tsx` to cleanly render code snippets with syntax highlighting, mathematical notation, and numerical input boxes alongside traditional MCQs.
6. **Immutable Snapshots & Grading**: Implement snapshot freeze in `examService.ts` and ensure multi-type scoring (exact match, numerical tolerance, multi-select).
7. **Verification**: Run `compile_applet` and `lint_applet` to verify clean build without regressions.
