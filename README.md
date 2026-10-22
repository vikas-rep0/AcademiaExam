# AcademiaExam: College Online Examination System

A full-stack, production-oriented online examination platform built for university end-semester assessments supporting 500+ concurrent students, backed by Google Firebase Authentication and Cloud Firestore with server-authoritative timers, strict tab-switch auto-submission proctoring, and automated objective grading.

---

## Architecture Overview

```
                      +---------------------------------------+
                      |       College Client Browser          |
                      +---------------------------------------+
                             /                         \
           [Student Portal] /                           \ [Admin Dashboard]
                           v                             v
           +-------------------------------+    +-------------------------------+
           | - Roll Number / Passkey Auth  |    | - Exam Scheduler & Manager    |
           | - Waiting Room (IST Synced)   |    | - Section & Question Builder  |
           | - Authoritative Server Timer  |    | - Live Proctoring Stream      |
           | - Continuous Answer Auto-Save |    | - Auto-Grading & CSV Export   |
           | - Strict Tab-Switch Lockout   |    | - Bulk Student Enrolment      |
           +-------------------------------+    +-------------------------------+
                           \                             /
                            \                           /
                             v                         v
        +---------------------------------------------------------------+
        |                 Google Cloud Firestore                        |
        |  - /users & /admins (ABAC Identity & Access Control)          |
        |  - /exams, /sections, /questions (Answer keys stripped)       |
        |  - /answerKeys (Admin-only confidential scoring store)        |
        |  - /attempts & /answers (Real-time student responses)         |
        |  - /auditLogs (Append-only immutable event timeline)          |
        +---------------------------------------------------------------+
```

---

## Key Features

### 1. Student Examination Portal
* **Normalized Roll Number Authentication:** Support for university roll number verification with secure session token and institutional Google Sign-In.
* **Waiting Room & Instructions:** Real-time synchronized countdown (Asia/Kolkata IST) locking questions until official scheduled start time. Mandatory conduct acceptance checklist.
* **Authoritative Server Timer:** Deadlines computed and enforced from server timestamps. Timer never resets on page refresh, section switching, or network drop.
* **Continuous Auto-Save with Concurrency Control:** Debounced answer saving with revision tracking, retry backoff, and cloud status indicators (`Saving...`, `Saved`, `Retrying`).
* **Strict Tab-Switch Auto-Submission:**
  * Client listens to `document.visibilitychange` and `window.blur`.
  * First detected switch or window minimization immediately freezes the exam, flushes confirmed answers, auto-submits the attempt with status `auto_submitted_tab_switch`, and logs security audit incident.
  * Student is locked out permanently from resuming.
* **Digital Submission Receipt:** Displays official verification timestamp, candidate credentials, attempt ID, and submission reason.

### 2. Admin Examination Control Center
* **Live Overview KPIs:** Total registered students, active exams, test-takers live right now, completed attempts, and proctoring violations.
* **Exam Management:** Create, schedule start time (IST), set duration, total marks, negative marking rules, and tab-switch strictness policy.
* **Question Bank & Protected Keys:** Multi-section MCQ editor with marks, negative marking, and correct options stored strictly in `/answerKeys/{examId}` (never exposed in student network responses).
* **Live Monitoring Stream (500+ Concurrent Students):** Real-time attempt status, time remaining, question progress, tab-switch incident count, and emergency "Force Submit" action.
* **Objective Auto-Grading Engine:** Calculates total marks, negative deductions, percentage, and candidate ranks with one click.
* **Safe CSV Export:** Sanitizes against spreadsheet formula injection attacks (escaping leading `+`, `-`, `=`, `@` characters).
* **Bulk Student Import:** CSV template generator and batch importer for mass student enrollment.
* **Security Audit Trail:** Immutable chronological timeline recording logins, exam starts, answer saves, proctoring violations, and submissions.

---

## Security Model & Firestore Rules

The database is guarded by hardened Zero-Trust Firestore Security Rules adhering to Attribute-Based Access Control (ABAC):
1. **Default Deny:** All unmapped paths are rejected.
2. **Answer Key Protection:** The `/answerKeys` collection has strict `allow read, write: if isAdmin();`. Students cannot inspect solutions.
3. **Attempt Ownership & Deadlines:** Students may only write answers where `studentId == request.auth.uid`, `status == 'in_progress'`, and `request.time <= deadlineAt`.
4. **Terminal State Lock:** Once finalized (`submitted` or `auto_submitted_tab_switch`), no subsequent answer writes or status rollbacks can occur.
5. **PII Isolation:** Roll number mappings and student rosters are protected from arbitrary enumeration.
6. **Audit Immutability:** `/auditLogs` entries are append-only.

---

## Quick Testing & Evaluation Guide

1. **One-Click Demo Switcher:**
   * Click the **"Role Switcher"** button in the top navigation bar or the **"Quick Test Roles"** buttons on the login page:
     * **College Admin:** Log in as `Prof. Rajesh Sharma` to access the full admin dashboard.
     * **Student 1:** Log in as `Aarav Sharma (2024CS0101)`.
     * **Student 2:** Log in as `Priya Patel (2024CS0102)`.
2. **Seed College Exam:**
   * In Admin mode, click **"Seed College Exam Data (1-Click)"** on the top banner. This immediately loads **CS-302: Design & Analysis of Algorithms** with 10 questions, negative marking, and enrolled students.
3. **Test Strict Tab-Switch Proctoring:**
   * Switch to Student mode, click **"Enter Waiting Room"**, accept the rules, and start the live exam.
   * Switch to any other browser tab or minimize your window.
   * Return to the exam tab: notice the immediate red lockout overlay, proctoring violation notice, and permanent auto-submission to the server!
