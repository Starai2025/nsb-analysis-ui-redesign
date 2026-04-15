# Phase 6 — Sources & Citations

## Goal
The Sources page shows the actual contract document with AI-identified risk clauses highlighted at their real locations. Citations in the right panel reference real page numbers and text from the uploaded files — not hardcoded demo content.

## Pre-condition: Phase 3 (ingestion) and Phase 4 (citations) must be complete and gated.

## Status: ⬜ Not Started

---

## Deliverables

### 6.1 — Load Real Document in Viewer
**File:** `src/pages/SourcesPage.tsx`

Replace the hardcoded "BuildCorp_Prime_Contract_v4.pdf" mock document viewer with a real document renderer:
- Load `contract` from `analysisStore`
- Render each `ExtractedPage` as a section with its page number
- Display extracted text (styled to look like a document — serif font, appropriate spacing)

---

### 6.2 — Render Real Citations Panel
**File:** `src/pages/SourcesPage.tsx`

Replace the 3 hardcoded citation objects with real citations from `analysisStore`:
- Load the `Citation[]` array stored during Phase 4's citation extraction pass
- Render each citation with its `title`, `source`, `text`, `explanation`, `confidence` badge
- Color-code by confidence: High (green), Medium (amber), Low (red)
- Show "No citations extracted" empty state if array is empty

---

### 6.3 — Citation → Document Scroll Link
**File:** `src/pages/SourcesPage.tsx`

Clicking a citation in the right panel scrolls the document viewer to the corresponding page.
- Extract page number from citation `source` field
- Scroll to the matching `section` in the viewer using `scrollIntoView`

---

### 6.4 — Document Outline from Real Sections
**File:** `src/pages/SourcesPage.tsx`

Replace hardcoded section list with an auto-detected outline:
- Parse section headings from extracted text (lines matching `^[0-9]+\.` or all-caps patterns)
- Render as outline items
- Scroll to section on click

---

### 6.5 — Risk Highlight Overlay
**File:** `src/pages/SourcesPage.tsx`

For each citation that has a page number:
- Find the corresponding page section in the document viewer
- Apply a visual highlight class to flag it as a risk area
- Show a small badge ("CRITICAL RISK" / "PRIMARY RISK") matching the confidence level

---

### 6.6 — Handle Missing Citations Gracefully
If the citation extraction pass (Phase 4.6) produced no citations (e.g., Claude didn't return structured citations), show:
- The document text is still rendered
- A message in the citations panel: "AI citations could not be extracted for this document. Run the analysis again or review the report for findings."

---

## Success Criteria
- [ ] SourcesPage shows the actual uploaded contract text (not hardcoded BuildCorp demo)
- [ ] Citations panel shows real AI-extracted citations (not hardcoded 3-item list)
- [ ] Clicking a citation scrolls to the correct page in the document viewer
- [ ] Empty state displays if no citations are available
- [ ] Page renders without crashes even if analysis data is incomplete

## Gate
Run `/phase-gate 6` before marking this phase complete.
