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
  id?: string;
  name: string;
  contractNumber: string;
  changeRequestId: string;
  state?: string;
  agency?: string;
  deliveryModel?: string;
  ownerClient?: string;
  userRole?: string;
  concessionaire?: string;
  builder?: string;
  leadDesigner?: string;
  demoProfile?: string;
  issueMode?: string;
  scenarioSummary?: string;
  projectProfileId?: ProjectProfileId;
  primaryRoleId?: string;
  workAlreadyProceeding?: boolean;
  noticeAlreadySent?: boolean;
  scheduleImpactKnown?: boolean;
  pricingImpactKnown?: boolean;
}

export type DocumentType = 'contract' | 'correspondence';
export type ProjectProfileId = 'nsb-default' | 'ladot-calcasieu';
export type ContractChainPosition =
  | 'owner-client'
  | 'agency-reviewer'
  | 'concessionaire'
  | 'builder'
  | 'lead-designer'
  | 'designer-of-record'
  | 'internal-reviewer';

export type DocumentCategory =
  | 'governing-agreement'
  | 'correspondence-review-comments'
  | 'technical-provisions'
  | 'proposal-atcs'
  | 'design-package'
  | 'marked-up-review-pdf'
  | 'meeting-minutes'
  | 'submittal-log'
  | 'pricing-backup'
  | 'schedule-backup'
  | 'directive-letter';

export type DocumentAnalysisRole = 'core' | 'supporting' | 'viewer-only';
export type DocumentExtractionStatus =
  | 'staged-locally'
  | 'queued'
  | 'extracting'
  | 'extracted'
  | 'failed'
  | 'not-applicable';
export type WorkspaceStatus = 'setup' | 'ready' | 'analyzing' | 'analysis-failed' | 'analysis-ready';
export type IssueTaxonomy =
  | 'design-correction'
  | 'incomplete-submittal'
  | 'conflict-in-criteria'
  | 'stricter-standard-enforcement'
  | 'owner-driven-change'
  | 'agency-interpretation-shift'
  | 'delay-risk'
  | 'compensation-risk'
  | 'directive-candidate'
  | 'mixed-issue'
  | 'unclear';

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IssueConfidence = 'high' | 'medium' | 'low';
export type ClauseFamily =
  | 'hierarchy'
  | 'submittal_review'
  | 'anti_reliance'
  | 'delay_events'
  | 'compensation_events'
  | 'ladot_changes'
  | 'directive'
  | 'pricing_support';
export type ClauseSubtype =
  | 'document_precedence'
  | 'higher_standard_control'
  | 'proposal_commitment_binding'
  | 'atc_condition_binding'
  | 'submittal_review_window'
  | 'incomplete_submittal_return'
  | 'review_clock_rule'
  | 'review_nonreliance'
  | 'approval_nonwaiver'
  | 'delay_compensation_carveout'
  | 'delay_event_notice'
  | 'delay_event_claim_submission'
  | 'delay_event_waiver'
  | 'compensation_event_notice'
  | 'compensation_event_claim_submission'
  | 'compensation_event_waiver'
  | 'estimate_then_supplement'
  | 'request_for_change_proposal'
  | 'change_order_required'
  | 'change_work_conditions_precedent'
  | 'directive_letter'
  | 'proceed_while_disputed'
  | 'post_dispute_change_order'
  | 'subcontract_pricing_documents'
  | 'lead_designer_pricing_documents'
  | 'open_book_pricing'
  | 'original_pricing_verification';
export type ClauseLinkedIssueType = IssueTaxonomy;
export type ClauseLinkedDeadlineType =
  | 'submittal_review_followup'
  | 'delay_event_notice_review'
  | 'delay_claim_due'
  | 'compensation_notice_review'
  | 'compensation_claim_due'
  | 'directive_followup'
  | 'dispute_escalation_review'
  | 'pricing_support_request_due';
export type ClauseLinkedOutputType =
  | 'summary_support'
  | 'sources_library'
  | 'report_body'
  | 'report_appendix'
  | 'draft_context';
export type DeadlineType =
  | 'submittal-response-reminder'
  | 'delay-notice-review'
  | 'compensation-notice-review'
  | 'directive-follow-up'
  | 'internal-escalation'
  | 'report-due'
  | 'draft-due';

