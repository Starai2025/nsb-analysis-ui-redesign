# Regression Checklist

Date: 2026-04-17  
Branch: `demo/ladot-calcasieu`

## Purpose

Define the must-not-break list for the LA DOTD / Calcasieu demo branch and the fallback compatibility rules while the app migrates from the current thread model toward a richer local project model.

## Primary rule

No migration step is acceptable if it breaks the current working route flow or silently strands user data in an unfinished store shape.

## Must-not-break list

### Core route flow

These routes must continue to work throughout migration:

- `/intake`
- `/summary`
- `/report`
- `/draft`
- `/sources`

### Core local persistence

These behaviors must continue to work:

- active local workspace survives refresh
- saved analysis survives navigation
- saved citations survive navigation
- current report survives navigation
- current draft survives navigation
- current source-viewer references survive navigation

### Current backend compatibility

These behaviors must continue to work:

- `/api/analyze` still accepts the current two required analysis files
- `/api/generate-report` still works from saved local context
- `/api/generate-draft` still works from saved local context

### Full-document source behavior

These behaviors must continue to work:

- governing agreement remains locally viewable
- citations still point back to local source records
- source route can still resolve pages/chunks or equivalent local references

## Migration-era fallback compatibility rules

### Rule 1: current thread remains the compatibility projection

While the richer project/workspace model is being introduced:

- keep the current thread projection alive
- do not remove the top-level active-thread read path too early
- let existing routes continue to function through that projection

### Rule 2: additive stores must not become mandatory before adapters exist

If new project-oriented stores are introduced:

- routes may write to them
- routes may read from them selectively
- but the current routes must still be able to function through compatibility adapters until full migration is complete

### Rule 3: local data wins over server fallback

If a richer local project model and the old server backup disagree:

- local data wins

### Rule 4: route hydration must tolerate partial migration

If only part of the new project model exists:

- routes should fall back to the current thread projection
- the app should not crash because one new store is empty

## Regression categories to check every time

### Storage regressions

Check:

- did refresh still restore the active workspace?
- did any save path stop writing to local storage?
- did a migration step create silent data loss?

### Route regressions

Check:

- does each route still load?
- does each route still find the active local workspace?
- did a route start depending on data that is not guaranteed yet?

### Output regressions

Check:

- does report generation still work?
- does draft generation still work?
- do current report/draft artifacts still survive refresh?
- did versioning break the existing page assumptions?

### Source regressions

Check:

- can the Sources page still resolve the governing agreement?
- do citations still map back to local source records?
- did lazy-loading break actual source access?

### Failure-path regressions

Check:

- if analysis fails, is the workspace still there?
- if report generation fails, is the current saved report still there?
- if draft generation fails, is the current saved draft still there?

## Compatibility fallback examples

### When new project records exist but versioning is partial

Fallback:

- use the new current-version pointer if present
- otherwise fall back to top-level `thread.report` or `thread.draft`

### When new document stores exist but source-viewer migration is partial

Fallback:

- use the new document/source references if present
- otherwise fall back to the current `contract`, `correspondence`, and `contractBlob` thread fields

### When issue stores exist but summary migration is partial

Fallback:

- use new issue records if present
- otherwise show the existing analysis and issue-candidate view without crashing

## Release-gate regression questions

Before considering a migration slice acceptable, ask:

1. Does refresh still work?
2. Does failed analysis retry still work?
3. Does `/summary` still load the latest analysis?
4. Does `/report` still show a saved report?
5. Does `/draft` still show a saved draft?
6. Does `/sources` still resolve local source content?
7. Did any step require the server to become the source of truth?

If any answer is “no,” the slice is not ready.

## Success condition

This checklist is successful when it gives the team a concrete must-not-break standard while the app evolves from the current thread model toward the richer LA DOTD project/workspace model.
