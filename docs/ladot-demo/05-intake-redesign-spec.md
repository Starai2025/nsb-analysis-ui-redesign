# Intake Redesign Spec

Date: 2026-04-17  
Branch: `demo/ladot-calcasieu`

## Purpose

Redefine `/intake` from a narrow upload form into a workspace setup screen for the LA DOTD / Calcasieu demo while preserving the current working foundation:

- browser-first persistence
- existing route shell
- existing `/api/analyze` handoff
- existing `/summary`, `/report`, `/draft`, and `/sources` flow

This is a conceptual and structural redesign, not a rewrite of the analysis pipeline in one step.

## New conceptual purpose of `/intake`

`/intake` should become the place where the user creates and prepares the active workspace for a Calcasieu issue review.

Instead of behaving like a thin file-post form, it should behave like:

- project setup
- role/context setup
- scenario framing
- document staging
- analysis launch

The user should feel that they are creating a review workspace, not merely uploading two files.

## Design goals

- preserve the current working intake foundation
- keep the page compatible with the existing analyze route
- create a clear bridge from setup to analysis
- make the current local-first persistence behavior explicit
- support a richer document stack without breaking the current two-required-input backend contract

## Workspace framing

The intake screen should communicate:

- which project is being reviewed
- who the user is acting as
- what type of issue is being analyzed
- which source documents are required
- which additional documents strengthen the review
- what happens when the user clicks analyze

## Intake sections

The redesigned intake should be organized into the following sections.

### 1. Project setup

Purpose:

- identify the active Calcasieu matter
- capture the minimum project metadata needed for the workspace

Recommended fields:

- project name
- contract number
- change request / issue number
- state
- agency
- delivery model
- owner / client
- demo profile

Behavior notes:

- the Calcasieu demo may prefill Louisiana-specific defaults
- the current compatibility fields must remain:
  - `name`
  - `contractNumber`
  - `changeRequestId`

### 2. Parties and role

Purpose:

- frame the review lens and counterparty context

Recommended fields:

- user role
- lead designer
- builder
- concessionaire
- owner / client

Behavior notes:

- visible defaults should reinforce the Arcadis/internal-reviewer lens
- this is context metadata, not a permissions system

### 3. Scenario type

Purpose:

- capture the issue framing that will influence copy, downstream outputs, and future analysis prompts

Recommended fields:

- issue mode
- scenario summary or short issue label

Recommended visible options:

- rejected design submittal
- owner comment cycle
- correspondence-driven change
- redesign pressure
- notice risk

Behavior notes:

- one default visible scenario is enough for the first demo pass
- the field should exist even if the UI keeps the options constrained

### 4. Required documents

Purpose:

- stage the minimum files required to start analysis

Required categories for the current end-to-end flow:

- governing agreement
- correspondence / review comments

Behavior notes:

- these two categories remain the current minimum required set
- each category should show staging status, file name, and local-save status
- this section is the compatibility bridge to the current `/api/analyze` contract

### 5. Recommended supporting documents

Purpose:

- allow the workspace to capture supporting context locally even before the backend fully consumes it

Recommended optional categories:

- technical provisions
- proposal / ATCs
- design package
- marked-up review PDF
- meeting minutes
- submittal log
- pricing backup
- schedule backup
- directive letter

Behavior notes:

- these documents should be staged into the local workspace even if early implementation does not send all of them to `/api/analyze`
- the UI should distinguish:
  - required for analysis start
  - recommended for stronger workspace evidence

### 6. Analyze and create workspace

Purpose:

- make the final call to action explicit

Recommended primary action label:

- `Analyze and create workspace`

Supporting message:

- analysis creates or updates the active local workspace, then opens the summary flow

Behavior notes:

- the call to action should explain that documents are saved locally first
- the user should understand that failure to analyze does not mean loss of the project setup

## Intake write order

The redesigned intake must follow this exact local-first order.

### Before analysis

1. create local project record
2. save project metadata
3. save uploaded file metadata locally
4. save uploaded file blobs locally
5. mark required document categories as staged or missing
6. determine which staged files map to the current `/api/analyze` request

### Analyze call

7. call `/api/analyze`

### On success

8. save returned analysis locally
9. save returned citations locally
10. save returned ingested document structures locally
11. update the active thread / workspace projection
12. navigate to `/summary`

### On failure

13. preserve the local project record
14. preserve locally saved metadata
15. preserve locally staged file metadata and blobs
16. record the analysis error state for the workspace
17. remain on `/intake` and allow retry

## Success behavior

On success, `/intake` should have produced a complete active workspace record that includes:

- project metadata
- role/context metadata
- staged document metadata
- staged local blobs
- analysis payload
- citations
- ingested source structures
- active-thread projection for the current route flow

The next route remains `/summary`.

## Failure behavior

If analysis fails:

- do not discard the project setup
- do not discard staged documents
- do not clear the workspace
- surface the failure explicitly
- allow the user to correct the issue and retry

This is a major change from a form-like mindset. The user should feel that they created a workspace even if the first analysis attempt fails.

## Compatibility rules

- keep `/intake` as the route entry point
- keep `/summary` as the success destination
- keep the current route shell intact
- keep browser persistence primary
- keep the current `/api/analyze` bridge working during transition
- do not require cloud persistence to support workspace setup

## Transitional implementation note

The current backend analyze contract still expects two uploaded files. Therefore the intake redesign should be implemented in layers:

### Layer 1

- redesign the UI and local persistence model around workspace setup
- continue mapping:
  - governing agreement -> `contract`
  - correspondence / review comments -> `correspondence`

### Layer 2

- stage optional supporting documents locally
- surface them in the workspace and Sources page
- expand backend analysis inputs only when the compute path is ready

This keeps the existing flow stable while moving the product toward the richer document model.

## Acceptance criteria

This spec is satisfied when `/intake` can be implemented as a workspace setup screen that:

- feels Calcasieu-specific
- preserves the current working analysis path
- saves the workspace locally before analysis
- keeps the project alive if analysis fails
- still transitions cleanly into `/summary` on success
