# Claude Execution Handoff

Date: 2026-04-17  
Branch: `demo/ladot-calcasieu`

## Purpose

Give Claude an exact execution order for implementation on the LA DOTD / Calcasieu demo branch.

This document translates the planning phases into concrete tickets, identifies the files each ticket should touch first, names the likely impacted files, and defines what must stay untouched while the migration is in progress.

## Mission summary

Implement the Louisiana / LA DOTD / Calcasieu demo as a local-first evolution of the current NSB app while preserving the working end-to-end flow:

- `/intake`
- `/summary`
- `/report`
- `/draft`
- `/sources`

## Non-negotiables

- do not work directly on `main`
- do not replace browser persistence with a cloud database
- do not remove the current route shell
- do not break the current summary/report/draft/sources flow
- do not expose unfinished Georgia/Louisiana switching in the UI
- do not present the product as a legal-advice engine
- every major implementation phase ends with a checkpoint commit

## Before Claude starts coding

### 1. Re-read the planning docs

Required reading order:

1. `docs/ladot-demo/00-demo-scope.md`
2. `docs/ladot-demo/02-local-first-architecture.md`
3. `docs/ladot-demo/03-indexeddb-schema-plan.md`
4. `docs/ladot-demo/05-intake-redesign-spec.md`
5. `docs/ladot-demo/06-document-stack-spec.md`
6. `docs/ladot-demo/07-ingestion-and-extraction-plan.md`
7. `docs/ladot-demo/12-route-responsibilities.md`
8. `docs/ladot-demo/13-output-versioning.md`
9. `docs/ladot-demo/14-performance-and-hydration.md`
10. `docs/ladot-demo/16-acceptance-criteria.md`
11. `docs/ladot-demo/17-regression-checklist.md`

### 2. Respect the current dirty working tree

This repo currently has unrelated in-progress local changes in:

- `server.ts`
- `src/App.tsx`
- `src/components/Sidebar.tsx`
- `src/components/TopBar.tsx`
- `src/pages/DecisionSummaryPage.tsx`
- `src/pages/DraftResponsePage.tsx`
- `src/pages/IntakePage.tsx`
- `src/pages/ReportPage.tsx`
- `src/pages/SourcesPage.tsx`
- `src/lib/useCurrentThreadSummary.ts`

Claude must not blindly revert those edits. Read them, work with them, and isolate new implementation changes carefully.

## Execution rules

- preserve the current active-thread compatibility projection while adding the richer project/workspace model
- prefer additive store and type changes
- keep backend compute endpoints stable unless a ticket explicitly extends them
- preserve current route URLs and shell placement
- do not mix multiple risky migrations into a single ticket
- run validation at the end of each ticket or grouped ticket slice where feasible

## Recommended ticket order

The implementation should proceed in this order:

1. DB compatibility layer
2. Intake V2 local project creation
3. Document stack persistence
4. Issue/comment/submittal stores
5. Deadline engine
6. Summary adaptation
7. Report/draft versioning
8. Sources route update
9. QA and persistence verification

## Ticket 1: DB compatibility layer

### Goal

Introduce the richer local project/workspace model and store adapters without breaking the current `threads.current` flow.

### Primary touched files

- `src/lib/db.ts`
- `src/types.ts`

### Likely impacted files

- `src/lib/useCurrentThreadSummary.ts`
- `src/pages/IntakePage.tsx`
- `src/pages/DecisionSummaryPage.tsx`
- `src/pages/ReportPage.tsx`
- `src/pages/DraftResponsePage.tsx`
- `src/pages/SourcesPage.tsx`

### Expected work

- add additive store support for projects/documents/extractions/analyses/issues/submittals/comments/deadlines/reports/drafts/artifacts
- keep `threads.current` as compatibility projection
- add selector-style read helpers for hot data
- add narrow write helpers instead of giant object rewrites

### What stays untouched

