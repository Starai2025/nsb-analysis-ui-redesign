import type { NSBThread } from './db';
import type {
  AnalysisResult,
  ArtifactRecord,
  Citation,
  DocumentCategory,
  DraftVersionRecord,
  ProjectAnalysisRecord,
  ProjectData,
  ProjectDocumentRecord,
  ProjectRecord,
  ReportVersionRecord,
  WorkspaceStatus,
} from '../types';

export const LEGACY_COMPAT_PROJECT_ID = 'current';
export const LEGACY_ANALYSIS_RECORD_ID = (projectId: string) => `${projectId}:analysis:current`;
export const LEGACY_DOCUMENT_RECORD_ID = (projectId: string, type: 'contract' | 'correspondence') =>
  `${projectId}:document:${type}`;
export const LEGACY_CONTRACT_BLOB_ARTIFACT_ID = (projectId: string) => `${projectId}:artifact:contract-blob`;

function inferWorkspaceStatus(thread: Pick<NSBThread, 'analysis'>): WorkspaceStatus {
  return thread.analysis ? 'analysis-ready' : 'ready';
}

function inferDocumentCategory(type: 'contract' | 'correspondence'): DocumentCategory {
  return type === 'contract' ? 'governing-agreement' : 'correspondence-review-comments';
}

function normalizeCitations(citations: Citation[] | undefined): Citation[] {
  return citations ?? [];
}

export function normalizeProjectData(projectData: ProjectData, fallbackId = LEGACY_COMPAT_PROJECT_ID): ProjectData {
  return {
    ...projectData,
    id: projectData.id ?? fallbackId,
  };
}

export function createProjectRecordFromThread(thread: NSBThread): ProjectRecord {
  const projectId = thread.projectData.id ?? LEGACY_COMPAT_PROJECT_ID;

  return {
    id: projectId,
    legacyThreadId: thread.id,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    status: inferWorkspaceStatus(thread),
    projectData: normalizeProjectData(thread.projectData, projectId),
    profileId: thread.projectData.projectProfileId,
    primaryRoleId: thread.projectData.primaryRoleId,
    currentAnalysisId: LEGACY_ANALYSIS_RECORD_ID(projectId),
    currentReportId: thread.report?.id,
    currentDraftId: thread.draft?.id,
    lastError: null,
  };
}

export function createDocumentRecordsFromThread(thread: NSBThread): ProjectDocumentRecord[] {
  const projectId = thread.projectData.id ?? LEGACY_COMPAT_PROJECT_ID;
  const records: ProjectDocumentRecord[] = [];

  if (thread.contract) {
    records.push({
      id: LEGACY_DOCUMENT_RECORD_ID(projectId, 'contract'),
      projectId,
      category: inferDocumentCategory('contract'),
      analysisRole: 'core',
      sourceRole: 'governing-agreement',
      legacyType: 'contract',
      legacyDocumentId: thread.contract.id,
      extractionId: thread.contract.id,
      name: thread.contract.name,
      mimeType: thread.contract.metadata.mimeType,
      fileSize: thread.contract.metadata.fileSize,
      uploadedAt: thread.contract.metadata.uploadedAt,
      pageCount: thread.contract.metadata.pageCount,
      blobArtifactId: thread.contractBlob ? LEGACY_CONTRACT_BLOB_ARTIFACT_ID(projectId) : undefined,
      extractionStatus: 'extracted',
      status: 'used-in-analysis',
      usedInLatestAnalysis: true,
    });
  }

  if (thread.correspondence) {
    records.push({
      id: LEGACY_DOCUMENT_RECORD_ID(projectId, 'correspondence'),
      projectId,
      category: inferDocumentCategory('correspondence'),
      analysisRole: 'core',
      sourceRole: 'review-correspondence',
      legacyType: 'correspondence',
      legacyDocumentId: thread.correspondence.id,
      extractionId: thread.correspondence.id,
      name: thread.correspondence.name,
      mimeType: thread.correspondence.metadata.mimeType,
      fileSize: thread.correspondence.metadata.fileSize,
      uploadedAt: thread.correspondence.metadata.uploadedAt,
      pageCount: thread.correspondence.metadata.pageCount,
      extractionStatus: 'extracted',
      status: 'used-in-analysis',
      usedInLatestAnalysis: true,
    });
  }

  return records;
}

