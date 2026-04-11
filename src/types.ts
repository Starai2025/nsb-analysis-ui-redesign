export type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'complete';

export interface AnalysisResult {
  executiveConclusion: string;
  scopeStatus: string;
  primaryResponsibility: string;
  secondaryResponsibility: string;
  extraMoneyLikely: boolean;
  extraTimeLikely: boolean;
  claimableAmount: string;
  extraDays: string;
  noticeDeadline: string;
  strategicRecommendation: string;
  keyRisks: { title: string, description: string }[];
}

export interface Citation {
  id: string;
  title: string;
  source: string;
  text: string;
  explanation: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface ProjectData {
  name: string;
  contractNumber: string;
  changeRequestId: string;
}

export type DocumentType = 'contract' | 'correspondence';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedChunk {
  id: string;
  text: string;
  pageNumber?: number;
  sourceId: string;
  charStart?: number;
  charEnd?: number;
}

export interface ExtractedDocument {
  id: string;
  name: string;
  type: DocumentType;
  pages?: ExtractedPage[];
  chunks?: ExtractedChunk[];
  metadata: {
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
  };
}

export interface IngestionStore {
  contract?: ExtractedDocument;
  correspondence?: ExtractedDocument;
  analysis?: AnalysisResult;
  projectData?: ProjectData;
  citations?: Citation[];
}

// ---------------------------------------------------------------------------
// Report model — matches docs/rebuild/final-report-template.md
// ---------------------------------------------------------------------------

export type ReportStatus = 'idle' | 'generating' | 'ready' | 'failed';

export type ReportStatusValue = 'Draft' | 'Ready' | 'Updated' | 'Superseded';

export interface ReportSection {
  heading: string;
  content: string;
}

// Structured decision block for Section 3 (Arcadis Position)
export interface ArcadisPosition {
  scopeStatus:     string;  // In Scope | Out of Scope | Partially Out of Scope | Unclear
  responsibility:  string;
  feePosition:     string;  // Likely Yes | Possible | Unclear | Likely No
  timePosition:    string;  // Likely Yes | Possible | Unclear | Likely No
  explanation:     string;
}

// Structured entry for Section 4 (Key Contract Clauses)
export interface ClauseEntry {
  reference: string;   // Document / Section / Page
  excerpt:   string;   // Clause text or excerpt
  meaning:   string;   // Plain-English explanation
  whyItMatters: string;
}

// Structured decision block for Section 7 (Schedule Impact)
export interface ScheduleImpact {
  criticalPathImpact: string;  // Yes | Likely | Possible | No | Not Enough Information
  delayRiskLevel:     string;  // Low | Moderate | High | Critical
  explanation:        string;
}

// Structured decision block for Section 8 (Notice)
export interface NoticeRequirements {
  noticeRequired: string;   // Yes | Likely | Unclear | No
  deadline:       string;
  recipient:      string;
  riskIfMissed:   string;
}

// Full 12-section report per final-report-template.md
export interface ReportSections {
  executiveSummary:          ReportSection;
  ownerRequest:              ReportSection;
  arcadisPosition:           ArcadisPosition;
  keyContractClauses:        ClauseEntry[];
  application:               ReportSection;
  commercialAnalysis:        ReportSection;
  scheduleImpact:            ScheduleImpact;
  noticeRequirements:        NoticeRequirements;
  riskAndMitigation:         ReportSection;
  recommendation:            ReportSection;
  draftResponse:             ReportSection;
  sourceSnapshot:            ReportSection;
}

export interface ReportMetadata {
  projectName:       string;
  contractNumber:    string;
  changeRequestId:   string;
  ownerClient:       string;
  dateOfAnalysis:    string;
  reportStatus:      ReportStatusValue;
}

export interface Report {
  id:        string;
  threadId:  string;
  createdAt: string;
  updatedAt: string;
  title:     string;
  metadata:  ReportMetadata;
  sections:  ReportSections;
}
