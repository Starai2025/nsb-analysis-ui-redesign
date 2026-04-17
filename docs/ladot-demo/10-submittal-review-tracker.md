# Submittal Review Tracker

Date: 2026-04-17  
Branch: `demo/ladot-calcasieu`

## Purpose

Define the local submittal tracker for the LA DOTD / Calcasieu demo so package history, revisions, comments, and linked issues can be preserved in the browser.

The tracker should support the rejection-triage story without requiring a server database.

## Design principles

- submittals are local project records first
- revisions matter as much as the current package
- review comments should attach to revisions and issues
- chronology should be preserved
- the tracker should feed issue clustering and deadline creation

## Core records

### Submittal package

Represents the broader package or package family under review.

Recommended fields:

- `id`
- `projectId`
- `name`
- `discipline`
- `packageType`
- `description`
- `currentRevisionId`
- `status`
- `createdAt`
- `updatedAt`

### Submittal revision

Represents a specific revision or submission event.

Recommended fields:

- `id`
- `projectId`
- `packageId`
- `revisionLabel`
- `submittedAt`
- `receivedAt?`
- `reviewCompletedAt?`
- `status`
- `summary`
- `documentIds`
- `commentIds`
- `linkedIssueIds`
- `createdAt`
- `updatedAt`

### Review comment

Represents an extracted or manually tracked review entry attached to a revision.

Recommended fields:

- `id`
- `projectId`
- `packageId`
- `revisionId`
- `documentId`
- `pageRefs`
- `author`
- `commentCode?`
- `summary`
- `commentType`
- `status`
- `linkedIssueIds`
- `createdAt`
- `updatedAt`

## Recommended status values

### Package status

- `draft`
- `submitted`
- `under-review`
- `rejected`
- `revise-and-resubmit`
- `accepted-with-comments`
- `accepted`
- `superseded`

### Revision status

- `submitted`
- `under-review`
- `comments-issued`
- `rejected`
- `resubmittal-required`
- `closed`

### Comment status

- `open`
- `clustered`
- `responded`
- `carried-forward`
- `closed`

## Relationship model

A package can have many revisions.  
A revision can have many review comments.  
A review comment can link to one or more issues.  
An issue can span multiple revisions if the same underlying problem persists.

This is important because Calcasieu-style review friction may involve:

- repeated comments across revisions
- shifts in rationale over time
- escalation from comment to directive-like pressure

## Key date fields

The tracker should preserve these date families:

- package created
- revision submitted
- revision received
- review comments issued
- resubmittal expected
- review closed

These dates will feed the deadline engine.

## Linked issues

Each revision and comment should be able to link to issue records.

Use cases:

- multiple comments collapse into one issue
- one issue persists across revisions
- a revision triggers new delay or compensation risk

Recommended fields:

- `linkedIssueIds`
- `primaryIssueId?`

## Linked documents

Each package or revision should be able to point to:

- design package documents
- marked-up review PDFs
- correspondence letters
- meeting minutes
- governing agreement references where relevant

Recommended fields:

- `documentIds`
- `primaryMarkupDocumentId?`
- `primaryCorrespondenceDocumentId?`

## Tracker views implied by this model

The tracker design should support future local views such as:

- package list
- revision timeline
- open-comment list
- issue-linked review history
- rejection-cycle history

These do not need to ship immediately, but the local record design should support them.

## Compatibility with current flow

The tracker should not replace the current summary/report/draft/sources flow.

Instead it should:

- enrich workspace context
- feed issue clustering
- feed deadline creation
- provide structured chronology for future outputs

## Local-first implementation approach

First implementation should be additive:

- create package and revision records locally
- link uploaded design/review/supporting documents to them
- attach issue IDs after analysis or manual triage
- preserve active-thread compatibility for routed pages

## Success condition

This tracker is successful when the app can locally preserve package, revision, date, status, comment, and linked-issue history for Calcasieu review cycles without breaking the existing route flow.
