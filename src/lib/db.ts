/**
 * NSB IndexedDB Service
 *
 * Schema (per CLAUDE.md):
 *   Store: threads   — keyPath: 'id'  — all analysis threads
 *   Store: preferences — keyPath implicit (out-of-line) — tiny UI state
 *
 * Phase 2 keeps the single fixed thread id ('current') as a legacy compatibility
 * layer while richer project-oriented stores are introduced underneath it.
 */

import {
  IngestionStore,
  AnalysisResult,
  ProjectData,
  Report,
  Draft,
} from '../types';
import {
  createScaffoldSnapshotFromThread,
  getLegacyCompatibilityRecordIds,
  mergeProjectData,
} from './storageAdapter';

const DB_NAME    = 'nsb-db';
const DB_VERSION = 3;

const THREADS = 'threads';
const PREFS = 'preferences';
export const PROJECTS_STORE = 'projects';
export const DOCUMENTS_STORE = 'documents';
export const ANALYSES_STORE = 'analyses';
export const ISSUES_STORE = 'issues';
export const SUBMITTALS_STORE = 'submittals';
export const COMMENTS_STORE = 'comments';
export const DEADLINES_STORE = 'deadlines';
export const REPORTS_STORE = 'reports';
export const DRAFTS_STORE = 'drafts';
export const ARTIFACTS_STORE = 'artifacts';
export const CLAUSES_STORE = 'clauses';

export const CURRENT_THREAD_ID = 'current';
export const ACTIVE_PROJECT_PREFERENCE_KEY = 'activeProjectId';
const PROJECT_INDEX = 'projectId';
const DOCUMENT_INDEX = 'documentId';
const CLAUSE_FAMILY_INDEX = 'clauseFamily';

export interface NSBThread {
  id:              string;
  createdAt:       string;
  updatedAt:       string;
  projectData:     ProjectData;
  analysis:        AnalysisResult;
  contract?:       IngestionStore['contract'];
  correspondence?: IngestionStore['correspondence'];
  citations?:      any[];
  draft?:          Draft;
  chatHistory?:    any[];
  report?:         Report;
  contractBlob?:   ArrayBuffer;  // original PDF binary for in-browser viewing
}

// ---------------------------------------------------------------------------
// Open / initialize
// ---------------------------------------------------------------------------

let _db: IDBDatabase | null = null;

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

function ensureStore(db: IDBDatabase, tx: IDBTransaction, name: string, options: IDBObjectStoreParameters): IDBObjectStore {
  return db.objectStoreNames.contains(name)
    ? tx.objectStore(name)
    : db.createObjectStore(name, options);
}

function ensureProjectIndex(store: IDBObjectStore): void {
  if (!store.indexNames.contains(PROJECT_INDEX)) {
    store.createIndex(PROJECT_INDEX, PROJECT_INDEX, { unique: false });
  }
}

function ensureClauseIndexes(store: IDBObjectStore): void {
  ensureProjectIndex(store);
  if (!store.indexNames.contains(DOCUMENT_INDEX)) {
    store.createIndex(DOCUMENT_INDEX, DOCUMENT_INDEX, { unique: false });
  }
  if (!store.indexNames.contains(CLAUSE_FAMILY_INDEX)) {
    store.createIndex(CLAUSE_FAMILY_INDEX, CLAUSE_FAMILY_INDEX, { unique: false });
  }
}

function deleteAllByProjectId(tx: IDBTransaction, storeName: string, projectId: string): void {
  const store = tx.objectStore(storeName);
  if (!store.indexNames.contains(PROJECT_INDEX)) return;

  const request = store.index(PROJECT_INDEX).openCursor(IDBKeyRange.only(projectId));
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    cursor.delete();
    cursor.continue();
  };
}

