# Deadline Engine Spec

Date: 2026-04-17  
Branch: `demo/ladot-calcasieu`

## Purpose

Define the local deadline engine for the LA DOTD / Calcasieu demo.

This engine is not a legal-advice calculator. It is a local review and follow-up system that helps the team track likely action points, reminders, and escalation prompts based on project chronology and issue state.

## Design principles

- deadlines are local workspace objects
- deadlines can be created from source evidence, issue state, submittal state, or manual action
- deadlines should stay conservative and review-oriented
- deadlines should link back to supporting source records
- uncertainty should be explicit

## Deadline types

The LA DOTD demo should support these deadline types:

- `submittal-response-reminder`
- `delay-notice-review`
- `compensation-notice-review`
- `directive-follow-up`
- `internal-escalation`
- `report-due`
- `draft-due`

## Core deadline object

Recommended fields:

- `id`
- `projectId`
- `issueId?`
- `submittalId?`
- `type`
- `status`
- `title`
- `summary`
- `triggerType`
- `triggerSourceId?`
- `dueAt`
- `createdAt`
- `updatedAt`
- `confidence`
- `sourceDocumentIds`
- `sourcePageRefs`
- `notes`

## Recommended status values

- `open`
- `watch`
- `completed`
- `dismissed`
- `superseded`

## Trigger types

The engine should support the following trigger types:

- `document-date`
- `analysis-finding`
- `issue-status-change`
- `submittal-status-change`
- `manual-create`
- `manual-adjust`
- `output-follow-up`

## How deadlines are created

### 1. Source-derived creation

Create a deadline when a dated correspondence item, directive-like letter, or review event suggests time-sensitive follow-up.

Examples:

- a rejection letter that should prompt submittal response review
- a directive-like communication that should prompt follow-up

### 2. Analysis-derived creation

Create a deadline candidate when analysis identifies:

- notice pressure
- delay exposure
- compensation review need
- directive risk

These should remain conservative reminders unless stronger source support exists.

### 3. Issue-derived creation

Create or update deadlines when issue status changes.

Examples:

- issue severity increases
- issue shifts toward directive candidate
- ambiguity remains unresolved and requires escalation

### 4. Submittal-derived creation

Create or update deadlines when submittal status changes.

Examples:

- comments issued
- rejection recorded
- resubmittal required
- review window aging

### 5. Output-derived creation

Create deadlines that keep the internal workflow moving.

Examples:

- report due
- draft due
- follow-up response preparation

## Deadline-type behavior

### Submittal response reminder

Used when review comments, rejection notices, or resubmittal requirements suggest a near-term action.

### Delay notice review

Used when chronology or analysis indicates a potential schedule notice review should happen.

### Compensation notice review

Used when analysis or source evidence suggests a possible commercial/fee-related notice review.

### Directive follow-up

Used when a correspondence thread appears to approach direction that should be clarified, tracked, or escalated.

### Internal escalation

Used when the issue is ambiguous, severe, or politically sensitive enough to warrant internal review.

### Report due

Used to prompt completion or refresh of the internal report package.

### Draft due

Used to prompt creation or update of the draft response.

## How deadlines are updated

Deadlines should update when:

- the linked issue changes status
- new correspondence changes urgency
- a submittal revision is submitted or rejected
- the report or draft is completed
- a user manually closes or adjusts the record

Updates should preserve history through timestamps and status changes rather than silently overwriting the meaning of the deadline.

## Confidence model

Recommended confidence values:

- `high`
- `medium`
- `low`

Examples:

- `high` when a source document clearly states a date or due action
- `medium` when chronology strongly suggests a follow-up
- `low` when the deadline is analysis-assisted and needs human review

## Source traceability

Every deadline should link back to at least one of:

- issue record
- correspondence item
- submittal revision
- source document and page reference
- generated output needing follow-up

This keeps the engine defensible and avoids “magic dates.”

## Recommended local-first implementation

First implementation should:

- create deadline objects locally in IndexedDB
- derive them from issue and submittal records
- allow manual adjustment
- expose them as workspace artifacts without requiring backend persistence

## Guardrails

- do not present deadlines as definitive legal advice
- do not fabricate dates when source support is missing
- do not silently create hard deadlines without marking uncertainty
- do not force the current summary/report/draft/sources flow to depend on the deadline engine

## Success condition

This spec is successful when the LA DOTD demo can create, update, and track conservative local deadlines tied to issues, submittals, source records, and outputs without breaking the current route flow or overstating legal certainty.
