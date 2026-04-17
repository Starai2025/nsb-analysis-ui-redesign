# Backup And Export Plan

Date: 2026-04-17  
Branch: `demo/ladot-calcasieu`

## Purpose

Define how the LA DOTD / Calcasieu demo branch should handle:

- local snapshots
- manual export behavior
- optional server backup as a secondary-only mechanism

This plan protects the local-first architecture while still giving the user ways to preserve and move their work.

## Core principles

- IndexedDB remains the primary source of truth.
- Exports are user-controlled artifacts, not the main storage path.
- Local snapshots should support recovery and transfer without requiring a remote database.
- Any server backup remains secondary and non-authoritative.

## Local snapshot model

### Purpose of a snapshot

A local snapshot is a self-contained record of the active workspace state at a point in time.

It should help with:

- manual backup
- workspace recovery
- branch/demo review handoff
- debugging and QA reproduction

### Snapshot scope

A local snapshot may include:

- project metadata
- role and scenario metadata
- document metadata
- analysis
- citations
- issue summaries
- submittal summaries
- deadline summaries
- current report metadata and content
- current draft metadata and content
- version pointers

Large binary artifacts should be handled deliberately rather than always inlined.

## Snapshot granularity

### Lightweight snapshot

Use for:

- fast backup
- debugging
- quick export/import

May include:

- project/workspace metadata
- document metadata
- analysis
- citations
- issues
- reports and drafts as text/JSON
- references to local blobs, not necessarily the blob bodies

### Full snapshot

Use for:

- explicit user backup
- project transfer
- stronger recovery needs

May include:

- all lightweight snapshot fields
- selected or all local blobs
- PDF/viewer-critical artifacts

## Manual export behavior

Exports should be explicit user actions. The app should not silently export or sync in the background.

### Supported export families

- project JSON
- report export
- draft export
- issue summary export

## Project JSON export

### Purpose

Provide a portable local workspace record.

### Minimum content

- project metadata
- role/scenario metadata
- document metadata
- latest analysis
- citations
- issue summaries
- submittal summaries if available
- deadline summaries if available
- report and draft version pointers

### Recommended format

- JSON

### Behavior rules

- export should be explicit
- export should indicate whether blobs are included
- export should include schema/version metadata for future compatibility

## Report export

### Purpose

Provide a user-facing deliverable of the current or selected report version.

### Recommended formats

- PDF
- JSON metadata export if needed for internal debugging or import

### Behavior rules

- the user should be able to export the current report version
- exporting a report must not mutate the report version itself
- the export artifact should record which report version it came from

## Draft export

### Purpose

Provide a portable copy of the current or selected draft version.

### Recommended formats

- DOCX or plain text compatible export in future
- PDF optional
- JSON metadata export if needed for debugging/import

### Behavior rules

- the user should be able to export the current draft version
- exporting a draft must not overwrite or mutate the saved draft version
- the export should record which draft version it came from

## Issue summary export

### Purpose

Provide a concise review package of current issue state without forcing a full project export.

### Recommended content

- project name and identifiers
- issue list with taxonomy/status/severity
- linked deadlines summary
- linked submittal references
- key source references or citations

### Recommended format

- JSON first
- future PDF/CSV summary optional if useful

## Export provenance rules

Each export should record enough provenance to be trustworthy.

Recommended provenance metadata:

- export id
- export type
- project/workspace id
- source version ids
- exported at timestamp
- schema version
- whether blobs were included

## Optional server backup

### Role

The existing server backup may continue as a convenience or fallback, but it is strictly secondary.

### What server backup may do

- mirror a lightweight copy of analysis state
- support debugging
- provide limited recovery help during development

### What server backup must not do

- replace IndexedDB as the source of truth
- become the only location where reports or drafts survive
- be required for route hydration after refresh
- silently supersede local user-edited data

## Backup precedence rule

If local IndexedDB and server backup disagree:

- local IndexedDB wins

The server backup is advisory or fallback only.

## Snapshot and export frequency

### Recommended manual triggers

- after successful analysis
- after a significant summary edit
- after report generation
- after draft generation
- before major regeneration or version-branching actions

### Optional future prompting

The app may suggest an export or snapshot after major milestones, but it should not force one.

## Compatibility rule during migration

While the app still maintains a current-thread compatibility layer:

- exports should be able to derive from the richer local project model
- current-thread fallback data may still be included for compatibility
- no export feature should require the full migration to be finished before it can work

## Success condition

This plan is successful when the app can:

- preserve local-first behavior
- let users manually export meaningful artifacts
- support local snapshots for recovery and portability
- treat server backup as secondary only