export type DeadlineStatus = 'open' | 'watch' | 'completed' | 'dismissed' | 'superseded';
export type OutputOrigin = 'generated' | 'user-edited' | 'generated-and-edited';
export type OutputVersionStatus = 'working' | 'current' | 'archived' | 'superseded';

export interface ProjectProfile {
  id: ProjectProfileId;
  label: string;
  state?: string;
  agency?: string;
  deliveryModel?: string;
  ownerClient?: string;
  leadDesigner?: string;
  description?: string;
  defaultIssueMode?: string;
}

export interface ProjectRole {
  id: string;
  label: string;
  organization?: string;
  contractChainPosition: ContractChainPosition;
  counterpartyTo?: ContractChainPosition;
  description?: string;
}

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
    pageCount?: number;
  };
}

export interface IngestionStore {
  contract?: ExtractedDocument;
  correspondence?: ExtractedDocument;
  analysis?: AnalysisResult;
  projectData?: ProjectData;
  citations?: Citation[];
}

export interface WorkspaceError {
  source: 'analysis' | 'report' | 'draft' | 'sources' | 'storage';
  message: string;
  at: string;
}

export interface ClausePerspectiveNotes {
  designer: string;
  builder: string;
  developer: string;
  reviewer: string;
}

export interface ClauseLinkage {
  linkedIssueTypes: ClauseLinkedIssueType[];
  linkedDeadlineTypes: ClauseLinkedDeadlineType[];
  linkedOutputTypes: ClauseLinkedOutputType[];
}