- route URLs in `src/App.tsx`
- core report/draft/source page behavior
- current `/api/*` backend contract

## Ticket 2: Intake V2 local project creation

### Goal

Turn `/intake` into the workspace setup flow while preserving the current analyze handoff and summary navigation.

### Primary touched files

- `src/pages/IntakePage.tsx`
- `src/types.ts`
- `src/lib/db.ts`

### Likely impacted files

- `src/components/Sidebar.tsx`
- `src/components/TopBar.tsx`
- `src/lib/useCurrentThreadSummary.ts`

### Expected work

- create local project/workspace record before analysis
- save project, role, and scenario metadata locally
- preserve failed attempts
- keep the required analyze mapping:
  - governing agreement -> `contract`
  - correspondence/review comments -> `correspondence`

### What stays untouched

- `/summary` route contract
- backend analysis pipeline
- the shell layout in `src/App.tsx`

## Ticket 3: Document stack persistence

### Goal

Persist documents by category locally while preserving the current two-core-file analysis path.

### Primary touched files

- `src/types.ts`
- `src/lib/db.ts`
- `src/pages/IntakePage.tsx`

### Likely impacted files

- `src/pages/SourcesPage.tsx`
- `src/pages/DecisionSummaryPage.tsx`

### Expected work

- add document category metadata
- persist required and optional documents locally
- store file metadata separately from heavy blob payloads where possible
- keep current analyze eligibility flags explicit

### What stays untouched

- the current `POST /api/analyze` required-file contract
- core report/draft generation endpoints

## Ticket 4: Issue/comment/submittal stores

### Goal

Add local issue, comment, and submittal records that can sit alongside the current analysis output.

### Primary touched files

- `src/types.ts`
- `src/lib/db.ts`

### Likely impacted files

- `src/pages/DecisionSummaryPage.tsx`
- `src/pages/IntakePage.tsx`
- `src/pages/ReportPage.tsx`
- `src/pages/DraftResponsePage.tsx`

### Expected work

- add local issue entities
- add correspondence/comment entities
- add submittal package and revision entities
- link issue state back to documents and analysis records

### What stays untouched

- core backend ingestion logic in `server.ts`
- current route shell

## Ticket 5: Deadline engine

### Goal

Add local deadline objects and linkage without turning the app into a legal deadline calculator.

### Primary touched files

- `src/types.ts`
- `src/lib/db.ts`

### Likely impacted files

- `src/pages/DecisionSummaryPage.tsx`
- future deadline surfaces in summary/report/draft flows

### Expected work

- add deadline types and trigger structures
- store deadlines locally
- support issue/submittal-linked deadline creation and updates
- preserve explicit confidence and source links

### What stays untouched

- legal-advice positioning
- server-side analysis contract unless a later extension is needed

## Ticket 6: Summary adaptation

### Goal

Adapt `/summary` to read the active local project/workspace, show issue state, and support local overrides safely.

### Primary touched files

- `src/pages/DecisionSummaryPage.tsx`
- `src/lib/db.ts`
- `src/types.ts`

### Likely impacted files

- `src/components/Sidebar.tsx`
- `src/components/TopBar.tsx`
- `src/lib/useCurrentThreadSummary.ts`

### Expected work

- read latest local analysis
- read issue list or issue candidates
- add explicit local override behavior
- save overrides in local records without destroying source-derived values

### What stays untouched

- route path `/summary`
- downstream report/draft endpoints

## Ticket 7: Report/draft versioning

### Goal

Introduce versioned local report and draft storage while keeping current pages working.

### Primary touched files

- `src/types.ts`
- `src/lib/db.ts`
- `src/pages/ReportPage.tsx`
- `src/pages/DraftResponsePage.tsx`

### Likely impacted files

- `src/pages/DecisionSummaryPage.tsx`
- `src/lib/useCurrentThreadSummary.ts`

### Expected work

