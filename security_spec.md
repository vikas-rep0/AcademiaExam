# Security Specification & Adversarial Test Suite

## 1. Data Invariants

1. **Role Immobility & Admin Gate**: Only verified users with an existing document in `/admins/{uid}` can perform administrative write operations on exams, assignments, questions, and view answer keys or audit logs.
2. **Answer Key Protection**: Students must NEVER be able to read or query `/answerKeys/{examId}` under any circumstances.
3. **Attempt Ownership & Deadlines**: A student may only read or write answers for an attempt where `studentId == request.auth.uid`. Answers cannot be submitted or modified if the attempt is in a terminal status (`submitted`, `auto_submitted_tab_switch`, `auto_submitted_timeout`) or after `deadlineAt`.
4. **Immutable Attempt Creation**: An attempt's `startedAt` and initial `deadlineAt` are bound at creation and cannot be extended or spoofed by client manipulation.
5. **Tab-Switch Auto-Submission State Lock**: Once an attempt enters `auto_submitted_tab_switch`, it transitions into an immutable terminal state. No subsequent answers or status resets may occur.
6. **Audit Trail Immutability**: Documents in `/auditLogs` are append-only by authenticated actors and can never be updated or deleted.
7. **Roll Number Isolation**: Roll number mappings can only be created by admins, avoiding identity-hijacking or collision attacks.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Admin Privilege Escalation via User Profile)**:
   Student attempts to update `/users/{studentUid}` with `{"role": "admin"}` to hijack admin privileges.
   *Expected: REJECT (Users cannot alter their own role).*

2. **Payload 2 (Answer Key Snooping)**:
   Unauthenticated or student authenticated request performs `get` on `/answerKeys/exam_cs101`.
   *Expected: REJECT (Only admins can read answer keys).*

3. **Payload 3 (Attempt Impersonation)**:
   Student A writes to `/attempts/attempt_studentB/answers/q1` with student B's attempt ID.
   *Expected: REJECT (Must match `request.auth.uid`).*

4. **Payload 4 (Post-Deadline Answer Tampering)**:
   Student writes an answer to `/attempts/{attemptId}/answers/q5` after `request.time > deadlineAt`.
   *Expected: REJECT (Deadline passed).*

5. **Payload 5 (Post-Tab-Switch Answer Resuscitation)**:
   Student attempts to write answers or reset status back to `"in_progress"` after attempt has been finalized to `"auto_submitted_tab_switch"`.
   *Expected: REJECT (Terminal state reached).*

6. **Payload 6 (Shadow Field Injection in Exam)**:
   User tries to patch exam document with `{"bypass_proctoring": true, "ghostAdmin": "attacker"}`.
   *Expected: REJECT (Key schema whitelist enforcement).*

7. **Payload 7 (Unbounded Junk String Denial-of-Wallet)**:
   User submits 2MB string payload into answer field to trigger database write exhaustion.
   *Expected: REJECT (String size limit <= 1000).*

8. **Payload 8 (Arbitrary Exam Question Manipulation)**:
   Student attempts to create or update `/exams/exam_cs101/questions/q1` with altered question text.
   *Expected: REJECT (Only admins can write questions).*

9. **Payload 9 (Audit Log Deletion / Tampering)**:
   Student attempts to `delete` or `update` a log entry in `/auditLogs/{logId}` to hide tab-switch detection.
   *Expected: REJECT (Audit logs cannot be updated or deleted).*

10. **Payload 10 (Premature Exam Infiltration)**:
    Student attempts to start attempt before exam status is `'published'` or `'live'`.
    *Expected: REJECT (Exam must be published/live).*

11. **Payload 11 (Other Student Attempt Snooping)**:
    Student A lists or reads `/attempts/{attempt_studentB}`.
    *Expected: REJECT (Students can only read their own attempts).*

12. **Payload 12 (Self-Assigning Exam Assignment)**:
    Student writes to `/examAssignments/{newId}` adding themselves to a restricted honors exam.
    *Expected: REJECT (Only admins can assign exams).*