export function createAnalysisRecordFromThread(thread: NSBThread): ProjectAnalysisRecord {
  const projectId = thread.projectData.id ?? LEGACY_COMPAT_PROJECT_ID;

  return {
    id: LEGACY_ANALYSIS_RECORD_ID(projectId),
    projectId,
    contractDocumentId: thread.contract ? LEGACY_DOCUMENT_RECORD_ID(projectId, 'contract') : undefined,
    correspondenceDocumentId: thread.correspondence
      ? LEGACY_DOCUMENT_RECORD_ID(projectId, 'correspondence')
      : undefined,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    analysis: thread.analysis,
    citations: normalizeCitations(thread.citations as Citation[] | undefined),
    contract: thread.contract,
    correspondence: thread.correspondence,
  };
}

function getVersionNumber(createdAt: string | undefined): number {
  if (!createdAt) return 1;
  const timestamp = Date.parse(createdAt);
  return Number.isNaN(timestamp) ? 1 : timestamp;
}

export function createReportVersionRecordFromThread(thread: NSBThread): ReportVersionRecord | null {
  if (!thread.report) return null;

  const projectId = thread.projectData.id ?? LEGACY_COMPAT_PROJECT_ID;

  return {
    id: thread.report.id,
    projectId,
    analysisId: LEGACY_ANALYSIS_RECORD_ID(projectId),
    versionNumber: getVersionNumber(thread.report.createdAt),
    status: 'current',
    origin: 'generated',
    createdAt: thread.report.createdAt,
    updatedAt: thread.report.updatedAt,
    report: thread.report,
  };
}

export function createDraftVersionRecordFromThread(thread: NSBThread): DraftVersionRecord | null {
  if (!thread.draft) return null;

  const projectId = thread.projectData.id ?? LEGACY_COMPAT_PROJECT_ID;

  return {
    id: thread.draft.id,
    projectId,
    analysisId: LEGACY_ANALYSIS_RECORD_ID(projectId),
    reportVersionId: thread.report?.id,
    versionNumber: getVersionNumber(thread.draft.createdAt),
    status: 'current',
    origin: 'generated',
    createdAt: thread.draft.createdAt,
    updatedAt: thread.draft.updatedAt,
    draft: thread.draft,
  };
}

export function createArtifactRecordsFromThread(thread: NSBThread): ArtifactRecord[] {
  const projectId = thread.projectData.id ?? LEGACY_COMPAT_PROJECT_ID;

  if (!thread.contractBlob) {
    return [];
  }

  return [{
    id: LEGACY_CONTRACT_BLOB_ARTIFACT_ID(projectId),
    projectId,
    kind: 'contract-blob',
    mimeType: thread.contract?.metadata.mimeType ?? 'application/pdf',
    name: thread.contract?.name,
    createdAt: thread.updatedAt,
    updatedAt: thread.updatedAt,
    arrayBuffer: thread.contractBlob,
  }];
}

export function mergeProjectData(
  existing: ProjectData | undefined,
  incoming: ProjectData,
  fallbackId = LEGACY_COMPAT_PROJECT_ID,
): ProjectData {
  return normalizeProjectData(
    {
      ...(existing ?? {}),
      ...incoming,
    },
    existing?.id ?? fallbackId,
  );
}

export function getLegacyCompatibilityRecordIds(projectId: string) {
  return {
    analysisId: LEGACY_ANALYSIS_RECORD_ID(projectId),
    contractDocumentId: LEGACY_DOCUMENT_RECORD_ID(projectId, 'contract'),
    correspondenceDocumentId: LEGACY_DOCUMENT_RECORD_ID(projectId, 'correspondence'),
    contractBlobArtifactId: LEGACY_CONTRACT_BLOB_ARTIFACT_ID(projectId),
  };
}

export type ThreadScaffoldSnapshot = {
  project: ProjectRecord;
  analysis: ProjectAnalysisRecord;
  documents: ProjectDocumentRecord[];
  report: ReportVersionRecord | null;
  draft: DraftVersionRecord | null;
  artifacts: ArtifactRecord[];
};

export function createScaffoldSnapshotFromThread(thread: NSBThread): ThreadScaffoldSnapshot {
  return {
    project: createProjectRecordFromThread(thread),
    analysis: createAnalysisRecordFromThread(thread),
    documents: createDocumentRecordsFromThread(thread),
    report: createReportVersionRecordFromThread(thread),
    draft: createDraftVersionRecordFromThread(thread),
    artifacts: createArtifactRecordsFromThread(thread),
  };
}

export function createBlankAnalysis(): AnalysisResult {
  return {
    executiveConclusion: '',
    scopeStatus: '',
    primaryResponsibility: '',
    secondaryResponsibility: '',
    extraMoneyLikely: false,
    extraTimeLikely: false,
    claimableAmount: '',
    extraDays: '',
    noticeDeadline: '',
    strategicRecommendation: '',
    keyRisks: [],
  };
}
