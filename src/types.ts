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
  analysis?: any;
  projectData?: ProjectData;
}

// ---------------------------------------------------------------------------
// Report model
// ---------------------------------------------------------------------------

export type ReportStatus = 'idle' | 'generating' | 'ready' | 'failed';

export interface ReportSection {
  heading: string;
  content: string;
}

export interface ReportSections {
  executiveSummary:       ReportSection;
  scopeAndResponsibility: ReportSection;
  commercialAnalysis:     ReportSection;
  scheduleImpact:         ReportSection;
  recommendation:         ReportSection;
}

export interface Report {
  id:        string;
  threadId:  string;
  createdAt: string;
  updatedAt: string;
  title:     string;
  sections:  ReportSections;
}
