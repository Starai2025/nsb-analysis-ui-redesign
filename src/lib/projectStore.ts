import type {
  ArtifactRecord,
  CommentRecord,
  DeadlineRecord,
  DraftVersionRecord,
  IssueRecord,
  ProjectAnalysisRecord,
  ProjectDocumentRecord,
  ProjectRecord,
  ProjectWorkspaceSnapshot,
  ReportVersionRecord,
  SubmittalRecord,
} from '../types';
import type { NSBThread } from './db';
import {
  ACTIVE_PROJECT_PREFERENCE_KEY,
  ANALYSES_STORE,
  ARTIFACTS_STORE,
  COMMENTS_STORE,
  CURRENT_THREAD_ID,
  DEADLINES_STORE,
  DOCUMENTS_STORE,
  DRAFTS_STORE,
  ISSUES_STORE,
  PROJECTS_STORE,
  REPORTS_STORE,
  SUBMITTALS_STORE,
  getPreference,
  openDatabase,
  setPreference,
} from './db';
import { LEGACY_COMPAT_PROJECT_ID } from './storageAdapter';

type ProjectScopedStoreName =
  | typeof DOCUMENTS_STORE
  | typeof ANALYSES_STORE
  | typeof ISSUES_STORE
  | typeof SUBMITTALS_STORE
  | typeof COMMENTS_STORE
  | typeof DEADLINES_STORE
  | typeof REPORTS_STORE
  | typeof DRAFTS_STORE
  | typeof ARTIFACTS_STORE;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionToPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted.'));
  });
}

async function putRecord<T>(storeName: string, record: T): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).put(record);
  await transactionToPromise(tx);
}

async function getRecord<T>(storeName: string, id: string): Promise<T | null> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readonly');
  const record = await requestToPromise(tx.objectStore(storeName).get(id) as IDBRequest<T | undefined>);
  await transactionToPromise(tx);
  return (record as T | undefined) ?? null;
}

async function deleteRecord(storeName: string, id: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).delete(id);
  await transactionToPromise(tx);
}

async function getAllByProjectId<T>(storeName: ProjectScopedStoreName, projectId: string): Promise<T[]> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, 'readonly');
  const records = await requestToPromise(
    tx.objectStore(storeName).index('projectId').getAll(projectId) as IDBRequest<T[]>,
  );
  await transactionToPromise(tx);
  return records;
}

function stripArtifactBuffers(record: ArtifactRecord): ArtifactRecord {
  const { arrayBuffer, payload, ...rest } = record;
  return rest;
}

function byMostRecent<T extends { updatedAt: string; createdAt: string }>(records: T[]): T[] {
  return [...records].sort((left, right) => {
    const rightTime = Date.parse(right.updatedAt || right.createdAt || '') || 0;
    const leftTime = Date.parse(left.updatedAt || left.createdAt || '') || 0;
    return rightTime - leftTime;
  });
}

export async function saveProjectRecord(record: ProjectRecord): Promise<void> {
  await putRecord(PROJECTS_STORE, record);
}

export async function setActiveProjectId(projectId: string | null): Promise<void> {
  if (projectId) {
    await setPreference(ACTIVE_PROJECT_PREFERENCE_KEY, projectId);
    return;
  }

  await setPreference(ACTIVE_PROJECT_PREFERENCE_KEY, null);
}

export async function loadActiveProjectId(): Promise<string | null> {
  return getPreference<string>(ACTIVE_PROJECT_PREFERENCE_KEY);
}

export async function loadProjectRecord(projectId: string): Promise<ProjectRecord | null> {
  return getRecord<ProjectRecord>(PROJECTS_STORE, projectId);
}

export async function loadCurrentProjectRecord(): Promise<ProjectRecord | null> {
  const activeProjectId = await loadActiveProjectId();
  if (activeProjectId) {
    const activeProject = await loadProjectRecord(activeProjectId);
    if (activeProject) {
      return activeProject;
    }
  }

  return loadProjectRecord(LEGACY_COMPAT_PROJECT_ID);
}