export function openDatabase(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const tx = req.transaction;
      if (!tx) {
        reject(new Error('IndexedDB upgrade transaction was not created.'));
        return;
      }

      ensureStore(db, tx, THREADS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(PREFS)) {
        db.createObjectStore(PREFS);
      }

      ensureStore(db, tx, PROJECTS_STORE, { keyPath: 'id' });
      ensureProjectIndex(ensureStore(db, tx, DOCUMENTS_STORE, { keyPath: 'id' }));
      ensureProjectIndex(ensureStore(db, tx, ANALYSES_STORE, { keyPath: 'id' }));
      ensureProjectIndex(ensureStore(db, tx, ISSUES_STORE, { keyPath: 'id' }));
      ensureProjectIndex(ensureStore(db, tx, SUBMITTALS_STORE, { keyPath: 'id' }));
      ensureProjectIndex(ensureStore(db, tx, COMMENTS_STORE, { keyPath: 'id' }));
      ensureProjectIndex(ensureStore(db, tx, DEADLINES_STORE, { keyPath: 'id' }));
      ensureProjectIndex(ensureStore(db, tx, REPORTS_STORE, { keyPath: 'id' }));
      ensureProjectIndex(ensureStore(db, tx, DRAFTS_STORE, { keyPath: 'id' }));
      ensureProjectIndex(ensureStore(db, tx, ARTIFACTS_STORE, { keyPath: 'id' }));
      ensureClauseIndexes(ensureStore(db, tx, CLAUSES_STORE, { keyPath: 'id' }));
    };

    req.onsuccess = () => {
      _db = req.result;
      _db.onversionchange = () => {
        _db?.close();
        _db = null;
      };
      resolve(_db);
    };

    req.onerror  = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB blocked — close other tabs of this app.'));
  });
}

// ---------------------------------------------------------------------------
// Thread helpers
// ---------------------------------------------------------------------------

/** Save or update the current analysis thread in IndexedDB. */
export async function saveCurrentThread(
  data: Omit<NSBThread, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: string }
): Promise<void> {
  const db  = await openDatabase();
  const now = new Date().toISOString();

  // Load existing to preserve createdAt and any evidence fields not in data
  const existing = await loadCurrentThread();
  const projectData = mergeProjectData(existing?.projectData, data.projectData, existing?.projectData?.id ?? CURRENT_THREAD_ID);

  const thread: NSBThread = {
    id:          CURRENT_THREAD_ID,
    createdAt:   existing?.createdAt ?? data.createdAt ?? now,
    updatedAt:   now,
    projectData,
    analysis:    data.analysis,
    // Evidence fields: use data value if the key is explicitly present in data,
    // otherwise fall back to the existing stored value.
    // Omitting a field preserves it; passing undefined explicitly clears it.
    contract:       ('contract'       in data) ? data.contract       : existing?.contract,
    correspondence: ('correspondence' in data) ? data.correspondence : existing?.correspondence,
    citations:      ('citations'      in data) ? data.citations      : existing?.citations,
    draft:          ('draft'          in data) ? data.draft          : existing?.draft,
    chatHistory:    ('chatHistory'    in data) ? data.chatHistory    : existing?.chatHistory,
    report:         ('report'         in data) ? data.report         : existing?.report,
    contractBlob:   ('contractBlob'   in data) ? data.contractBlob   : existing?.contractBlob,
  };

  const scaffold = createScaffoldSnapshotFromThread(thread);
  const compatibilityIds = getLegacyCompatibilityRecordIds(scaffold.project.id);

  const tx = db.transaction(
    [
      THREADS,
      PREFS,
      PROJECTS_STORE,
      DOCUMENTS_STORE,
      ANALYSES_STORE,
      REPORTS_STORE,
      DRAFTS_STORE,
      ARTIFACTS_STORE,
    ],
    'readwrite',
  );

  tx.objectStore(THREADS).put(thread);
  tx.objectStore(PREFS).put(scaffold.project.id, ACTIVE_PROJECT_PREFERENCE_KEY);
  tx.objectStore(PROJECTS_STORE).put(scaffold.project);
  tx.objectStore(ANALYSES_STORE).put(scaffold.analysis);

  const documentStore = tx.objectStore(DOCUMENTS_STORE);
  documentStore.delete(compatibilityIds.contractDocumentId);
  documentStore.delete(compatibilityIds.correspondenceDocumentId);
  for (const record of scaffold.documents) {
    documentStore.put(record);
  }

  const reportStore = tx.objectStore(REPORTS_STORE);
  if (scaffold.report) {
    reportStore.put(scaffold.report);
  }

  const draftStore = tx.objectStore(DRAFTS_STORE);
  if (scaffold.draft) {
    draftStore.put(scaffold.draft);
  }

  const artifactStore = tx.objectStore(ARTIFACTS_STORE);
  artifactStore.delete(compatibilityIds.contractBlobArtifactId);
  for (const record of scaffold.artifacts) {
    artifactStore.put(record);
  }

  await transactionToPromise(tx);
}

