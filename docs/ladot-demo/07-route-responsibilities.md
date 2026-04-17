# Route Responsibilities

Date: 2026-04-17  
Branch: `demo/ladot-calcasieu`

## Purpose

Define what each major route is responsible for in the LA DOTD demo branch so the intake redesign does not accidentally break the existing end-to-end flow.

## Global rule

The browser remains the primary source of truth. Each route should read or update the active local workspace in a way that preserves compatibility with the current single-thread flow.

## `/intake`

Primary responsibility:

- create and stage the active workspace

`/intake` should:

- create the local project/workspace record
- save project metadata
- save role and scenario metadata
- save uploaded file metadata and blobs locally
- map required categories into the current `/api/analyze` request
- call `/api/analyze`
- save returned analysis locally on success
- preserve the workspace if analysis fails

### Required local write order

1. create local project record
2. save project metadata
3. save uploaded file metadata locally
4. save uploaded file blobs locally
5. call `/api/analyze`
6. save returned analysis locally
7. navigate to `/summary`

### On success

- persist analysis
- persist citations
- persist ingested documents
- update active thread / workspace projection
- navigate to `/summary`

### On failure

- keep the local project/workspace record
- keep staged documents
- keep metadata and blobs
- save error state
- remain on `/intake`

## `/summary`

Primary responsibility:

- present the current issue analysis in decision form

`/summary` should:

- read the active local workspace
- present analysis and project context
- allow safe edits or refinements to saved analysis data
- avoid becoming the place where source truth is reconstructed from the server

## `/report`

Primary responsibility:

- generate or present the formal report based on the active local workspace

`/report` should:

- read analysis and project context from the active local workspace
- save generated report output locally
- preserve compatibility with any expanded Calcasieu project metadata

## `/draft`

Primary responsibility:

- generate or present the response draft and strategy using the active local workspace

`/draft` should:

- read analysis, report, citations, and project context from the local workspace
- save generated draft output locally
- remain compatible with role-aware output framing

## `/sources`

Primary responsibility:

- present the source record behind the workspace

`/sources` should:

- show the full original source documents that are stored locally
- preserve full-document viewing for the governing agreement
- align citations back to stored source content
- remain compatible with a broader document stack over time

## Cross-route compatibility rule

All major routes should continue to function from the active local workspace even as the schema evolves.

That means:

- `/intake` writes
- `/summary` reads and lightly edits
- `/report` reads and saves report artifacts
- `/draft` reads and saves draft artifacts
- `/sources` reads source artifacts and viewer state

No route should require a new remote persistence layer to function.
