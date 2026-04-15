# Phase 5 — Report & Export

## Goal
The Report page shows a complete, professional, print-ready analysis with all real data. The PDF export produces a clean, branded document that a project manager can send to their lawyer or client.

## Pre-condition: Phase 4 must be complete and gated.

## Status: ⬜ Not Started

---

## Deliverables

### 5.1 — Wire Report to Real Project Data
**File:** `src/pages/ReportPage.tsx`

Replace hardcoded strings:
- "CN-2024-0892" → actual contract number from `projectData`
- Report title → project name from `projectData`
- Date → analysis date from `IngestionStore.uploadedAt`

---

### 5.2 — Remove Dead "Generate Report" Endpoint
**File:** `src/pages/ReportPage.tsx`

The `/api/generate-report` POST call no longer exists. Remove the "Generate Report" button or replace it with a meaningful action (e.g., "Re-analyze" which navigates back to intake).

---

### 5.3 — Improve Report Sections
**File:** `src/pages/ReportPage.tsx`

Add a new section: **Contract Risk Scorecard**
- Render a visual risk score (0–100) derived from `keyRisks` count, `extraMoneyLikely`, `extraTimeLikely`
- Color-coded: green (low risk), amber (moderate), red (high risk)

---

### 5.4 — Fix PDF Export
**File:** `src/pages/ReportPage.tsx`

Current issues with `html2canvas + jsPDF`:
- Large reports produce a single very tall PNG page — not multi-page
- Fonts render as images (not searchable text)

Fix options:
- Use jsPDF's `html()` method for better multi-page support
- Or split the `reportRef` into sections and add pages manually

The PDF must:
- Be multi-page for reports with many risks
- Include the "Never Sign Blind — Confidential" footer on each page
- Have a filename that includes the project name and date

---

### 5.5 — Print CSS
**File:** `src/index.css`

Add `@media print` styles so the report can also be printed directly from the browser (as an alternative to PDF export).

---

## Success Criteria
- [ ] Report shows real project name and contract number
- [ ] No hardcoded reference numbers visible
- [ ] PDF export produces a file with readable text (not blank or corrupted)
- [ ] PDF filename includes project name
- [ ] Report renders correctly at 1280px and 1920px viewport widths
- [ ] Risk scorecard section is present and populated

## Gate
Run `/phase-gate 5` before marking this phase complete.
