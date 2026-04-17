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
import {
  ACTIVE_PROJECT_PREFERENCE_KEY,
  ANALYSES_STORE,
  ARTIFACTS_STORE,
  COMMENTS_STORE,
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

  const latestAnalysis = analyses.find((record) => record.id === project.currentAnalysisId) ?? analyses[0] ?? null;

  return {
    project,
    documents,
    latestAnalysis,
    issues,
    submittals,
    comments,
    deadlines,
    reports,
    drafts,
    artifacts,
  };
}
