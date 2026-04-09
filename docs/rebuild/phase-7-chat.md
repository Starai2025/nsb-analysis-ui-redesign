# Phase 7 — Ask the Contract (Chat)

## Goal
The AskTheContract component becomes a functional RAG-based Q&A system. Users can ask natural language questions about their uploaded contract and get specific, citation-backed answers in real time.

## Pre-condition: Phase 3 (ingestion/chunking) must be complete and gated.

## Status: ⬜ Not Started

---

## Background
Currently `AskTheContract.tsx` renders a chat UI shell with no backend. It doesn't send messages or receive responses. Phase 7 makes it functional.

The approach is **client-side RAG**:
1. User asks a question
2. Find the most relevant chunks from the stored contract/correspondence
3. Pass those chunks + the question to Claude
4. Stream the response back

---

## Deliverables

### 7.1 — Create RAG Service
**File:** `src/lib/rag.ts`

```typescript
export async function askTheContract(
  question: string,
  contract: ExtractedDocument,
  correspondence?: ExtractedDocument
): Promise<string>
```

- Simple vector-free relevance scoring: score each chunk by keyword overlap with the question
- Select top 5 most relevant chunks
- Build a prompt: "Given the following contract clauses, answer the question: [question]"
- Call `claude-2.0-flash` with the chunks + question
- Return the response text

---

### 7.2 — Wire AskTheContract Component
**File:** `src/components/AskTheContract.tsx`

- On submit, call `askTheContract()` with the question and loaded documents from `analysisStore`
- Show a typing indicator while the response streams
- Render the response in the chat panel with the relevant chunk sources cited
- Handle the empty state: "Upload a contract first to enable Q&A"
- Handle errors gracefully

---

### 7.3 — Chat History in Session
**File:** `src/components/AskTheContract.tsx`

- Maintain an array of `{ role: 'user' | 'assistant', text: string }` messages in component state
- Render the full conversation history in the chat panel
- "Clear chat" button resets history (does not clear the analysis)

---

### 7.4 — Suggested Questions
**File:** `src/components/AskTheContract.tsx`

On first open (empty history), show 3–4 suggested questions based on the analysis:
- "What are the payment terms?"
- "When is the notice deadline?"
- "Who is responsible for [risk.title]?"
- "What does the indemnification clause say?"

Clicking a suggestion populates the input.

---

### 7.5 — Sources Panel Integration
**File:** `src/pages/SourcesPage.tsx`

The "Ask a question about these clauses..." input at the bottom of SourcesPage should use the same `askTheContract()` service. Wire it up.

---

## Success Criteria
- [ ] Asking "What are the payment terms?" returns a relevant answer drawn from the contract text
- [ ] Response includes a page or chunk reference (e.g., "per Section 3, Page 1")
- [ ] Empty state shows when no contract is uploaded
- [ ] Chat history persists within the session (not across page refreshes)
- [ ] Error message appears if Claude call fails
- [ ] Suggested questions appear on first open

## Gate
Run `/phase-gate 7` before marking this phase complete.
