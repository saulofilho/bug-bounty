export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type ReportStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'TRIAGED' 
  | 'REWARDED' 
  | 'RESOLVED' 
  | 'DUPLICATE' 
  | 'OUT_OF_SCOPE';

export type PlatformName = 
  | 'HackerOne' 
  | 'Bugcrowd' 
  | 'Intigriti' 
  | 'YesWeHack' 
  | 'Synack' 
  | 'Direct / VDP';

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  notes?: string;
  type: 'creation' | 'status_change' | 'bounty' | 'dispatch' | 'note' | 'pgp_signature';
  hoursSpent?: number;
}

export interface VulnerabilityReport {
  id: string;
  title: string;
  target: string;
  platform: PlatformName;
  vulnerabilityType: string;
  severity: Severity;
  status: ReportStatus;
  cvssVector: string;
  cvssScore: number;
  cwe: string;
  cveIds: string[];
  summary: string;
  stepsToReproduce: string[];
  proofOfConcept: string;
  businessImpact: string;
  remediation: string;
  bountyAmount: number;
  currency: 'USD' | 'BRL';
  submissionId?: string;
  submissionUrl?: string;
  createdAt: string;
  updatedAt: string;
  timeline: TimelineEvent[];
  timeSpentHours?: number;
  attachments?: Array<{ name: string; size: string; type: string }>;
  tags?: string[];
  pgpSignature?: {
    signedText: string;
    keyFingerprint: string;
    signedAt: string;
  };
  validationChecklist?: ValidationChecklistItem[];
}

export interface ValidationChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
}

export interface AutoTagSuggestion {
  suggestedTags: string[];
  suggestedCwes: Array<{
    id: string;
    name: string;
    description: string;
    confidence: number;
    owaspCategory?: string;
    recommendedCvssVector?: string;
    explanation: string;
  }>;
  suggestedCves: Array<{
    id: string;
    title: string;
    cvss: number;
    severity: Severity;
    relevance: string;
    cwe?: string;
  }>;
  matchedDocs: Array<{
    id: string;
    title: string;
    category: string;
    matchScore: number;
    matchedKeywords: string[];
    relevanceSnippet: string;
  }>;
  analysisSummary: string;
}

export interface CVERecord {
  id: string;
  title: string;
  cvss: number;
  severity: Severity;
  cwe: string;
  description: string;
  published: string;
  references: string[];
}

export interface TargetProgram {
  id: string;
  name: string;
  domain: string;
  platform: PlatformName;
  programUrl: string;
  bountyRange: string;
  inScope: string[];
  outOfScope: string[];
  notes: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  reportsCount: number;
  totalRewarded: number;
}

export interface TechnicalDoc {
  id: string;
  title: string;
  category: 'Methodology' | 'Checklist' | 'Payloads' | 'Recon' | 'OAuth' | 'API' | 'Writeup';
  content: string;
  tags: string[];
  updatedAt: string;
  isChecklist?: boolean;
  checklistItems?: Array<{ id: string; text: string; completed: boolean; category?: string }>;
}

export interface SecurityIntelSource {
  title: string;
  url: string;
}

export interface SecurityIntelResult {
  success: boolean;
  text: string;
  sources: SecurityIntelSource[];
  searchQueries?: string[];
  target: string;
  vulnerabilityType: string;
  timestamp: string;
  warning?: string;
  error?: string;
}
