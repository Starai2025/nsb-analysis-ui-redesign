# Acceptance Criteria

Date: 2026-04-17  
Branch: `demo/ladot-calcasieu`

## Purpose

Define pass/fail criteria for the LA DOTD / Calcasieu demo branch across:

- storage
- routes
- performance
- outputs
- failure handling

These criteria should be used to judge whether implementation is truly acceptable, not merely whether code compiles.

## Evaluation rule

A feature is not accepted if it works only before refresh, works only on one route, or relies on silent data loss.

## Storage acceptance criteria

### Pass

- project/workspace metadata survives refresh
- staged required document metadata survives refresh
- staged optional document metadata survives refresh
- saved analysis survives refresh
- saved citations survive refresh
- saved issue records survive refresh
- saved report current-version pointer survives refresh
- saved draft current-version pointer survives refresh
- local source-viewer references survive refresh

### Fail

- refresh clears the active workspace
- refresh loses report/draft state
- refresh loses issue state
- stored artifacts depend on the server backup to reappear

## Refresh persistence criteria

### Pass

After a full browser refresh, the app can restore enough local state to:

- identify the active workspace
- show the latest analysis on `/summary`
- show the current report on `/report`
- show the current draft on `/draft`
- resolve source references on `/sources`

### Fail

- the app boots into an effectively blank state even though local data exists
- route hydration requires re-running analysis to recover current state

## Failed analysis retry behavior

### Pass

If analysis fails:

- project metadata remains
- staged documents remain
- the user sees the failure clearly
- the user can retry without rebuilding the workspace

### Fail

- analysis failure clears the workspace
- analysis failure drops staged documents
- retry requires re-entering project setup from scratch

## Route acceptance criteria

### `/intake`

Pass:

- creates/stages the local workspace
- preserves failed attempts
- launches analysis correctly

Fail:

- acts like a stateless upload form
- loses staged work on failure

### `/summary`

Pass:

- reads the active local project
- shows the latest analysis
- shows issue state when available
- preserves explicit local edits and overrides

Fail:

- depends on server-only state
- loses overrides after refresh

### `/report`

Pass:

- reads local analysis/citations context
- generates a report
- saves a versioned report locally

Fail:

- only shows a transient generated report
- silently overwrites the previous saved report

### `/draft`

Pass:

- reads local analysis/report context
- generates a draft
- saves a versioned draft locally

Fail:

- only shows transient draft text
- silently overwrites the prior draft

### `/sources`

Pass:

- reads local document references
- shows citations and chunks/page references
- resolves local source links

Fail:

- requires server-side source persistence to function
- cannot reconnect citations to local source records

## Output persistence criteria

### Report persistence

Pass:

- generated report is saved locally
- current report version is discoverable after refresh
- prior report version is not silently lost

Fail:

- report disappears after leaving the route
- regenerate destroys the prior report with no version trail

### Draft persistence

Pass:

- generated draft is saved locally
- current draft version is discoverable after refresh
- prior draft version is not silently lost

Fail:

- draft disappears after leaving the route
- regenerate destroys the prior draft with no version trail

### Issue persistence

Pass:

- issue list or issue records survive refresh
- linked issue metadata remains available to summary/report/draft flows

Fail:

- issues are recomputed ad hoc and vanish across navigation or refresh

## No route regressions

### Pass

The core route flow remains intact:

- `/intake`
- `/summary`
- `/report`
- `/draft`
- `/sources`

and each route continues to function without relying on a new remote persistence layer.

### Fail

- any route is broken by the migration
- any route no longer works with the current-thread compatibility projection
- any route now requires a cloud backend or manual repair to open correctly

## Performance acceptance criteria

### Pass

- app boot does not eagerly hydrate large blobs and chunk sets
- `/sources` loads heavy document bodies lazily
- summary/report/draft routes open from hot data without route-stall behavior
- small edits do not trigger whole-workspace rewrites

### Fail

- route boot blocks on blob hydration
- large documents are always fully loaded at boot
- small updates cause giant local object rewrites

## Output quality criteria

### Pass

- reports remain grounded in saved local analysis and citations
- drafts remain grounded in saved local analysis/report context
- outputs preserve versioning and provenance

### Fail

- outputs are detached from saved local context
- users cannot tell what analysis/version produced the output

## Overall acceptance decision

The branch passes only if all of the following are true:

- refresh persistence works
- failed analysis retry behavior is preserved
- report persistence works
- draft persistence works
- issue persistence works
- no route regressions are introduced

If any of those fail, the implementation is not ready.
