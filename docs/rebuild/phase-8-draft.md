# Phase 8 — Draft Response Generation

## Goal
DraftResponsePage generates a real AI-drafted response letter based on the actual analysis result and project data — not hardcoded "Project Alpha" placeholder text. The Claim Strategy tab is also dynamically generated from the analysis.

## Pre-condition: Phase 4 (analysis hardening) must be complete and gated.

## Status: ⬜ Not Started

---

## Background
Currently `DraftResponsePage.tsx` contains 100% static hardcoded content. The letter references "Project Alpha", "CR-4052", "Ms. Elena Richardson", and "Arcadis" — none of which come from the actual analysis. Phase 8 replaces all of this with AI-generated, analysis-aware content.

---

## Deliverables

### 8.1 — Draft Generation Service
**File:** `src/lib/draft.ts`

```typescript
export async function generateDraftResponse(
  analysis: AnalysisResult,
  projectData: ProjectData
): Promise<DraftResponse>

export interface DraftResponse {
  letter: string           // formal response letter text
  claimStrategy: string    // claim strategy narrative
  mitigationSteps: string[]
  alternativePaths: string[]
  recommendedPath: string
}
```

Build a Claude prompt that:
- Uses `projectData.name`, `contractNumber`, `changeRequestId` in the letter
- References the `strategicRecommendation` from the analysis
- Uses the `keyRisks` to identify what the letter needs to address
- Specifies the `claimableAmount` and `extraDays` as the claim basis
- References the `noticeDeadline` for urgency framing
- Outputs structured JSON matching `DraftResponse`

---

### 8.2 — Update DraftResponsePage
**File:** `src/pages/DraftResponsePage.tsx`

- On load, check `analysisStore` for existing analysis
- If analysis exists and no draft has been generated, offer a "Generate Draft" button
- On generate, call `drafting.generateDraftResponse()` with the analysis + project data
- Store the generated draft in localStorage alongside the analysis
- Populate the letter textarea with `draftResponse.letter`
- Populate the claim strategy sections with the generated content
- Show a loading state during generation

---

### 8.3 — Editable Letter
**File:** `src/pages/DraftResponsePage.tsx`

The letter textarea should be fully editable after generation. Users should be able to:
- Type directly in the letter
- Apply formatting suggestions from the "Suggested Improvements" panel
- Save the edited version back to localStorage

---

### 8.4 — Remove Hardcoded Sidebar Content
**File:** `src/pages/DraftResponsePage.tsx`

Replace:
- "Current Claim Status: Disputed / Unresolved" → from analysis `scopeStatus`
- "Entitlement Support: Mixed" → derived from `extraMoneyLikely` + `extraTimeLikely`
- "Project Alpha" badge → from `projectData.name`
- "CR-4052" → from `projectData.changeRequestId`

---

### 8.5 — Wire Toolbar Buttons
**File:** `src/pages/DraftResponsePage.tsx`

Make functional:
- **Save Draft** → saves current letter text to `analysisStore`
- **Copy** → copies letter to clipboard
- **Export PDF** → exports the letter as a PDF (reuse jsPDF pattern from ReportPage)

The Bold/Italic/Underline/List toolbar buttons can remain visual-only (no contentEditable required) but should not throw errors.

---

### 8.6 — "Regenerate" Option
Add a "Regenerate Draft" button that calls the generation service again with a slightly higher temperature, producing a variation of the letter. Useful when the first draft doesn't match the desired tone.

---

## Success Criteria
- [ ] Draft letter contains the actual project name and change request ID
- [ ] Draft letter references the claimable amount from the analysis
- [ ] Claim Strategy tab content is generated from the analysis (not static)
- [ ] Letter is editable after generation
- [ ] Save Draft and Copy buttons work
- [ ] Export PDF produces a downloadable letter
- [ ] Empty state when no analysis exists: "Complete an analysis to generate a draft"

## Gate
Run `/phase-gate 8` before marking this phase complete.
