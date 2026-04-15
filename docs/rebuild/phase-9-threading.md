# Phase 9 — Threading & History

## Goal
Users can run multiple analyses and switch between them. A history panel shows all past analyses with project name, date, and key findings. This transforms NSB from a single-session tool into a persistent project intelligence platform.

## Pre-condition: Phases 2–8 must be complete and gated.

## Status: ⬜ Not Started

---

## Background
Currently, the app supports exactly one analysis at a time. Running a new analysis overwrites the previous one. For real users managing multiple projects or change orders, this is a major limitation. Phase 9 adds a thread-based model where each analysis is a discrete, named session.

---

## Deliverables

### 9.1 — Thread Data Model
**File:** `src/types.ts`

```typescript
export interface AnalysisThread {
  id: string                    // uuid
  createdAt: string             // ISO date
  updatedAt: string
  projectData: ProjectData
  analysis: AnalysisResult
  contract: ExtractedDocument
  correspondence: ExtractedDocument
  citations: Citation[]
  draft?: DraftResponse
  chatHistory?: ChatMessage[]
}
```

---

### 9.2 — Thread Store
**File:** `src/lib/store.ts`

Extend the persistence service:
```typescript
export const threadStore = {
  getAll: () => AnalysisThread[]
  getById: (id: string) => AnalysisThread | null
  save: (thread: AnalysisThread) => void
  delete: (id: string) => void
  setActive: (id: string) => void
  getActive: () => AnalysisThread | null
}
```

Store all threads in `localStorage` under key `nsb_threads`. Store active thread ID under `nsb_active_thread`.

Handle the storage limit: if threads would exceed ~4MB, prompt the user to delete old ones.

---

### 9.3 — History Sidebar Panel
**File:** `src/components/Sidebar.tsx`

Add a "History" section to the sidebar below the main nav:
- List the 10 most recent threads by `updatedAt`
- Show project name, change request ID, and date
- Clicking a thread loads it as the active thread
- Active thread is visually highlighted
- "New Analysis" button clears the active thread and navigates to `/intake`

---

### 9.4 — Thread-Aware Pages
All pages that read from `analysisStore` must be updated to read from `threadStore.getActive()` instead:
- `src/pages/DecisionSummaryPage.tsx`
- `src/pages/ReportPage.tsx`
- `src/pages/SourcesPage.tsx`
- `src/pages/DraftResponsePage.tsx`
- `src/components/AskTheContract.tsx`

---

### 9.5 — IntakePage Thread Creation
**File:** `src/pages/IntakePage.tsx`

After analysis completes:
- Create a new `AnalysisThread` with a generated UUID
- Save it to `threadStore`
- Set it as the active thread
- Navigate to `/summary`

---

### 9.6 — Thread Comparison View (Stretch Goal)
**File:** `src/pages/` (new page)

A `/compare` route that allows side-by-side comparison of two selected threads:
- Show key metrics (claimable amount, extra days, scope status) for each
- Highlight differences
- Export comparison as PDF

This is a stretch goal — implement only after core threading is working.

---

### 9.7 — TopBar Thread Indicator
**File:** `src/components/TopBar.tsx`

Show the active thread's project name + change request ID in the TopBar.
Replace hardcoded text with real thread data.

---

## Storage Budget
- Each thread is approximately 50–200KB depending on document size
- Target: support at least 20 threads before hitting localStorage limits
- Implement a "You're approaching your storage limit" warning at 80% capacity
- Allow users to export all threads as JSON (for backup)

---

## Success Criteria
- [ ] Running two analyses creates two separate threads
- [ ] Clicking a thread in the sidebar loads its data into all pages
- [ ] New Analysis button starts a fresh intake without losing previous threads
- [ ] Thread list shows project name and date for each entry
- [ ] Active thread indicator in TopBar shows current project name
- [ ] Deleting a thread removes it from the list and clears it from localStorage
- [ ] Storage warning appears when approaching limit

## Gate
Run `/phase-gate 9` before marking this phase complete.
