# Phase 4 — Analysis Engine Hardening

## Goal
Make the Gemini analysis production-grade: reliable prompt engineering, proper model selection, clean retry logic, structured output validation, and meaningful error messages for every failure mode.

## Pre-condition: Phase 3 must be complete and gated.

## Status: ⬜ Not Started

---

## Deliverables

### 4.1 — Dedicated Analysis Service
**File:** `src/lib/analysis.ts`

Extract all Gemini logic out of IntakePage into a standalone service:
```typescript
export async function analyzeDocuments(
  contract: ExtractedDocument,
  correspondence: ExtractedDocument,
  projectData: ProjectData
): Promise<AnalysisResult>
```

IntakePage becomes a pure UI component that calls this service.

---

### 4.2 — Prompt Engineering v2
**File:** `src/lib/analysis.ts`

Improve the system prompt with:
- Explicit construction law context (AIA A201, DBIA 540 references)
- Notice clause detection instruction
- Explicit instruction to cite page numbers from the provided document chunks
- Guardrails against hallucination ("If not stated in the documents, say 'Not specified'")
- Instruction to flag when a contract appears to be non-standard or adversarial

---

### 4.3 — Structured Output Validation
**File:** `src/lib/analysis.ts`

After parsing the JSON response, validate every required field:
- `executiveConclusion` is a non-empty string
- `scopeStatus` is exactly `'In Scope'` or `'Out of Scope'`
- `noticeDeadline` parses as a valid ISO date
- `keyRisks` is an array with at least 1 item
- Numeric-like fields (`claimableAmount`, `extraDays`) are not empty strings

If validation fails, throw a descriptive error rather than rendering broken UI.

---

### 4.4 — Retry & Fallback Logic
**File:** `src/lib/analysis.ts`

- Retry once on network error (exponential backoff)
- Fall back from `gemini-2.0-flash` to `gemini-1.5-pro` on overloaded/error response
- If both models fail, surface a specific error: "Analysis service is temporarily unavailable. Please try again in a few minutes."
- Add a timeout: if no response in 120 seconds, abort and show a timeout error

---

### 4.5 — Token Budget Management
**File:** `src/lib/analysis.ts`

Gemini has input token limits. For very large documents:
- Estimate token count before sending (rough: 4 chars per token)
- If contract + correspondence > 900K chars, use only the first N chunks
- Log a warning when document is truncated: "Document truncated to fit analysis window"

---

### 4.6 — Citation Extraction Pass
**File:** `src/lib/analysis.ts`

After the primary analysis, run a second Gemini call specifically to extract citations:
```
Given the analysis result and the document chunks, identify the specific clauses
that support the finding for each key risk. Return an array of Citation objects.
```

Store the citations in the localStorage store alongside the analysis.

---

## Success Criteria
- [ ] Analysis service is isolated from IntakePage (testable independently)
- [ ] Valid analysis produces a fully typed `AnalysisResult` with no undefined fields
- [ ] `noticeDeadline` is always a valid parseable date or a fallback string
- [ ] Analysis fails gracefully with a user-friendly message for: invalid API key, token limit, timeout, model error
- [ ] Citation objects are stored alongside analysis
- [ ] `npm run lint` passes

## Gate
Run `/phase-gate 4` before marking this phase complete.