- add report and draft version records
- add current-version pointers
- preserve top-level `thread.report` and `thread.draft` as compatibility projection
- implement “never overwrite silently”

### What stays untouched

- existing backend compute endpoints:
  - `/api/generate-report`
  - `/api/generate-draft`

## Ticket 8: Sources route update

### Goal

Update `/sources` to read local document references, category context, citations, and lazy-loaded blobs/chunks.

### Primary touched files

- `src/pages/SourcesPage.tsx`
- `src/lib/db.ts`
- `src/types.ts`

### Likely impacted files

- `src/pages/IntakePage.tsx`
- `src/pages/DecisionSummaryPage.tsx`

### Expected work

- resolve category-aware document references
- lazy-load blobs and extraction payloads
- preserve full governing-agreement viewing
- keep citations mapped back to local sources

### What stays untouched

- route path `/sources`
- current full-document viewing requirement

## Ticket 9: QA and persistence verification

### Goal

Verify that the richer local project/workspace model does not break the current end-to-end app.

### Primary touched files

- `tests/*`
- `playwright.config.ts`
- `docs/ladot-demo/16-acceptance-criteria.md`
- `docs/ladot-demo/17-regression-checklist.md`

### Likely impacted files

- any route/page touched by prior tickets if a fix is required

### Expected work

- verify refresh persistence
- verify failed-analysis retry behavior
- verify report persistence
- verify draft persistence
- verify issue persistence
- verify no route regressions

### What stays untouched

- acceptance thresholds themselves, unless a genuine planning correction is needed

## File map by responsibility

### Primary implementation files

- `src/types.ts`
- `src/lib/db.ts`
- `src/pages/IntakePage.tsx`
- `src/pages/DecisionSummaryPage.tsx`
- `src/pages/ReportPage.tsx`
- `src/pages/DraftResponsePage.tsx`
- `src/pages/SourcesPage.tsx`

### Secondary supporting files

- `src/components/Sidebar.tsx`
- `src/components/TopBar.tsx`
- `src/lib/useCurrentThreadSummary.ts`
- `tests/*`
- `playwright.config.ts`

### Backend files that may be impacted carefully

- `server.ts`

Use extreme restraint in `server.ts`. Preserve current ingestion/extraction/analysis/report/draft behavior unless a ticket explicitly extends context or payload wiring in an additive way.

## What stays untouched unless a ticket explicitly requires it

### Route shell

- `src/App.tsx`
  - keep route topology
  - keep the current shell structure

### Backend compute backbone

In `server.ts`, do not rewrite:

- PDF ingestion path
- DOCX ingestion path
- token/char budget logic
- citation extraction flow
- report generation flow
- draft generation flow
- current endpoint names and base request/response shapes

### Architecture direction

- no cloud database
- no remote source of truth
- no visible state-switching UI

## Recommended ticket boundaries for commits

Claude should prefer one checkpoint commit per ticket or tightly related ticket slice.

Recommended commit rhythm:

1. DB compatibility layer
2. intake and document stack
3. issue/comment/submittal/deadline records
4. summary adaptation
5. report/draft versioning
6. sources update
7. QA verification and fixes

## Validation order after each major slice

At minimum:

```bash
npm run lint
npm run build
```

Then run the relevant smoke/regression checks for the routes touched by that ticket.

Priority verification order:

1. `/intake`
2. `/summary`
3. `/report`
4. `/draft`
5. `/sources`

## Definition of done for Claude execution

Claude is done only when:

- the richer local project/workspace model exists
- the current active-thread compatibility path still works
- the route flow still works end to end
- reports and drafts are versioned safely
- sources still resolve local document links
- refresh persistence and failed-analysis retry behavior pass

## Final note to Claude

Do not try to land the whole migration in one jump.

The correct strategy for this branch is:

- additive data structures
- compatibility adapters
- route-by-route migration
- repeated verification

That is how the LA DOTD demo can evolve without breaking the current working NSB app.
