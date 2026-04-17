# Current State Audit

Date: 2026-04-17  
Branch: `demo/ladot-calcasieu`

## Scope inspected

- `src/App.tsx`
- `src/pages/IntakePage.tsx`
- `server.ts`
- `src/lib/db.ts`
- `src/types.ts`

## Executive summary

The current NSB app already runs as a local-first single-thread workflow with a stable end-to-end route shell:

1. `/intake` collects project basics and two uploaded files.
2. `/api/analyze` ingests both files, runs analysis, extracts citations, and returns structured data.
3. The browser saves the returned analysis, project data, ingested documents, citations, and PDF blob into IndexedDB.
4. The client navigates to `/summary`.
5. The same persisted thread then supports `/report`, `/draft`, and `/sources`.

That means the Louisiana / LA DOTD demo branch should extend the current thread and project models without replacing the route shell or moving the source of truth off the browser.

## Route map and shell

`src/App.tsx` mounts a `BrowserRouter` with the following routes:

- `/` redirects to `/intake`
- `/intake` renders `IntakePage`
- `/summary` renders `DecisionSummaryPage`
- `/report` renders `ReportPage`
- `/sources` renders `SourcesPage`
- `/draft` renders `DraftResponsePage`
- `*` redirects to `/intake`

The route shell is already global and should be preserved:

- `WakeUp` gates the app until `/api/health` responds.
- `Sidebar` stays mounted for route-to-route navigation.
- `TopBar` stays mounted and reflects the active thread.
- `AskTheContract` stays mounted as the persistent assistant panel.

The current layout contract is therefore:

- fixed left navigation shell
- fixed top application bar
- central route content area
- persistent assistant surface

## Intake flow

`src/pages/IntakePage.tsx` is the current entry point for analysis creation.

### Inputs collected

- `projectName`
- `contractNumber`
- `changeRequestId`
- one `contract` upload
- one `correspondence` upload

### Upload constraints

Supported file types are currently:

- PDF
- DOCX

The page rejects unsupported file types client-side before submission.

### Analyze submission flow

`handleAnalyze()` does the following:

1. Requires both uploaded files.
2. Sets analyzing UI state, status text, and a timer.
3. Calls `GET /api/health` as a reachability check.
4. Builds `FormData` with:
   - `contract`
   - `correspondence`
   - `projectName`
   - `contractNumber`
   - `changeRequestId`
5. Posts that payload to `POST /api/analyze`.
6. Parses the JSON response.
7. Reads the contract PDF into an `ArrayBuffer` when the contract is a PDF.
8. Clears the previous current thread from IndexedDB.
9. Saves the new thread payload into IndexedDB.
10. Navigates to `/summary`.

### Intake persistence behavior

On success, the page saves the following into IndexedDB:

- `analysis`
- `projectData`
- `contract`
- `correspondence`
- `citations`
- `contractBlob`

This is the critical compatibility point for the demo branch: the intake flow already persists everything the downstream pages need.

## Backend contract

`server.ts` is currently a compute layer plus a lightweight backup store. The browser remains the primary application store.

### Health and metadata endpoints

- `GET /api/health`
  - returns `{ status, timestamp }`
- `GET /api/knowledge-meta`
  - returns knowledge/version metadata used by the analysis layer

### Core analysis endpoint

- `POST /api/analyze`
  - accepts multipart form-data
  - required files:
    - `contract`
    - `correspondence`
  - request text fields:
    - `projectName`
    - `contractNumber`
    - `changeRequestId`

Current backend steps:

1. Validate both files exist.
2. Validate MIME type is PDF or DOCX.
3. Ingest both files into extracted document objects.
4. Run Claude analysis.
5. Extract citations from the contract.
6. Build `projectData` from request body.
7. Save a server-side metadata backup.
8. Return the full client payload.

Current `/api/analyze` response shape:

- `success`
- `analysis`
- `projectData`
- `citations`
- `knowledgeMeta`
- `contract`
- `correspondence`

### Secondary endpoints

