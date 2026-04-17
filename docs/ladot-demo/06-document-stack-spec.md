# Document Stack Spec

Date: 2026-04-17  
Branch: `demo/ladot-calcasieu`

## Purpose

Replace the conceptual two-file intake model with a structured document stack that better matches the Louisiana / LA DOTD / Calcasieu demo.

This does not require the backend to consume every category immediately. It defines the local workspace model and the staged implementation path.

## Design principle

The user should think in document categories, not raw upload slots.

The system may still map a subset of those categories into the current two-file backend analyze call during transition, but the workspace itself should store documents by category.

## Core demo categories

These are required for the current demo analysis path.

### Governing agreement

Purpose:

- capture the controlling contract basis for scope, compensation, time, and notice analysis

Examples:

- prime agreement
- project agreement
- executed contract
- core design-build agreement

Current backend mapping:

- maps to `contract`

### Correspondence / review comments

Purpose:

- capture the issue-triggering communications and design-review friction

Examples:

- owner review comments
- rejection letters
- comment matrices
- email compilations
- notice-style correspondence

Current backend mapping:

- maps to `correspondence`

## Optional categories

These strengthen the workspace and should be locally staged even if early analysis uses them selectively.

### Technical provisions

Purpose:

- provide discipline-specific requirements or technical baseline context

### Proposal / ATCs

Purpose:

- capture proposal assumptions, accepted technical concepts, or ATC background

### Design package

Purpose:

- capture the design submission under review or redesign

### Marked-up review PDF

Purpose:

- capture annotated comments and visually marked review feedback

### Meeting minutes

Purpose:

- capture decision history, action items, and issue chronology

### Submittal log

Purpose:

- track review-cycle history and submission timing

### Pricing backup

Purpose:

- support cost position and claim-related explanation

### Schedule backup

Purpose:

- support delay, sequencing, and notice pressure analysis

### Directive letter

Purpose:

- capture owner instructions, direction, or formal positioning

## Category behaviors

Each document category should support:

- display label
- internal category key
- required vs optional status
- one or many files as appropriate
- local blob persistence
- metadata persistence
- analysis eligibility
- source-viewer eligibility

## Recommended category model

```ts
type DocumentCategory =
  | 'governing-agreement'
  | 'correspondence-review-comments'
  | 'technical-provisions'
  | 'proposal-atcs'
  | 'design-package'
  | 'marked-up-review-pdf'
  | 'meeting-minutes'
  | 'submittal-log'
  | 'pricing-backup'
  | 'schedule-backup'
  | 'directive-letter';
```

## Recommended category metadata

Each category definition should eventually carry:

- `key`
- `label`
- `required`
- `allowMultiple`
- `acceptedTypes`
- `analysisRole`
- `viewerPriority`

Example conceptual shape:

```ts
interface DocumentCategoryDefinition {
  key: string;
  label: string;
  required: boolean;
  allowMultiple: boolean;
  acceptedTypes: string[];
  analysisRole: 'core' | 'supporting' | 'viewer-only';
  viewerPriority: number;
}
```

## Transitional backend mapping

During the first implementation phase, the structured document stack should map into the current analyze API as follows:

- `governing-agreement` -> `contract`
- `correspondence-review-comments` -> `correspondence`

All other categories should still be:

- saved locally
- surfaced in the workspace
- available for future Sources and analysis enhancements

This lets the product model improve before the backend input model is expanded.

## Local persistence requirements

For each staged document, the local workspace should save:

- project or workspace id
- category
- file name
- MIME type
- file size
- upload timestamp
- local blob
- page count or extraction metadata when available
- analysis status

## Sources-page implications

The document stack is not only for analysis. It also defines what should be viewable and traceable in the workspace.

Implications:

- the full original governing agreement must remain viewable
- correspondence documents should be viewable or inspectable
- optional categories should be eligible for future viewer support
- source citations should retain category context

## Analyze eligibility model

The workspace should distinguish between:

- staged locally
- eligible for current analyze call
- used in latest analysis
- retained for reference only

This avoids confusing the user when optional documents exist in the workspace but are not yet fed into the current backend path.

## UX recommendations

The intake screen should clearly label document sections as:

- required documents
- recommended supporting documents

Each staged item should show:

- category
- file name
- staged status
- whether it will be used in the current analysis run

## Acceptance criteria

This spec is satisfied when the app can move from a two-slot upload mindset to a structured workspace document model that:

- supports the Calcasieu demo story
- preserves the current required analyze pair
- allows optional supporting evidence to be staged locally
- keeps document handling compatible with future Sources and analysis upgrades
