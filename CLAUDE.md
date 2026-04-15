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

## AI Model
**All AI calls use the Anthropic Claude API via `@anthropic-ai/sdk`.**

- Model: `claude-sonnet-4-5`
- API key: `process.env.ANTHROPIC_API_KEY` — server-side only, never sent to the browser
- Structured output: tool use (`tool_choice: { type: "tool", name: "..." }`)
- Do NOT use any Gemini, OpenAI, or other AI SDKs

## Build Order

```
1. Audit & stabilization       ✅ complete
2. Persistence layer (IndexedDB) ✅ complete
3. Real document ingestion     ✅ complete
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
- AI SDK: `@anthropic-ai/sdk` — model `claude-sonnet-4-5`
- All AI calls are server-side in `server.ts`
- `server.ts` uses multer for file uploads, pdfjs-dist + mammoth for ingestion
- `data-store.json` is the server-side backup store (primary is client IndexedDB)
- Downstream features — sources, chat, draft — are still mocked

## File Responsibilities

```
server.ts             ← All AI calls, document processing, persistence coordination
src/pages/            ← UI only — fetches from Express, renders results
src/lib/              ← Shared frontend utilities (db.ts for IndexedDB, utils.ts for cn())
src/types.ts          ← Shared type contracts between frontend and backend
```

## API Contract (Server ↔ Frontend)

All endpoints are under `/api/`. The frontend never calls Claude directly.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/analyze` | Upload files + run Claude analysis, return result |
| POST | `/api/save-analysis` | Patch analysis edits from DecisionSummaryPage |
| GET  | `/api/store` | Read server backup store (fallback) |
| POST | `/api/threads/:id/draft` | Generate draft response (Phase 8) |
| POST | `/api/threads/:id/chat` | Ask a question about documents (Phase 7) |

## IndexedDB Schema (Frontend Persistence)

```
Store: threads   — keyPath: 'id'
  NSBThread {
    id, createdAt, updatedAt,
    projectData,
    analysis,
    contract (ExtractedDocument with pages + chunks),
    correspondence (ExtractedDocument with pages + chunks),
    citations?,
    draft?,
    chatHistory?
  }

Store: preferences — tiny UI state only
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

## Known Issues Entering Phase 4

- `data-store.json` / `/api/store` still exist as server backup — to be cleaned up later
- Sources, Draft, and Chat pages contain hardcoded placeholder content — Phases 6, 8, 7
- Sidebar still shows "Project Alpha" / "Contractor: BuildCorp" — Phase 9
