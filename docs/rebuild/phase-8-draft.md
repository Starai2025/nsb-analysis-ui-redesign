# Phase 8 — Draft Response Generation

## Goal
DraftResponsePage generates a real AI-drafted response letter and claim strategy based on the actual analysis — not hardcoded "Project Alpha" placeholder content.

## Pre-condition: Phase 4 (analysis hardening) must be complete and gated.

## Status: ⬜ Not Started

---

## Architecture Note
All Claude calls live in `server.ts`. The frontend calls `POST /api/draft`, the server generates the letter using the stored analysis + project data, and returns the content. There is no `src/lib/draft.ts` that calls Claude client-side. Per CLAUDE.md: "Express backend is the source of orchestration."

---

## Deliverables

### 8.1 — Server: Draft Endpoint
**File:** `server.ts`

Add `POST /api/draft`:
```
Body: { threadId?: string }
Returns: {
  letter: string,
  claimStrategy: string,
  mitigationSteps: string[],
  alternativePaths: string[],
  recommendedPath: string
}
```

Build a Claude prompt using:
- `projectData.name`, `contractNumber`, `changeRequestId` in the letter header
- `analysis.strategicRecommendation` as the claim basis
- `analysis.keyRisks` to identify what the letter addresses
- `analysis.claimableAmount` and `analysis.extraDays` as the claim amounts
- `analysis.noticeDeadline` for urgency framing

Use tool use with a `submit_draft` tool for structured output — same pattern as analysis.

---

### 8.2 — Update DraftResponsePage
**File:** `src/pages/DraftResponsePage.tsx`

- On load, check IndexedDB for an existing draft
- If none exists, show "Generate Draft" button
- On click, call `POST /api/draft`, show loading state
- Populate the letter text area with `draftResponse.letter`
- Populate Claim Strategy sections with generated content
- Store draft in IndexedDB thread via `saveCurrentThread({ draft: draftResponse })`

---

### 8.3 — Remove All Hardcoded Content
**File:** `src/pages/DraftResponsePage.tsx`

Replace every hardcoded string:
- "Project Alpha" → `projectData.name`
- "CR-4052: Foundation Modification" → `projectData.changeRequestId`
- "Ms. Elena Richardson" → remove or make generic
- "Arcadis" → remove (user's company name not yet in scope)
- Static claim strategy sections → generated content from server

---

### 8.4 — Functional Toolbar Buttons
**File:** `src/pages/DraftResponsePage.tsx`

- **Save Draft** → saves edited letter text back to IndexedDB
- **Copy** → copies letter to clipboard via `navigator.clipboard.writeText()`
- **Export PDF** → uses jsPDF pattern from ReportPage

---

### 8.5 — Regenerate Option
Add a "Regenerate" button that calls `/api/draft` again. Useful when the first draft tone doesn't fit.

---

## Success Criteria
- [ ] Draft letter contains the actual project name and change request ID
- [ ] Letter references the real claimable amount from the analysis
- [ ] No "Project Alpha", "Ms. Richardson", or "Arcadis" visible to the user
- [ ] Claim Strategy tab content is generated (not static)
- [ ] Save Draft and Copy buttons work
- [ ] Export PDF produces a downloadable letter

## Gate
Run `/phase-gate 8` before marking complete.
