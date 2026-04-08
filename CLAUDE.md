# Never Sign Blind — Rebuild Rules

## Product Goal
This app must become a fully live, local-first contract change-management tool.

- No fake report generation
- No fake chat
- No fake source review
- No client-side LLM calls

## Current Stack
- Vite + React frontend
- Express backend

## Architecture Direction

**Keep the current stack.**

| Layer | Responsibility |
|---|---|
| IndexedDB | Primary local persistence — all analysis data, documents, threads |
| localStorage | Tiny UI/session preferences only (e.g., sidebar collapsed state) |
| Express backend | All model calls, orchestration, file processing |
| React frontend | UI state only — never calls AI APIs directly |

### Non-Negotiables
- Never expose API keys to the browser
- Never store only one global analysis — every analysis is a named thread
- No mocked content on any production-facing page
- No phase is complete until lint + build + smoke checks pass
- Do not redesign the UI unless a change is required for correctness

## Build Order

```
1. Audit & stabilization
2. Persistence layer (IndexedDB)
3. Real document ingestion
4. Real analysis (server-side)
5. Real report
6. Real sources
7. Real Ask the Contract
8. Real draft response
9. Claim threading / position comparison
```

## Validation Rule

Before moving to the next phase, all of the following must pass:

```bash
npm run lint       # maps to: tsc --noEmit
npm run build      # must complete with no errors
```

Then run the manual smoke checklist in `.claude/skills/phase-gate/smoke-tests.md`.

Then run `/review` focused on regressions.

Then summarize:
- Changed files
- What was removed or made no longer necessary
- Remaining known risks entering the next phase

## Current Known Repo Truths

- Stack: Vite + Express
- Scripts: `dev`, `build`, `preview`, `clean`, `lint`
- `lint` maps to `tsc --noEmit`
- AI analysis currently runs **client-side via Gemini** — this must move to the Express server
- `server.ts` currently holds an in-memory analysis store and minimal endpoints
- Downstream features — report, sources, chat, draft — are partially or fully mocked
- The correct AI SDK for server-side use is `@google/genai` (already in `package.json`)
- API key must be read from `process.env.GEMINI_API_KEY` on the server, never sent to the browser

## File Responsibilities

```
server.ts             ← All AI calls, document processing, persistence coordination
src/pages/            ← UI only — fetches from Express, renders results
src/lib/              ← Shared frontend utilities (no AI, no direct IndexedDB in pages)
src/types.ts          ← Shared type contracts between frontend and backend
```

## API Contract (Server ↔ Frontend)

All endpoints are under `/api/`. The frontend never calls Gemini directly.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/analyze` | Upload files + run Gemini analysis, return result |
| GET | `/api/threads` | List all analysis threads |
| GET | `/api/threads/:id` | Get a specific thread |
| POST | `/api/threads/:id/draft` | Generate draft response for a thread |
| POST | `/api/threads/:id/chat` | Ask a question about a thread's documents |

## IndexedDB Schema (Frontend Persistence)

```
Store: threads
  Key: thread.id (uuid)
  Value: AnalysisThread {
    id, createdAt, updatedAt,
    projectData,
    analysis,
    contract (ExtractedDocument),
    correspondence (ExtractedDocument),
    citations,
    draft?,
    chatHistory?
  }

Store: preferences
  Key: string
  Value: any (ui state only)
```

## Phase Gate Commands

| Command | When to Use |
|---|---|
| `/repo-audit` | Before starting any phase — verify current state |
| `/phase-plan N` | Plan all work items for phase N |
| `/phase-gate N` | Gate check before closing phase N |
| `/smoke-check` | After any meaningful change |
| `/regression-check` | Before merging or closing a phase |
| `/ship-check` | Before any production deploy |

## Known Issues Entering Phase 1

- AI analysis runs client-side — must move to Express
- Gemini model names in `IntakePage.tsx` are incorrect
- `process.env.GEMINI_API_KEY` used in browser context — must be removed
- `window.location.href` used for navigation instead of `useNavigate()`
- Project detail fields (name, contract #, CR #) are uncontrolled — never saved
- `server.ts` in-memory store will be replaced by IndexedDB in Phase 2
- Sources, Draft, and Chat pages contain hardcoded placeholder content
- No error boundary exists — unhandled errors produce a white screen
