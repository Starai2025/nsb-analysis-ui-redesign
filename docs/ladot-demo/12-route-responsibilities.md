# Route Responsibilities

Date: 2026-04-17  
Branch: `demo/ladot-calcasieu`

## Purpose

Define the exact implementation responsibilities for each major route in the LA DOTD / Calcasieu demo branch.

This document is more specific than the earlier Phase 2 route note. It is the implementation contract for how the routed pages should read from and write to the local workspace while preserving the current end-to-end flow:

- `/intake`
- `/summary`
- `/report`
- `/draft`
- `/sources`

## Global rules

- The browser is the primary source of truth.
- Every route works from the active local project/workspace.
- No route should depend on a remote database to function.
- The current active-thread compatibility projection must remain available while the richer local model evolves.
- No route should silently discard local edits or generated outputs.

## Active local workspace contract

All routes should treat the active local workspace as the canonical working record for the current review session.

At minimum, that active workspace should be able to reference:

- project metadata
- role and scenario metadata
- staged document records
- ingested document structures
- latest analysis
- issue list
- citations
- saved reports
- saved drafts
- source-viewer references
- local error state or generation state

## `/intake`

### Primary responsibility

Create the active local project/workspace, stage documents, and launch analysis without losing work on failure.

### `/intake` must do

- create a project/workspace record when the user begins setup
- save project metadata locally
- save parties/role metadata locally
- save scenario metadata locally
- stage required and optional document metadata locally
- save local file blobs before analysis
- map the current required categories into the existing `/api/analyze` request
- call `/api/analyze`
- save returned analysis artifacts locally on success
- preserve the local workspace if analysis fails

### Required local write order

1. create local project record
2. save project metadata
3. save role and scenario metadata
4. save uploaded file metadata locally
5. save uploaded file blobs locally
6. update staged-document state
7. call `/api/analyze`
8. save returned analysis locally
9. save citations locally
10. save ingested document structures locally
11. update the active-thread/workspace projection
12. navigate to `/summary`

### Failure behavior

If analysis fails, `/intake` must:

- preserve the project/workspace record
- preserve staged document metadata
- preserve local blobs
- preserve user-entered project and scenario fields
- store analysis error state locally
- allow retry without forcing the user to rebuild the workspace

### Things `/intake` must not do

- clear the workspace just because analysis failed
- depend on the server as the authoritative persistence layer
- require optional documents before analysis can start
- discard staged documents when the user changes one field

## `/summary`

### Primary responsibility

Read the active local project and present the latest analysis plus the emerging issue picture for the workspace.

### `/summary` must do

- read the active local project/workspace
- show the latest saved analysis
- show the latest project and scenario context
- show the current issue list or issue candidates once available
- allow local edits and overrides to analysis-facing fields
- save those local edits explicitly
- remain compatible with current downstream report/draft generation

### Local edits and overrides

`/summary` is the correct place for controlled local editing of:

- responsibility interpretation
- risk framing
- issue labeling
- summary-facing override fields

### `/summary` must not do

- reconstruct the workspace from the server
- assume a fresh analysis run exists if the local workspace says otherwise
- silently rewrite source-derived values without storing an explicit override

## `/report`

### Primary responsibility

Generate the report from the active local analysis and citations, then save a versioned report locally.

### `/report` must do

- read the active local project/workspace
- read the latest saved analysis
- read the latest citations
- read project and scenario context
- generate a report through the existing backend compute flow
- save a versioned report locally
- keep the newest report discoverable as the current report
- preserve older report versions unless the user explicitly discards them

### `/report` output contract

`/report` should produce:

- versioned report metadata
- versioned report body/sections
- generation timestamp
- provenance to the analysis version used

### `/report` must not do

- overwrite the previous report silently
- depend on only one mutable `report` object forever
- discard the source analysis context that produced the report

## `/draft`

### Primary responsibility

Generate the draft using the active analysis/report context, then save a versioned draft locally.

### `/draft` must do

- read the active local project/workspace
- read the latest saved analysis
- read the latest report context when available
- read citations and project metadata
- generate the draft through the existing backend compute flow
- save a versioned draft locally
- keep the newest draft discoverable as the current draft
- preserve older draft versions unless explicitly replaced by user action

### `/draft` output contract

`/draft` should produce:

- versioned draft metadata
- versioned draft letter content
- versioned strategy block
- provenance to the report and/or analysis version used

### `/draft` must not do

- silently replace prior draft text
- lose manually edited draft content during autosave
- require the report route to have been visited if the analysis data is sufficient

## `/sources`

### Primary responsibility

Read local document references and present citations, extracted chunks, and local source links in a way that is traceable and performant.

### `/sources` must do

- read local document metadata and references
- resolve document-category context
- show citations tied to local sources
- show chunks or page references tied to local sources
- resolve local source links back to stored documents
- preserve full-document viewing for the governing agreement
- remain compatible with staged supporting documents over time

### Source-link behavior

`/sources` should be able to resolve from a citation or chunk to:

- document category
- document name
- stored document record
- relevant page or chunk reference
- local blob or extracted text

### `/sources` must not do

- depend on server-side document persistence for viewing
- load every blob and every chunk at route boot by default
- break when optional supporting documents exist but are not part of the latest analyze call

## Cross-route state ownership

### Routes that write first-order workspace state

- `/intake`
- `/summary`
- `/report`
- `/draft`

### Routes that primarily read and resolve source state

- `/sources`

### Shared rule

Any route that writes must write into the active local workspace model in a way that preserves:

- current route compatibility
- prior output versions
- explicit user overrides

## Recommended implementation sequence

1. make `/intake` the reliable creator of the local workspace
2. make `/summary` the reliable reader/editor of the latest analysis and issue state
3. make `/report` save versioned reports locally
4. make `/draft` save versioned drafts locally
5. make `/sources` resolve local document links lazily and consistently

## Success condition

This route contract is successful when each page has a clear local responsibility boundary and the app can evolve richer workspace behavior without breaking the current intake -> summary -> report -> draft -> sources flow.
