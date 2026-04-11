/**
 * NSB IndexedDB Service
 *
 * Schema (per CLAUDE.md):
 *   Store: threads   — keyPath: 'id'  — all analysis threads
 *   Store: preferences — keyPath implicit (out-of-line) — tiny UI state
 *
 * Phase 2 uses a single fixed thread id ('current').
 * Phase 9 will add multi-thread support without schema migration.
 */

import { IngestionStore, AnalysisResult, ProjectData, Report, Draft } from '../types';

const DB_NAME    = 'nsb-db';
const DB_VERSION = 1;
const THREADS    = 'threads';
const PREFS      = 'preferences';

export const CURRENT_THREAD_ID = 'current';

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
}

// ---------------------------------------------------------------------------
// Open / initialize
// ---------------------------------------------------------------------------

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(THREADS)) {
        db.createObjectStore(THREADS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PREFS)) {
        db.createObjectStore(PREFS);
      }
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
  const db  = await openDB();
  const now = new Date().toISOString();

  // Load existing to preserve createdAt
  const existing = await loadCurrentThread();

  const thread: NSBThread = {
    id:             CURRENT_THREAD_ID,
    createdAt:      existing?.createdAt ?? data.createdAt ?? now,
    updatedAt:      now,
    projectData:    data.projectData,
    analysis:       data.analysis,
    contract:       data.contract,
    correspondence: data.correspondence,
    citations:      data.citations,
    draft:          data.draft,
    chatHistory:    data.chatHistory,
    report:         data.report,
  };

  return new Promise((resolve, reject) => {
    const tx  = db.transaction(THREADS, 'readwrite');
    const req = tx.objectStore(THREADS).put(thread);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/** Load the current analysis thread from IndexedDB. Returns null if none exists. */
export async function loadCurrentThread(): Promise<NSBThread | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(THREADS, 'readonly');
      const req = tx.objectStore(THREADS).get(CURRENT_THREAD_ID);
      req.onsuccess = () => resolve((req.result as NSBThread) ?? null);
      req.onerror   = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/** Clear the current analysis thread (e.g., "New Analysis" action). */
export async function clearCurrentThread(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(THREADS, 'readwrite');
    const req = tx.objectStore(THREADS).delete(CURRENT_THREAD_ID);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Preferences helpers
// ---------------------------------------------------------------------------

/** Store a small UI preference value (replaces any previous value for this key). */
export async function setPreference(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(PREFS, 'readwrite');
    const req = tx.objectStore(PREFS).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/** Read a UI preference value. Returns null if not set. */
export async function getPreference<T = unknown>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(PREFS, 'readonly');
      const req = tx.objectStore(PREFS).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror   = () => reject(req.error);
    });
  } catch {
    return null;
  }
}
