# Performance And Hydration

Date: 2026-04-17  
Branch: `demo/ladot-calcasieu`

## Purpose

Define performance and hydration rules for the LA DOTD / Calcasieu demo branch so the local-first workspace stays responsive even as documents, issues, reports, drafts, and supporting artifacts grow.

## Core principle

Do not hydrate the whole workspace at boot.

Large local-first records are a feature of this branch, but route performance will degrade if every page loads blobs, extracted pages, chunks, and all output versions up front.

## Hot vs cold data

### Hot data

Hot data is small, frequently needed, and should be cheap to load at app boot or route entry.

Examples:

- current project metadata
- current role/scenario metadata
- active analysis summary
- issue list summaries
- citation summary metadata
- current report version pointer
- current draft version pointer
- route-level status flags
- lightweight document metadata

### Cold data

Cold data is large or infrequently needed and should be loaded lazily.

Examples:

- PDF blobs
- optional supporting document blobs
- full extracted page arrays
- full extracted chunk arrays
- old report versions
- old draft versions
- large artifact payloads
- full comment/revision histories not needed for the current route header

## Boot-time minimal hydration

At initial app boot, the app should load only the minimum state needed to establish:

- whether there is an active project/workspace
- the current project label
- whether there is a latest analysis
- whether there is a current report version
- whether there is a current draft version
- enough route-shell state for sidebar/topbar context

It should not load:

- full document blobs
- full page/chunk arrays
- every output version
- every supporting document body

## Route-level lazy loading

### `/intake`

Hydrate:

- active project/workspace metadata
- staged document metadata
- upload status
- local error state

Lazy-load only when needed:

- any blob required for replace/remove/download actions

### `/summary`

Hydrate:

- current analysis
- project metadata
- issue list summaries
- citation summaries if needed for the current screen

Lazy-load only when needed:

- full issue detail
- full citation excerpt bodies beyond the visible slice

### `/report`

Hydrate:

- current report version pointer
- current analysis summary
- citation summaries

Lazy-load only when needed:

- full archived report versions
- export-only artifacts

### `/draft`

Hydrate:

- current draft version pointer
- latest analysis/report context references

Lazy-load only when needed:

- archived draft versions
- heavy related artifacts not shown initially

### `/sources`

Hydrate:

- document list
- category metadata
- citation metadata
- current selected source reference

Lazy-load only when needed:

- PDF blob
- full page text
- large chunk lists
- optional supporting document bodies

`/sources` is the route where lazy loading matters most.

## Blob rules

- store blobs locally
- do not include blobs in every top-level workspace read
- load blobs by reference when the user opens or previews a document
- release viewer-specific in-memory copies when they are no longer needed

## Chunk and page rules

- do not embed all pages/chunks into every summary object
- keep lightweight document metadata separate from heavy extraction payloads
- fetch extraction payloads only for routes or panels that need them

This is especially important for:

- large governing agreements
- marked-up review PDFs
- long correspondence compilations

## Avoid giant object rewrites

This is a key local-first rule.

The app should avoid rewriting one giant workspace object every time a small field changes.

Instead:

- update only the store/record that changed
- update current-version pointers separately from full version bodies
- update document metadata separately from blobs
- update issue summaries separately from full histories when possible

## Recommended write pattern

### Good

- write metadata record
- write blob record
- write version record
- update current pointer

### Bad

- rewrite the entire workspace, all blobs, all outputs, and all extracted text because one draft field changed

## Selector-style loading

Routes should prefer selector-style reads for hot state.

Examples:

- current project summary
- current analysis summary
- current report pointer
- current draft pointer
- current document list

Then follow with targeted reads for cold data.

## Rehydration after refresh

After a full page reload, the app should be able to restore the active workspace quickly by reading:

- project summary
- current analysis summary
- current route pointers

It should not block first paint on:

- PDF blob hydration
- chunk hydration
- archived version hydration

## Version-history loading rule

Version histories for reports and drafts should load on demand.

Default route behavior should load:

- current version metadata
- current version body only

Then load older versions only when the user opens version history.

## Success condition

This performance model is successful when the LA DOTD demo can keep large local documents and richer workspace history without:

- slow boot
- route stalls from eager blob loading
- giant object rewrites
- unnecessary hydration of cold data

