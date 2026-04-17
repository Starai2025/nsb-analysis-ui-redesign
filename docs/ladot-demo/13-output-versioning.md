# Output Versioning

Date: 2026-04-17  
Branch: `demo/ladot-calcasieu`

## Purpose

Define versioning rules for reports and drafts in the LA DOTD / Calcasieu demo branch.

The core rule is simple:

- never overwrite silently

Generated outputs are workspace artifacts and should be treated as versioned local records rather than one mutable text field that is replaced without history.

## Scope

This document covers:

- report versioning
- draft versioning
- autosave behavior
- explicit save behavior
- provenance and current-version pointers

## Versioning principles

- every generated output gets a version id
- every version records when it was created and from which context
- the workspace can point to a current version without deleting prior versions
- autosave can update a working version, but must not silently destroy prior stable versions
- manual edits must be preserved distinctly from generated output

## Output families

### Reports

Reports should be stored as a versioned series per project/workspace.

Each report version should include:

- `id`
- `projectId`
- `analysisVersionId` or analysis reference
- `createdAt`
- `updatedAt`
- `versionNumber`
- `status`
- `origin`
- `report`

Recommended `origin` values:

- `generated`
- `user-edited`
- `generated-and-edited`

### Drafts

Drafts should be stored as a versioned series per project/workspace.

Each draft version should include:

- `id`
- `projectId`
- `analysisVersionId` or analysis reference
- `reportVersionId?`
- `createdAt`
- `updatedAt`
- `versionNumber`
- `status`
- `origin`
- `draft`

Recommended `origin` values:

- `generated`
- `user-edited`
- `generated-and-edited`

## Current version pointers

The workspace should keep a lightweight pointer to:

- current report version id
- current draft version id

This lets the routes load the latest working output quickly without scanning or hydrating every version at boot.

## Version numbering rules

Recommended numbering:

- first saved version = `v1`
- each new explicit version increments by `1`
- autosave does not create a new version unless a version-boundary rule is triggered

## Recommended status values

For report and draft versions:

- `working`
- `current`
- `archived`
- `superseded`

Interpretation:

- `working`: actively being edited or autosaved
- `current`: user-approved latest visible version
- `archived`: older retained version
- `superseded`: older version explicitly replaced by a newer preferred version

## Never overwrite silently

This is the primary rule for Phase 4.

The app must not:

- replace a prior current report without keeping a version record
- replace a prior current draft without keeping a version record
- discard manual edits because a fresh generation response returned
- autosave into a stable version that the user would reasonably expect to stay unchanged

## Recommended save behaviors

### Report generation

When `/report` generates a report:

- create a new report version
- set it as the current report version
- mark the prior current version as archived or superseded
- preserve the previous version locally

### Draft generation

When `/draft` generates a draft:

- create a new draft version
- set it as the current draft version
- mark the prior current version as archived or superseded
- preserve the previous version locally

## Autosave behavior

Autosave is allowed, but it must follow clear rules.

### Autosave for generated outputs

Autosave should write into a `working` version only when:

- the user is editing the current open version
- a version record already exists
- the user has not explicitly branched into a new version yet

### Autosave must not

- create unbounded version spam on every keystroke
- rewrite an older archived/current version behind the user’s back
- collapse generated and manual edits into an untraceable blob

## Recommended autosave model

### Reports

Reports should prefer explicit save/version creation over aggressive autosave because they are more memo-like and less continuously edited.

Recommended behavior:

- generation creates a new version
- manual edits update a `working` current version with debounced autosave
- explicit “save as new version” creates the next version boundary

### Drafts

Drafts can support more active autosave because users are more likely to edit them directly.

Recommended behavior:

- generation creates a new version
- subsequent user typing autosaves into the open `working` version
- explicit regenerate creates a fresh version
- explicit duplicate/save-as-new-version creates a fresh version

## Version-boundary triggers

A new version should be created when:

- the user clicks regenerate
- the user explicitly saves as a new version
- the underlying analysis context changes materially and a new output is generated
- the route creates a new output from a different source analysis/report context

Autosave alone should not be a new-version trigger.

## Provenance fields

Each version should retain enough provenance to explain what produced it.

Recommended provenance fields:

- `analysisVersionId`
- `reportVersionId` for drafts when applicable
- `generatedFromMode`
- `generatedAt`
- `lastEditedAt`
- `editedByUser` boolean or equivalent local marker

## Compatibility rule

The current app stores only one `report` and one `draft` in the active thread. During transition:

- keep the current top-level `report` and `draft` fields as the active-version compatibility projection
- store fuller version history in additive local records
- do not break current page consumers while versioning is introduced

## Success condition

This output versioning model is successful when the app can:

- preserve report and draft history locally
- keep a fast current-version pointer
- autosave safely
- avoid silent overwrites
- remain compatible with the current route flow

