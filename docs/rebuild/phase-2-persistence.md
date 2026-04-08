# Phase 2 — State Persistence

## Goal
Analysis results survive page refresh. Remove dependency on the Express in-memory store for client-side state. The server becomes a pure static file host.

## Pre-condition: Phase 1 must be complete and gated.

## Status: ⬜ Not Started

---

## Background
Currently, analysis results are saved to an in-memory object in `server.ts` via `POST /api/save-analysis` and read back via `GET /api/store`. This means:
- Refreshing the page after analysis may lose results (if the server restarts)
- Multi-user deployments would have data collisions
- The server is a stateful dependency when it doesn't need to be

Since the AI analysis runs entirely client-side (in the browser), the results should also be stored client-side.

---

## Deliverables

### 2.1 — Create a Persistence Service
**File:** `src/lib/store.ts`

Create a typed localStorage wrapper:
```typescript
export const analysisStore = {
  save: (data: AnalysisStore) => void
  load: () => AnalysisStore | null
  clear: () => void
}
```

Use `JSON.stringify` / `JSON.parse` with try/catch. Handle storage quota errors gracefully.

---

### 2.2 — Update IntakePage to Use localStorage
**File:** `src/pages/IntakePage.tsx`

After Gemini analysis completes, call `analysisStore.save()` instead of (or in addition to) `POST /api/save-analysis`. Remove the `/api/save-analysis` call if server storage is fully deprecated.

---

### 2.3 — Update DecisionSummaryPage to Use localStorage
**File:** `src/pages/DecisionSummaryPage.tsx`

Replace `fetch('/api/store')` with `analysisStore.load()`. Handle the null case (no analysis yet).

---

### 2.4 — Update ReportPage to Use localStorage
**File:** `src/pages/ReportPage.tsx`

Same as above — load from `analysisStore` instead of `/api/store`.

---

### 2.5 — Simplify server.ts
**File:** `server.ts`

Remove the in-memory store, `/api/store`, and `/api/save-analysis` endpoints. Server becomes a pure static file server + Vite dev proxy only.

Optionally: keep a lightweight `/api/health` endpoint for deployment monitoring.

---

### 2.6 — Add "Clear Analysis" Capability
Add a way for users to clear the stored analysis (e.g., a "New Analysis" button on the Summary or Report pages) that calls `analysisStore.clear()` and navigates back to `/intake`.

---

## Data Shape in localStorage
Key: `nsb_analysis`
Value: JSON serialized `AnalysisStore` type from `src/types.ts`.

---

## Success Criteria
- [ ] Complete an analysis, then hard refresh the browser — analysis data is still present
- [ ] Navigate between Summary and Report — data loads from localStorage, no server calls needed
- [ ] `/api/store` endpoint removed or returns 404
- [ ] `npm run build` succeeds
- [ ] No data leaks between different analysis runs (clear works correctly)

## Gate
Run `/phase-gate 2` before marking this phase complete.