/** Load the current analysis thread from IndexedDB. Returns null if none exists. */
export async function loadCurrentThread(): Promise<NSBThread | null> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(THREADS, 'readonly');
    const thread = await requestToPromise(tx.objectStore(THREADS).get(CURRENT_THREAD_ID) as IDBRequest<NSBThread | undefined>);
    await transactionToPromise(tx);
    return thread ?? null;
  } catch {
    return null;
  }
}

/** Clear the current analysis thread (e.g., "New Analysis" action). */
export async function clearCurrentThread(): Promise<void> {
  const db = await openDatabase();
  const existing = await loadCurrentThread();
  const projectId = existing?.projectData?.id ?? CURRENT_THREAD_ID;

  const tx = db.transaction(
    [
      THREADS,
      PREFS,
      PROJECTS_STORE,
      DOCUMENTS_STORE,
      ANALYSES_STORE,
      REPORTS_STORE,
      DRAFTS_STORE,
      ARTIFACTS_STORE,
      CLAUSES_STORE,
      ISSUES_STORE,
      SUBMITTALS_STORE,
      COMMENTS_STORE,
      DEADLINES_STORE,
    ],
    'readwrite',
  );

  tx.objectStore(THREADS).delete(CURRENT_THREAD_ID);
  tx.objectStore(PREFS).delete(ACTIVE_PROJECT_PREFERENCE_KEY);
  tx.objectStore(PROJECTS_STORE).delete(projectId);

  deleteAllByProjectId(tx, DOCUMENTS_STORE, projectId);
  deleteAllByProjectId(tx, ANALYSES_STORE, projectId);
  deleteAllByProjectId(tx, ISSUES_STORE, projectId);
  deleteAllByProjectId(tx, SUBMITTALS_STORE, projectId);
  deleteAllByProjectId(tx, COMMENTS_STORE, projectId);
  deleteAllByProjectId(tx, DEADLINES_STORE, projectId);
  deleteAllByProjectId(tx, REPORTS_STORE, projectId);
  deleteAllByProjectId(tx, DRAFTS_STORE, projectId);
  deleteAllByProjectId(tx, ARTIFACTS_STORE, projectId);
  deleteAllByProjectId(tx, CLAUSES_STORE, projectId);

  await transactionToPromise(tx);
}

// ---------------------------------------------------------------------------
// Preferences helpers
// ---------------------------------------------------------------------------

/** Store a small UI preference value (replaces any previous value for this key). */
export async function setPreference(key: string, value: unknown): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(PREFS, 'readwrite');
  tx.objectStore(PREFS).put(value, key);
  await transactionToPromise(tx);
}

/** Read a UI preference value. Returns null if not set. */
export async function getPreference<T = unknown>(key: string): Promise<T | null> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(PREFS, 'readonly');
    const value = await requestToPromise(tx.objectStore(PREFS).get(key) as IDBRequest<T | undefined>);
    await transactionToPromise(tx);
    return value ?? null;
  } catch {
    return null;
  }
}
