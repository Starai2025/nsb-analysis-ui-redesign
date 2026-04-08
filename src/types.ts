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
}
