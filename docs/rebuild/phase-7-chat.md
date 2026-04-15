# Phase 7 — Ask the Contract (Chat)

## Goal
The AskTheContract component becomes a functional RAG-based Q&A system. Users ask natural language questions about their uploaded contract and get specific, citation-backed answers from Claude in real time.

## Pre-condition: Phase 3 (ingestion/chunking) must be complete and gated. ✅

## Status: ⬜ Not Started

---

## Architecture Note
All Claude calls live in `server.ts`. The frontend sends a question to `POST /api/chat`, the server retrieves relevant chunks from the stored thread, calls Claude, and returns the answer. There is no `src/lib/rag.ts` that calls Claude client-side. Per CLAUDE.md: "Express backend is the source of orchestration."

---

## Deliverables

### 7.1 — Server: Chat Endpoint
**File:** `server.ts`

Add `POST /api/chat`:
```
Body: { question: string, threadId?: string }
Returns: { answer: string, sourceChunks: ExtractedChunk[] }
```

- Load the current thread from `data-store.json` (Phase 9 adds real thread IDs)
- Score all chunks by keyword overlap with the question
- Select top 5 most relevant chunks from both contract and correspondence
- Call `claude-sonnet-4-5` with the chunks + question
- Return the answer and the source chunks used

---

### 7.2 — Wire AskTheContract Component
**File:** `src/components/AskTheContract.tsx`

Replace the `setTimeout` fake response with a real `fetch('/api/chat', { body: { question } })` call:
- Show a typing indicator while the response is loading
- Render the answer in the chat panel
- Show source chunk references (page number + snippet) below each answer
- Handle errors gracefully with a user-facing message
- Empty state: "Upload and analyze a contract to enable Q&A"

---

### 7.3 — Chat History in Session
**File:** `src/components/AskTheContract.tsx`

- Maintain `{ role: 'user' | 'assistant', text: string }` message array in component state
- Include last 6 messages in the server request for conversational context
- "Clear chat" button resets history only (does not clear the analysis)

---

### 7.4 — Suggested Questions
**File:** `src/components/AskTheContract.tsx`

On first open (empty history), show 3 suggested questions derived from the analysis:
- "What are the payment terms?"
- "When is the notice deadline?"
- One question per key risk title from the analysis

Clicking a suggestion populates the input field.

---

### 7.5 — Wire Sources Page Input
**File:** `src/pages/SourcesPage.tsx`

The "Ask a question about these clauses..." input at the bottom of SourcesPage should call the same `/api/chat` endpoint.

---

## Success Criteria
- [ ] Asking "What are the payment terms?" returns a relevant answer from the contract text
- [ ] Response includes a page reference (e.g., "per Page 3")
- [ ] Empty state shows when no analysis exists
- [ ] Fake `setTimeout` response completely removed from AskTheContract.tsx
- [ ] Chat history persists within the session

## Gate
Run `/phase-gate 7` before marking complete.