export async function saveProjectDocumentRecord(record: ProjectDocumentRecord): Promise<void> {
  await putRecord(DOCUMENTS_STORE, record);
}

export async function removeProjectDocumentRecord(id: string): Promise<void> {
  await deleteRecord(DOCUMENTS_STORE, id);
}

export async function listProjectDocumentRecords(projectId: string): Promise<ProjectDocumentRecord[]> {
  return getAllByProjectId<ProjectDocumentRecord>(DOCUMENTS_STORE, projectId);
}

export async function saveProjectAnalysisRecord(record: ProjectAnalysisRecord): Promise<void> {
  await putRecord(ANALYSES_STORE, record);
}

export async function listProjectAnalysisRecords(projectId: string): Promise<ProjectAnalysisRecord[]> {
  return getAllByProjectId<ProjectAnalysisRecord>(ANALYSES_STORE, projectId);
}

export async function saveIssueRecord(record: IssueRecord): Promise<void> {
  await putRecord(ISSUES_STORE, record);
}

export async function listIssueRecords(projectId: string): Promise<IssueRecord[]> {
  return getAllByProjectId<IssueRecord>(ISSUES_STORE, projectId);
}

export async function saveSubmittalRecord(record: SubmittalRecord): Promise<void> {
  await putRecord(SUBMITTALS_STORE, record);
}

export async function listSubmittalRecords(projectId: string): Promise<SubmittalRecord[]> {
  return getAllByProjectId<SubmittalRecord>(SUBMITTALS_STORE, projectId);
}

export async function saveCommentRecord(record: CommentRecord): Promise<void> {
  await putRecord(COMMENTS_STORE, record);
}

export async function listCommentRecords(projectId: string): Promise<CommentRecord[]> {
  return getAllByProjectId<CommentRecord>(COMMENTS_STORE, projectId);
}

export async function saveDeadlineRecord(record: DeadlineRecord): Promise<void> {
  await putRecord(DEADLINES_STORE, record);
}

export async function listDeadlineRecords(projectId: string): Promise<DeadlineRecord[]> {
  return getAllByProjectId<DeadlineRecord>(DEADLINES_STORE, projectId);
}

export async function saveReportVersionRecord(record: ReportVersionRecord): Promise<void> {
  await putRecord(REPORTS_STORE, record);
}

export async function listReportVersionRecords(projectId: string): Promise<ReportVersionRecord[]> {
  return getAllByProjectId<ReportVersionRecord>(REPORTS_STORE, projectId);
}

export async function saveDraftVersionRecord(record: DraftVersionRecord): Promise<void> {
  await putRecord(DRAFTS_STORE, record);
}

export async function listDraftVersionRecords(projectId: string): Promise<DraftVersionRecord[]> {
  return getAllByProjectId<DraftVersionRecord>(DRAFTS_STORE, projectId);
}

export async function saveArtifactRecord(record: ArtifactRecord): Promise<void> {
  await putRecord(ARTIFACTS_STORE, record);
}

export async function loadArtifactRecord(
  id: string,
  options: { includeBuffer?: boolean } = {},
): Promise<ArtifactRecord | null> {
  const record = await getRecord<ArtifactRecord>(ARTIFACTS_STORE, id);
  if (!record) return null;

  return options.includeBuffer ? record : stripArtifactBuffers(record);
}

export async function listArtifactRecords(
  projectId: string,
  options: { includeBuffers?: boolean } = {},
): Promise<ArtifactRecord[]> {
  const records = await getAllByProjectId<ArtifactRecord>(ARTIFACTS_STORE, projectId);
  return options.includeBuffers ? records : records.map(stripArtifactBuffers);
}

export async function removeArtifactRecord(id: string): Promise<void> {
  await deleteRecord(ARTIFACTS_STORE, id);
}

