/**
 * Phase 0 & Phase 5 Security Rules Verification Suite
 * Verifies all Dirty Dozen adversarial payloads are rejected with PERMISSION_DENIED.
 */

export interface DirtyDozenScenario {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedOutcome: 'PERMISSION_DENIED';
  mitigationRuleGate: string;
}

export const DIRTY_DOZEN_VERIFICATION: DirtyDozenScenario[] = [
  {
    id: 1,
    name: 'Self-Assigned Admin Role on Registration',
    collection: '/users/user1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    mitigationRuleGate: "(incoming().role == 'STUDENT' || isAdmin())",
  },
  {
    id: 2,
    name: 'Unverified Email Spoof Attack',
    collection: '/admins/admin1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    mitigationRuleGate: 'request.auth.token.email_verified == true',
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Classroom',
    collection: '/classes/class1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    mitigationRuleGate: 'data.keys().hasOnly([...])',
  },
  {
    id: 4,
    name: 'Cross-Student PII Profile Read',
    collection: '/users/studentB',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
    mitigationRuleGate: '(request.auth.uid == userId || isAdmin())',
  },
  {
    id: 5,
    name: 'Blanket List Scraping on Submissions',
    collection: '/submissions',
    operation: 'list',
    expectedOutcome: 'PERMISSION_DENIED',
    mitigationRuleGate: 'resource.data.userId == request.auth.uid',
  },
  {
    id: 6,
    name: 'ID Poisoning Attack on SavedVocabulary',
    collection: '/savedVocab/bad$id',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    mitigationRuleGate: 'isValidId(vocabId)',
  },
  {
    id: 7,
    name: 'Denial-of-Wallet String Overflow on Submission Content',
    collection: '/submissions/sub1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    mitigationRuleGate: 'data.content.size() <= 5000',
  },
  {
    id: 8,
    name: 'Orphaned Student Record Without Existing Class',
    collection: '/students/stu1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    mitigationRuleGate: 'exists(/databases/$(database)/documents/classes/$(incoming().classId))',
  },
  {
    id: 9,
    name: 'Identity Spoofing on ActivitySubmission',
    collection: '/submissions/sub1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    mitigationRuleGate: 'data.userId == request.auth.uid',
  },
  {
    id: 10,
    name: 'Forged Client Timestamp on Classroom Creation',
    collection: '/classes/class1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    mitigationRuleGate: 'incoming().createdAt == request.time',
  },
  {
    id: 11,
    name: 'Immutable Owner Mutation on Classroom Update',
    collection: '/classes/class1',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    mitigationRuleGate: 'incoming().teacherId == existing().teacherId',
  },
  {
    id: 12,
    name: 'Terminal State Re-opening on Closed OnlineTest',
    collection: '/tests/test1',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    mitigationRuleGate: "existing().status != 'CLOSED'",
  },
];
