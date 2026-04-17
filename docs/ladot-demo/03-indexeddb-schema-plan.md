# IndexedDB Schema Plan

Date: 2026-04-17  
Branch: `demo/ladot-calcasieu`

## Current baseline

The current browser database contains:

- `threads`
- `preferences`

The current app behaves as a single-thread app through:

- `CURRENT_THREAD_ID = "current"`

That behavior must remain compatible while the LA DOTD demo evolves richer project records.

## Goal

Move from a single-thread-centered structure toward a project-oriented local model without breaking the current route flow.

## Design principle

The current `threads` store remains the compatibility anchor during the migration period.

New stores should be added alongside it, not instead of it, until the routed pages are ready to read from the richer model directly.

## Target stores

- `projects`
- `documents`
- `extractions`
- `analyses`
- `issues`
- `submittals`
- `comments`
- `deadlines`
- `drafts`
- `reports`
- `artifacts`
- `preferences`

## Compatibility strategy

### Phase A: additive store expansion

Add new stores while preserving the existing `threads` store and `CURRENT_THREAD_ID = "current"` behavior.

During this phase:

- `/intake`, `/summary`, `/report`, `/draft`, and `/sources` may continue to read/write the current thread
- new project-oriented records may be written in parallel
- `threads.current` acts as the compatibility projection for the active demo record

### Phase B: routed-page migration

Once the new stores are stable, routed pages can progressively read from project-oriented stores while still updating the compatibility thread projection.

### Phase C: thread projection remains as adapter

Even after broader migration, keep a thin thread adapter until all route consumers are safely migrated. Do not remove `threads` early.

## Proposed store responsibilities

### `projects`

Primary metadata record for the active demo matter.

Suggested fields:

- `id`
- `name`
- `contractNumber`
- `changeRequestId`
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
- `createdAt`
- `updatedAt`

### `documents`

One record per uploaded source document.

Suggested fields:

- `id`
- `projectId`
- `type`
- `name`
- `mimeType`
- `fileSize`
- `uploadedAt`
- `pageCount`
- `blobRef` or embedded blob metadata for local viewing
- `status`

### `extractions`

Normalized extracted text and chunking records tied to a document.

Suggested fields:

- `id`
- `documentId`
- `projectId`
- `pages`
- `chunks`
- `extractedAt`
- `extractorVersion`

### `analyses`

Structured analysis results produced from a specific run.

Suggested fields:

- `id`
- `projectId`
- `contractDocumentId`
- `correspondenceDocumentId`
- `analysis`
- `citations`
- `knowledgeMeta`
- `createdAt`
- `updatedAt`

### `issues`

Issue-level records for demo-specific problem framing.

Suggested fields:

- `id`
- `projectId`
- `title`
- `category`
- `status`
- `summary`
- `responsibilityHypothesis`
- `noticeRiskLevel`
- `createdAt`
- `updatedAt`

### `submittals`

Records for design-package or review-cycle history.

Suggested fields:

- `id`
- `projectId`
- `issueId`
- `name`
- `discipline`
- `status`
- `submittedAt`
- `respondedAt`
- `reviewOutcome`

### `comments`

Structured correspondence or review-comment records.

Suggested fields:

- `id`
- `projectId`
- `issueId`
- `documentId`
- `author`
- `direction`
- `sentAt`
- `summary`
- `pageRefs`

### `deadlines`

Notice and response timing records.

Suggested fields:

- `id`
- `projectId`
- `issueId`
- `type`
- `deadline`
- `status`
- `sourceDocumentId`
- `sourcePage`

### `drafts`

Stored generated draft responses.

Suggested fields:

- `id`
- `projectId`
- `analysisId`
- `draft`
- `createdAt`
- `updatedAt`

### `reports`

Stored generated formal reports.

Suggested fields:

- `id`
- `projectId`
- `analysisId`
- `report`
- `createdAt`
- `updatedAt`

### `artifacts`

Local generated or derived assets that do not fit cleanly elsewhere.

Examples:

- exported PDFs
- intermediate mapping payloads
- viewer-specific caches

Suggested fields:

- `id`
- `projectId`
- `kind`
- `payload`
- `createdAt`

### `preferences`

Tiny UI flags only. This store remains intentionally small.

## Adapter mapping to current thread

During migration, `threads.current` should continue to expose the fields the current app expects:

- `projectData`
- `analysis`
- `contract`
- `correspondence`
- `citations`
- `draft`
- `report`
- `chatHistory`
- `contractBlob`

That thread record becomes the compatibility envelope built from the richer project stores.

## Migration constraints

- do not break existing reads from `loadCurrentThread()`
- do not remove `saveCurrentThread()` until all route consumers migrate
- do not force a visible multi-project UI as part of this demo branch
- do not split the current route flow across incompatible persistence paths

## Recommended implementation order

1. expand `ProjectData`
2. add `projects` and `documents`
3. add `extractions` and `analyses`
4. add issue-oriented stores
5. add reports/drafts/artifacts records
6. keep `threads.current` as a compatibility projection throughout

## Success condition

The schema plan is successful if the app can grow richer Louisiana demo records while the existing route flow still behaves like a single active analysis thread from the user’s point of view.