- `POST /api/save-analysis`
  - updates server backup data for `analysis` and/or `projectData`
- `POST /api/generate-report`
  - generates a report from request body data or the server backup
- `POST /api/generate-draft`
  - generates a draft from request body data or the server backup
- `GET /api/store`
  - returns the server-side backup object
- `POST /api/chat`
  - answers document questions from uploaded chunks/history context

### Important architectural reading

The current server does retain a backup object, but it is not the primary source of truth for the running app. The browser thread is the main record used by the route flow.

## IndexedDB contract

`src/lib/db.ts` defines the current browser persistence model.

### Database and stores

- database name: `nsb-db`
- version: `1`
- stores:
  - `threads`
  - `preferences`

### Current thread model

The app currently behaves as a single-thread local app:

- `CURRENT_THREAD_ID = "current"`

That means all pages are wired around one active analysis thread rather than a multi-project selector.

### Stored thread shape

`NSBThread` currently includes:

- `id`
- `createdAt`
- `updatedAt`
- `projectData`
- `analysis`
- optional `contract`
- optional `correspondence`
- optional `citations`
- optional `draft`
- optional `chatHistory`
- optional `report`
- optional `contractBlob`

### Persistence behavior

- `saveCurrentThread(...)`
  - upserts the single current thread
  - preserves `createdAt`
  - preserves omitted evidence fields from the existing thread
- `loadCurrentThread()`
  - returns the current thread or `null`
- `clearCurrentThread()`
  - deletes the single current thread
- `setPreference()` / `getPreference()`
  - store small UI state only

This is already a strong local-first pattern and should remain the base contract for the demo branch.

## Current shared types

`src/types.ts` provides the current cross-page payload shapes.

### Analysis payload

`AnalysisResult` currently includes:

- `executiveConclusion`
- `scopeStatus`
- `primaryResponsibility`
- `secondaryResponsibility`
- `extraMoneyLikely`
- `extraTimeLikely`
- `claimableAmount`
- `extraDays`
- `noticeDeadline`
- `strategicRecommendation`
- `keyRisks`

This type feeds summary, report, and draft generation.

### Project data payload

`ProjectData` is currently minimal:

- `name`
- `contractNumber`
- `changeRequestId`

This is the main type that must be expanded for the Louisiana demo without breaking downstream consumers.

### Document ingestion payload

Key ingestion types:

- `DocumentType`
- `ExtractedPage`
- `ExtractedChunk`
- `ExtractedDocument`
- `IngestionStore`

Important current document capabilities:

- page-aware extracted text
- chunk-aware extracted text
- file metadata including MIME type, upload time, and optional page count

These are the existing hooks that can support Louisiana issue tracking, submittal history, and source citation work later.

### Report and draft payloads

The downstream route flow already has structured models for:

- `Report`
- `ReportMetadata`
- `ReportSections`
- `Draft`
- `DraftStrategy`

Because those types are already wired into `/report` and `/draft`, the demo branch should preserve compatibility and evolve the upstream payloads conservatively.

## Stability and compatibility constraints

The following current behaviors should be treated as compatibility constraints for the Louisiana demo branch:

- keep the route shell intact
- keep `/intake -> /summary -> /report -> /draft -> /sources` working
- keep IndexedDB as the browser source of truth
- keep server endpoints as compute/generation surfaces
- preserve `saveCurrentThread(...)` compatibility
- preserve the existing `AnalysisResult`, `ProjectData`, `ExtractedDocument`, `Report`, and `Draft` consumers while extending them
- avoid introducing unfinished region switching into the visible demo UI

## Implications for the LA DOTD demo branch

The current architecture is already suitable for a local-first demo branch if we make additive, compatibility-safe changes:

- expand `ProjectData` instead of replacing it
- evolve the single-thread model toward richer project metadata without breaking `CURRENT_THREAD_ID = "current"`
- preserve current route destinations and shell placement
- keep generated report/draft/source artifacts saved locally in IndexedDB after each response
- treat the server as ingestion + analysis + generation compute, not the durable system of record
