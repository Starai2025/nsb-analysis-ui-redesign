# Phase 4 — Analysis Engine Hardening

## Goal
Make the Claude analysis production-grade: better prompt engineering, structured output validation, retry logic, token budget management, and a citation extraction pass. All AI logic lives in `server.ts` — no client-side model calls.

## Pre-condition: Phase 3 must be complete and gated. ✅

## Status: ⬜ Not Started

---

## Architecture Note
All deliverables in this phase live in `server.ts`. There is no `src/lib/analysis.ts`. The frontend never calls Claude. Per CLAUDE.md: "Express backend is the source of orchestration."

---

## Deliverables

### 4.1 — Improved System Prompt
**File:** `server.ts`

Expand `SYSTEM_PROMPT` with:
- Explicit AIA A201 / DBIA 540 construction law context
- Instruction to cite specific page numbers when making findings
- Explicit hallucination guard: "If not stated in the documents, use 'Not specified'"
- Flag when contract appears non-standard or adversarial
- Notice clause detection: identify the exact deadline clause and extract the date

---

### 4.2 — Structured Output Validation
**File:** `server.ts`

After extracting `toolUse.input`, validate every field before returning:
- `executiveConclusion` — non-empty string
- `scopeStatus` — exactly `'In Scope'` or `'Out of Scope'`
- `noticeDeadline` — valid ISO 8601 date (YYYY-MM-DD) or `'Not specified'`
- `keyRisks` — array with at least 1 item, each with non-empty title + description
- `claimableAmount` / `extraDays` — non-empty strings

Throw a descriptive error on validation failure rather than returning broken data.

---

### 4.3 — Retry with Exponential Backoff
**File:** `server.ts`

Wrap the `client.messages.create()` call with:
- Up to 2 retries on network error or API overload (status 529)
- Delays: 2s → 6s
- After all retries exhausted, throw: "Analysis service temporarily unavailable. Please try again in a few minutes."
- 120 second request timeout using `AbortController`

---

### 4.4 — Token Budget Management
**File:** `server.ts`

Before calling Claude, estimate total input size:
- PDFs: measure base64 length (~0.75 bytes per base64 char)
- DOCX: measure extracted text length
- If combined estimated tokens > 150,000 (Claude's safe working range for this task):
  - For PDFs: keep base64 as-is (Claude needs the full document visually)
  - For DOCX: truncate to first 150 pages worth of text and log a warning
  - Include a note in the prompt: "Note: document was truncated due to length"

---

### 4.5 — Citation Extraction Pass
**File:** `server.ts`

After the primary analysis call, make a second Claude call to extract citations:
- Send the top 20 chunks from the contract (by page order)
- Ask Claude to identify which specific clauses support each key risk finding
- Return an array of `Citation` objects matching `src/types.ts`
- Store citations alongside analysis in the server store and return in `/api/analyze` response
- If this call fails, log the error and return empty citations — never block the main analysis

---

## Success Criteria
- [ ] Analysis with a real PDF contract completes end-to-end
- [ ] `scopeStatus` is always exactly "In Scope" or "Out of Scope" — never a variant
- [ ] `noticeDeadline` always parses as a valid date or shows "Not specified"
- [ ] API overload error retries twice before surfacing a user-facing message
- [ ] Citations array is populated in the IndexedDB thread after analysis
- [ ] `npm run lint` and `npm run build` pass

## Gate
Run `/phase-gate 4` before marking complete.
