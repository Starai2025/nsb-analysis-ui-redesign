# Local-First Architecture

Date: 2026-04-17  
Branch: `demo/ladot-calcasieu`

## Decision

The LA DOTD demo branch remains local-first.

The browser is the source of truth for meaningful user data. The server remains a compute layer for ingestion, extraction, analysis, report generation, draft generation, and chat assistance.

## Architecture stance

| Layer | Role |
|---|---|
| IndexedDB | Primary durable app storage in the browser |
| localStorage | Tiny UI flags only |
| Express backend | File processing and model orchestration only |
| Model provider | Server-side only, never called from the browser |

## Non-negotiable storage rules

- No Supabase for this branch.
- No durable remote database for this branch.
- No replacement of IndexedDB as the primary store.
- All generated artifacts must be saved locally after a successful response.
- The server backup object may continue to exist as a convenience, but it is not the authoritative application database.

## Why this is the right fit for the demo

The current app already saves the active analysis thread locally and uses that browser state to drive:

- summary
- report
- draft
- sources

That existing pattern is a strong fit for a demo branch because it:

- keeps the app usable without introducing infrastructure risk
- preserves fast page-to-page continuity
- keeps generated artifacts close to the user session
- avoids a rushed cloud persistence redesign

## Browser responsibilities

The browser should persist:

- project metadata
- uploaded-document metadata
- extracted document structures
- analysis results
- citations
- issues and deadlines
- generated reports
- generated drafts
- source-viewer artifacts such as the contract PDF blob
- preferences and lightweight UI state

## localStorage rule

Use `localStorage` only for tiny UI/session flags such as:

- last-opened panel
- dismissible UI hints
- similar low-risk view preferences

Do not store core project records, generated analysis, reports, or source data in `localStorage`.

## Server responsibilities

The server is responsible for:

- upload handling
- document ingestion
- page/chunk extraction
- model calls
- citation extraction
- report generation
- draft generation
- document question answering

The server should return structured payloads to the client, after which the client persists them locally.

## Artifact persistence rule

After each meaningful generation response, the client should save the returned artifact locally in IndexedDB.

This includes:

- analysis payloads
- project data
- citations
- reports
- drafts
- issue artifacts produced in future phases

## Full-document viewing rule

Analysis payload limits and viewer behavior must stay decoupled.

- The Sources page must remain able to show the full original uploaded document.
- Large-document analysis may use extracted text and chunking.
- The original document or PDF blob should still be retained locally for viewing and citation navigation.

## Compatibility requirement

The current route flow must continue to work while this architecture evolves:

- `/intake` writes the active thread
- `/summary` reads the active thread
- `/report` uses the active thread plus generated report
- `/draft` uses the active thread plus generated draft
- `/sources` uses the active thread plus stored source artifacts

This means schema evolution must be additive and compatibility-safe.

## Recommended implementation principle

When in doubt:

1. keep meaningful data in IndexedDB
2. keep only small UI flags in localStorage
3. keep compute and model calls on the server
4. save returned artifacts locally before changing the route flow

## Practical consequence for this branch

All Louisiana demo work should be judged against one question:

Does this strengthen the current local-first route flow, or does it weaken it by moving durable state away from the browser?

If it weakens local-first behavior, it does not belong in this branch.
