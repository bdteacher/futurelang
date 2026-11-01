# Security Specification (Phase 0: Payload-First Security TDD)

## 1. Data Invariants
1. **Default Deny & Verified Auth**: Every write requires `request.auth != null && request.auth.token.email_verified == true`.
2. **Role & Privilege Escalation Guard**: Self-registration on `/users/{userId}` can only assign `role == 'STUDENT'` unless `isAdmin()` is true. Bootstrapped admin (`bdteacher@gmail.com` with `email_verified == true`) or `/admins/{uid}` is required for admin privileges.
3. **PII & Student Data Isolation**: `/users/{userId}`, `/submissions/{submissionId}`, and `/savedVocab/{vocabId}` cannot be read by other students. Only the document owner (`request.auth.uid`) or `isAdmin()` can read or list them.
4. **Relational Integrity**: Creating a `/students/{studentId}` record requires that the referenced `/classes/{classId}` document exists (`exists(...)`) and belongs to the owner (`ownerId == request.auth.uid`).
5. **Strict Key & Size Enforcement**: Every entity validation helper enforces `hasAll` and `hasOnly` on keys, explicit type checks, string `.size()` boundaries, numeric bounds, and `request.time` temporal integrity on `createdAt`/`updatedAt`.
6. **Terminal State Locking**: Once an `/tests/{testId}` document reaches `status == 'CLOSED'`, non-admin updates are blocked.

## 2. The "Dirty Dozen" Payloads
1. **Payload 1 (Self-Assigned Admin Role)**: `POST /users/user1` with `role: "ADMIN"` by a non-admin user -> `PERMISSION_DENIED`.
2. **Payload 2 (Unverified Admin Email Spoof)**: Request with `email: "bdteacher@gmail.com"` and `email_verified: false` -> `PERMISSION_DENIED`.
3. **Payload 3 (Shadow Field Injection)**: `POST /classes/class1` including `isVerified: true` -> `PERMISSION_DENIED` via `hasOnly()`.
4. **Payload 4 (Cross-Student PII Read)**: `GET /users/studentB` by `studentA` -> `PERMISSION_DENIED`.
5. **Payload 5 (Blanket List Scraping on Submissions)**: `LIST /submissions` without `where('userId', '==', request.auth.uid)` -> `PERMISSION_DENIED`.
6. **Payload 6 (ID Poisoning Attack)**: `POST /savedVocab/invalid$id!@#` -> `PERMISSION_DENIED` via `isValidId()`.
7. **Payload 7 (Denial-of-Wallet String Overflow)**: `POST /submissions/sub1` with 20,000-char `content` -> `PERMISSION_DENIED` via `.size() <= 5000`.
8. **Payload 8 (Orphaned Student Creation)**: `POST /students/stu1` referencing non-existent `classId: "ghost_class"` -> `PERMISSION_DENIED` via `exists()`.
9. **Payload 9 (Identity Spoofing on Submission)**: `POST /submissions/sub1` with `userId: "someone_else"` -> `PERMISSION_DENIED`.
10. **Payload 10 (Forged Client Timestamp)**: `POST /classes/class1` with `createdAt: Timestamp(2020, 1, 1)` -> `PERMISSION_DENIED` via `request.time`.
11. **Payload 11 (Immutable Owner Mutation)**: `PATCH /classes/class1` changing `teacherId` -> `PERMISSION_DENIED`.
12. **Payload 12 (Terminal State Re-opening)**: `PATCH /tests/test1` when `existing().status == 'CLOSED'` by non-admin -> `PERMISSION_DENIED`.