export async function loadCurrentWorkspaceSnapshot(
  options: { includeArtifactBuffers?: boolean } = {},
): Promise<ProjectWorkspaceSnapshot | null> {
  const project = await loadCurrentProjectRecord();
  if (!project) return null;

  const projectId = project.id;
  const [documents, analyses, issues, submittals, comments, deadlines, reports, drafts, artifacts] = await Promise.all([
    listProjectDocumentRecords(projectId),
    listProjectAnalysisRecords(projectId),
    listIssueRecords(projectId),
    listSubmittalRecords(projectId),
    listCommentRecords(projectId),
    listDeadlineRecords(projectId),
    listReportVersionRecords(projectId),
    listDraftVersionRecords(projectId),
    listArtifactRecords(projectId, { includeBuffers: options.includeArtifactBuffers }),
  ]);

  const sortedAnalyses = byMostRecent(analyses);
  const sortedReports = byMostRecent(reports);
  const sortedDrafts = byMostRecent(drafts);

  const latestAnalysis =
    analyses.find((record) => record.id === project.currentAnalysisId)
    ?? sortedAnalyses[0]
    ?? null;
  const currentReport =
    reports.find((record) => record.id === project.currentReportId)
    ?? sortedReports[0]
    ?? null;
  const currentDraft =
    drafts.find((record) => record.id === project.currentDraftId)
    ?? sortedDrafts[0]
    ?? null;

  return {
    project,
    documents,
    latestAnalysis,
    currentReport,
    currentDraft,
    issues,
    submittals,
    comments,
    deadlines,
    reports,
    drafts,
    artifacts,
  };
}

export async function loadCurrentWorkspaceThreadView(
  options: { includeArtifactBuffers?: boolean } = {},
): Promise<NSBThread | null> {
  const snapshot = await loadCurrentWorkspaceSnapshot(options);
  if (!snapshot?.project || !snapshot.latestAnalysis) {
    return null;
  }

  const contractDocument =
    snapshot.documents.find((record) => record.id === snapshot.latestAnalysis?.contractDocumentId)
    ?? snapshot.documents.find((record) => record.category === 'governing-agreement');
  const correspondenceDocument =
    snapshot.documents.find((record) => record.id === snapshot.latestAnalysis?.correspondenceDocumentId)
    ?? snapshot.documents.find((record) => record.category === 'correspondence-review-comments');

  const contractArtifactId = contractDocument?.blobArtifactId;
  const contractArtifact = contractArtifactId
    ? snapshot.artifacts.find((record) => record.id === contractArtifactId)
    : null;

  return {
    id: snapshot.project.legacyThreadId || CURRENT_THREAD_ID,
    createdAt: snapshot.project.createdAt,
    updatedAt: snapshot.latestAnalysis.updatedAt || snapshot.project.updatedAt,
    projectData: snapshot.project.projectData,
    analysis: snapshot.latestAnalysis.analysis,
    contract: snapshot.latestAnalysis.contract ?? (contractDocument ? {
      id: contractDocument.extractionId ?? contractDocument.id,
      name: contractDocument.name,
      type: 'contract',
      metadata: {
        fileSize: contractDocument.fileSize,
        mimeType: contractDocument.mimeType,
        uploadedAt: contractDocument.uploadedAt,
        pageCount: contractDocument.pageCount,
      },
    } : undefined),
    correspondence: snapshot.latestAnalysis.correspondence ?? (correspondenceDocument ? {
      id: correspondenceDocument.extractionId ?? correspondenceDocument.id,
      name: correspondenceDocument.name,
      type: 'correspondence',
      metadata: {
        fileSize: correspondenceDocument.fileSize,
        mimeType: correspondenceDocument.mimeType,
        uploadedAt: correspondenceDocument.uploadedAt,
        pageCount: correspondenceDocument.pageCount,
      },
    } : undefined),
    citations: snapshot.latestAnalysis.citations,
    report: snapshot.currentReport?.report,
    draft: snapshot.currentDraft?.draft,
    chatHistory: undefined,
    contractBlob: contractArtifact?.arrayBuffer,
  };
}
