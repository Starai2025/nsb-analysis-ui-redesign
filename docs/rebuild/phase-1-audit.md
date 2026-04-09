# Phase 1 — Codebase Audit & Stabilization

## Goal
Fix all critical bugs identified in the initial audit. Establish a clean, working baseline that all future phases can build on. After Phase 1, the core flow (upload → analyze → summary → report) must work end-to-end with real documents.

## Status: 🟡 In Progress

---

## Deliverables

### 1.1 — Fix Claude Model Names (CRITICAL)
**Problem:** `claude-3-flash-preview` and `claude-3.1-pro-preview` do not exist. Analysis always fails.
**Fix:** Change model names in `IntakePage.tsx`:
- Primary: `claude-2.0-flash`
- Fallback: `claude-1.5-pro`

**File:** `src/pages/IntakePage.tsx`

---

### 1.2 — Fix Navigation (CRITICAL)
**Problem:** After analysis, `window.location.href = '/summary'` causes a full page reload.
**Fix:** Use `useNavigate()` from react-router-dom.

**File:** `src/pages/IntakePage.tsx`
**File:** `src/pages/DecisionSummaryPage.tsx` (Save & Generate)

---

### 1.3 — Wire Project Details Fields
**Problem:** Project Name, Contract Number, and Change Request # inputs have no state and are never saved.
**Fix:** Add `useState` for each field. Pass values to `/api/save-analysis` payload alongside analysis. Display in Summary and Report pages.

**Files:** `src/pages/IntakePage.tsx`, `src/pages/DecisionSummaryPage.tsx`, `src/pages/ReportPage.tsx`, `src/types.ts`

---

### 1.4 — Remove Hardcoded Project IDs
**Problem:** "Project ID: NSB-2024-082" and "Reference: CN-2024-0892" are hardcoded strings.
**Fix:** Display project data from the analysis store, or show a placeholder that indicates real data is needed.

**Files:** `src/pages/DecisionSummaryPage.tsx`, `src/pages/ReportPage.tsx`

---

### 1.5 — Fix API Key Handling
**Problem:** `process.env.ANTHROPIC_API_KEY` doesn't work in Vite — needs `import.meta.env.VITE_ANTHROPIC_API_KEY`.
**Fix:** Replace all `process.env.ANTHROPIC_API_KEY` references. Document in `.env.example`.

**File:** `src/pages/IntakePage.tsx`, `.env.example`

---

### 1.6 — Fix noticeDeadline Date Parsing
**Problem:** `new Date(analysis.noticeDeadline).toLocaleDateString()` will show "Invalid Date" if Claude returns a malformed ISO string.
**Fix:** Add a safe date parsing utility in `src/lib/utils.ts`. Use it in both DecisionSummaryPage and ReportPage.

---

### 1.7 — Add Error Boundary
**Problem:** No React error boundary exists. Any unhandled error produces a white screen.
**Fix:** Create `src/components/ErrorBoundary.tsx`. Wrap `<App>` in `main.tsx`.

---

### 1.8 — Fix package.json App Name
**Problem:** `"name": "react-example"` in `package.json`.
**Fix:** Change to `"name": "never-sign-blind"`.

---

## Success Criteria
- [ ] Analysis completes end-to-end with a real PDF contract + PDF correspondence
- [ ] Summary page shows the analysis result with no "undefined" or "Invalid Date" values
- [ ] Report page shows populated data
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Project details fields are saved and displayed
- [ ] No `window.location.href` in the codebase
- [ ] Error boundary catches and displays errors gracefully

## Gate
Run `/phase-gate 1` before marking this phase complete.
