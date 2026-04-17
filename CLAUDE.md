# NSB LA DOTD Demo Branch Memory

This repository is actively being adapted into a Louisiana / LA DOTD / Calcasieu demo while preserving the current local-first NSB application flow.

## Active branch rules

- Do not work directly on `main` for this demo effort.
- Preferred demo branch: `demo/ladot-calcasieu`.
- Treat `main` as protected production history.
- Every major phase ends with a checkpoint commit before moving on.

## Demo mission

Turn the current NSB app into a Louisiana / LA DOTD / Calcasieu demo branch that stays local-first and preserves the current end-to-end route flow:

1. `intake`
2. `summary`
3. `report`
4. `draft`
5. `sources`

The current app already persists the active analysis thread in the browser. The LA DOTD demo must extend that model, not replace it.

## Non-negotiables

- Do not replace browser persistence with a cloud database.
- Do not remove the current route shell.
- Do not break the current summary, report, draft, or sources flow.
- Do not expose unfinished Georgia/Louisiana switching in the visible demo UI.
- Do not position the product as a legal advice engine.
- Do not move API keys or model calls into the browser.
- Do not silently discard meaningful uploaded data.

## Product framing for this branch

- Demo project: `I-10 Calcasieu River Bridge`
- Agency: `LA DOTD`
- Delivery model: `P3 / design-build`
- User lens: `Arcadis / design team / internal reviewer`
- Core pain: rejected design submittals, correspondence, redesign pressure, and notice risk

The demo should feel tailored to this scenario without introducing a visible multi-state selector.

## Source of truth and persistence rules

The browser is the primary store for user work.

| Layer | Responsibility |
|---|---|
| IndexedDB | Primary source of truth for project, documents, analyses, draft, report, citations, artifacts |
| localStorage | Tiny UI preferences and flags only |
| Express backend | Compute layer only: ingestion, extraction, analysis, report generation, draft generation, chat |
| Server backup files | Temporary convenience/backup only, never the authoritative app database |

### Persistence constraints

- No Supabase for this branch.
- No durable remote database for this branch.
- Save all generated artifacts locally after responses return.
- Preserve compatibility with the existing `threads` store and `CURRENT_THREAD_ID = "current"` flow until a planned schema migration is implemented.
- Preserve the current `contractBlob` behavior so the full uploaded PDF can still be viewed on the Sources page.

## Current route-flow contract

The following route shell is already live and must remain intact unless a change is required for correctness:

- `/intake`
- `/summary`
- `/report`
- `/sources`
- `/draft`

Shell elements that should remain conceptually stable:

- left sidebar
- top application bar
- central routed content area
- assistant/chat surface

Any Louisiana-specific changes should fit inside the existing shell rather than replace it.

## Backend rules

- All AI calls stay server-side via `@anthropic-ai/sdk`.
- Model selection comes from `ANTHROPIC_MODEL` with a safe server-side default.
- The server is responsible for:
  - file ingestion
  - extraction
  - analysis
  - citation extraction
  - report generation
  - draft generation
  - document Q&A orchestration
- The frontend never calls the model provider directly.

## Data-model guidance for this branch

`ProjectData` will need additive expansion for the LA DOTD demo. New demo-specific fields should be introduced in a compatibility-safe way so existing pages still work while richer project context becomes available.

Expected additions include:

- `state`
- `agency`
- `deliveryModel`
- `ownerClient`
- `userRole`
- `concessionaire`
- `builder`
- `leadDesigner`
- `demoProfile`
- `issueMode`

Preserve existing fields:

- `name`
- `contractNumber`
- `changeRequestId`

## Output compatibility rules

Do not break downstream consumers of:

- `AnalysisResult`
- `ProjectData`
- `ExtractedDocument`
- `Citation`
- `Report`
- `Draft`

Any schema evolution should be additive, explicitly typed, and safe for existing summary/report/draft/sources pages.

## QA and validation rules

No phase is complete until the relevant checks pass.

Minimum validation:

```bash
npm run lint
npm run build
```

When behavior changes materially, also run the appropriate smoke or browser checks before presenting the result.

Required reporting after meaningful implementation phases:

- changed files
- what stayed intentionally compatible
- known risks or follow-up items

## Working style for future Claude handoffs

- Read `docs/ladot-demo/00-demo-scope.md` through `04-project-data-and-role-model.md` before major implementation work once those files exist.
- Prefer additive changes over rewrites.
- Preserve local-first behavior.
- Prefer explicit errors over silent fallbacks.
- Do not remove the current shell to achieve demo theming.

## Supporting docs

LA DOTD demo planning docs live in:

- `docs/ladot-demo/`

Suggested specialist handoff briefs live in:

- `.claude/agents/`