export interface ClauseRecord extends ClauseLinkage {
  id: string;
  projectId: string;
  documentId: string;
  documentType: DocumentType;
  sectionRef: string;
  pageRef: string;
  title: string;
  clauseFamily: ClauseFamily;
  clauseSubtype: ClauseSubtype;
  excerpt: string;
  plainEnglishMeaning: string;
  whyItMatters: string;
  triggerConditions: string[];
  perspectiveNotes: ClausePerspectiveNotes;
  confidence: 'High' | 'Medium' | 'Low';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ClauseSupportView {
  id: string;
  title: string;
  sourceRef: string;
  clauseFamily: ClauseFamily;
  clauseSubtype: ClauseSubtype;
  whyItMatters: string;
  confidence: ClauseRecord['confidence'];
  linkedIssueTypes: ClauseLinkedIssueType[];
  linkedDeadlineTypes: ClauseLinkedDeadlineType[];
  linkedOutputTypes: ClauseLinkedOutputType[];
}

export interface ClauseExtractionResult {
  projectId: string;
  documentId: string;
  documentType: DocumentType;
  clauseIds: string[];
  seededFrom: 'calcasieu-curated';
  generatedAt: string;
  clauses: ClauseRecord[];
}

export interface ProjectRecord {
  id: string;
  legacyThreadId: string;
  createdAt: string;
  updatedAt: string;
  status: WorkspaceStatus;
  projectData: ProjectData;
  profileId?: ProjectProfileId;
  primaryRoleId?: string;
  currentAnalysisId?: string;
  currentReportId?: string;
  currentDraftId?: string;
  lastError?: WorkspaceError | null;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  category: DocumentCategory;
  analysisRole: DocumentAnalysisRole;
  sourceRole?: string;
  legacyType?: DocumentType;
  legacyDocumentId?: string;
  extractionId?: string;
  name: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  pageCount?: number;
  revision?: string;
  discipline?: string;
  blobArtifactId?: string;
  extractionStatus: DocumentExtractionStatus;
  status: 'staged' | 'used-in-analysis' | 'reference-only';
  usedInLatestAnalysis: boolean;
}

export type ProjectDocumentRecord = ProjectDocument;

export interface ProjectAnalysisRecord {
  id: string;
  projectId: string;
  contractDocumentId?: string;
  correspondenceDocumentId?: string;
  createdAt: string;
  updatedAt: string;
  analysis: AnalysisResult;
  citations: Citation[];
  contract?: ExtractedDocument;
  correspondence?: ExtractedDocument;
  knowledgeMeta?: Record<string, unknown>;
}

export interface IssueRecord {
  id: string;
  projectId: string;
  title: string;
  taxonomy: IssueTaxonomy;
  status: 'open' | 'watch' | 'closed';
  severity: IssueSeverity;
  confidence: IssueConfidence;
  summary: string;
  responsibilityHypothesis?: string;
  sourceDocumentIds: string[];
  correspondenceItemIds: string[];
  linkedDeadlineIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SubmittalRecord {
  id: string;
  projectId: string;
  issueId?: string;
  name: string;
  discipline?: string;
  revisionLabel?: string;
  status:
    | 'draft'
    | 'submitted'
    | 'under-review'
    | 'rejected'
    | 'revise-and-resubmit'
    | 'accepted-with-comments'
    | 'accepted'
    | 'superseded';
  submittedAt?: string;
  respondedAt?: string;
  reviewOutcome?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentRecord {
  id: string;
  projectId: string;
  issueId?: string;
  documentId: string;
  author?: string;
  direction?: 'incoming' | 'outgoing' | 'internal';
  sentAt?: string;
  summary: string;
  pageRefs?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DeadlineRecord {
  id: string;
  projectId: string;
  issueId?: string;
  type: DeadlineType;
  status: DeadlineStatus;
  dueAt?: string;
  sourceDocumentId?: string;
  sourcePage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReportVersionReference {
  currentVersionId?: string;
  versionIds: string[];
  latestGeneratedAt?: string;
}

export interface DraftVersionReference {
  currentVersionId?: string;
  versionIds: string[];
  latestGeneratedAt?: string;
}

export interface ArtifactReference {
  id: string;
  projectId: string;
  kind: string;
  mimeType?: string;
  name?: string;
  createdAt: string;
}

export interface ActiveProjectSummary {
  projectId: string;
  name: string;
  contractNumber: string;
  changeRequestId: string;
  status: WorkspaceStatus;
  profileId?: ProjectProfileId;
  primaryRoleId?: string;
  currentAnalysisId?: string;
  currentReportId?: string;
  currentDraftId?: string;
  documentCount: number;
  issueCount: number;
  updatedAt: string;
  lastError?: WorkspaceError | null;
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

// ---------------------------------------------------------------------------
// Draft model — matches Phase 8 DraftResponsePage
// ---------------------------------------------------------------------------

export type DraftStatus = 'idle' | 'generating' | 'ready' | 'failed';

export interface DraftStrategy {
  whatChanged:         string;
  arcadisPosition:     string;
  criticalPathImpact:  string;   // Yes | Likely | Possible | No
  scheduleDelayRisk:   string;   // Low | Moderate | High | Critical
  mitigationSteps:     string[];
  alternativePaths:    string[];
  recommendedPath:     string;
  commercialContext:   string;
  strategicReminders:  string[];
}

export interface Draft {
  id:        string;
  threadId:  string;
  createdAt: string;
  updatedAt: string;
  letter:    string;
  strategy:  DraftStrategy;
}

export interface ReportVersionRecord {
  id: string;
  projectId: string;
  analysisId?: string;
  versionNumber: number;
  status: OutputVersionStatus;
  origin: OutputOrigin;
  createdAt: string;
  updatedAt: string;
  report: Report;
}

export interface DraftVersionRecord {
  id: string;
  projectId: string;
  analysisId?: string;
  reportVersionId?: string;
  versionNumber: number;
  status: OutputVersionStatus;
  origin: OutputOrigin;
  createdAt: string;
  updatedAt: string;
  draft: Draft;
}

export interface ArtifactRecord {
  id: ArtifactReference['id'];
  projectId: ArtifactReference['projectId'];
  kind: ArtifactReference['kind'];
  mimeType?: ArtifactReference['mimeType'];
  name?: ArtifactReference['name'];
  createdAt: string;
  updatedAt: string;
  arrayBuffer?: ArrayBuffer;
  payload?: Record<string, unknown>;
}

export interface ProjectWorkspaceSnapshot {
  project: ProjectRecord | null;
  documents: ProjectDocumentRecord[];
  latestAnalysis: ProjectAnalysisRecord | null;
  currentReport: ReportVersionRecord | null;
  currentDraft: DraftVersionRecord | null;
  clauses: ClauseRecord[];
  issues: IssueRecord[];
  submittals: SubmittalRecord[];
  comments: CommentRecord[];
  deadlines: DeadlineRecord[];
  reports: ReportVersionRecord[];
  drafts: DraftVersionRecord[];
  artifacts: ArtifactRecord[];
}
