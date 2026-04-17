# Correspondence And Issue Model

Date: 2026-04-17  
Branch: `demo/ladot-calcasieu`

## Purpose

Define how review comments, rejected submittals, and correspondence should turn into local issue records for the LA DOTD / Calcasieu demo.

The goal is to move from “one correspondence file” toward a structured local issue model without breaking the current analysis flow.

## Design principles

- correspondence is evidence, not just upload context
- comments should cluster into issues, not remain a flat stream
- issues must link back to source documents and pages
- issues must be able to drive deadlines, reports, drafts, and future triage views
- ambiguous records should stay ambiguous rather than being forced into a false certainty

## Core objects

### Correspondence item

A correspondence item is a locally tracked communication or extracted review entry.

Examples:

- comment letter
- email
- marked-up review note
- meeting follow-up
- rejection summary
- directive-like instruction

Recommended fields:

- `id`
- `projectId`
- `documentId`
- `submittalId?`
- `sourceType`
- `author`
- `senderOrg`
- `recipient`
- `sentAt`
- `summary`
- `pageRefs`
- `commentType`
- `issueCandidateIds`

### Issue

An issue is a clustered problem statement built from one or more correspondence items and, where available, supporting contract/design evidence.

Recommended fields:

- `id`
- `projectId`
- `title`
- `taxonomy`
- `status`
- `summary`
- `responsibilitySignal`
- `severity`
- `confidence`
- `sourceDocumentIds`
- `correspondenceItemIds`
- `linkedDeadlineIds`
- `linkedOutputIds`
- `createdAt`
- `updatedAt`

## Comment and rejection-cycle taxonomy

The app should distinguish comment or correspondence characteristics before final issue classification.

Recommended comment-level descriptors:

- correction request
- missing information request
- criteria interpretation note
- scope expansion signal
- schedule concern
- commercial concern
- direction / instruction
- mixed review comment
- unclear review comment

These descriptors help the app cluster evidence before settling on issue taxonomy.

## Issue taxonomy

The LA DOTD demo should use the following issue taxonomy:

- `design-correction`
- `incomplete-submittal`
- `conflict-in-criteria`
- `stricter-standard-enforcement`
- `owner-driven-change`
- `agency-interpretation-shift`
- `delay-risk`
- `compensation-risk`
- `directive-candidate`
- `mixed-issue`
- `unclear`

## Taxonomy definitions

### Design correction

Use when the record points primarily to a design deficiency or noncompliance with an already-applicable requirement.

### Incomplete submittal

Use when the package appears missing required content, support, or coordination elements.

### Conflict in criteria

Use when different criteria, references, or review expectations appear inconsistent.

### Stricter-standard enforcement

Use when the reviewer appears to be demanding a stricter requirement than the baseline record clearly supports.

### Owner-driven change

Use when the record suggests the owner or reviewer is requesting something beyond the established baseline.

### Agency interpretation shift

Use when the issue turns on a changed or newly asserted interpretation by the agency or reviewer.

### Delay risk

Use when timing, sequencing, or review-cycle friction creates a credible schedule concern.

### Compensation risk

Use when the issue may create added effort, redesign cost, or commercial exposure.

### Directive candidate

Use when the record begins to resemble direction that may require action before entitlement or change treatment is fully resolved.

### Mixed issue

Use when the evidence credibly supports more than one category and responsibility is not cleanly singular.

### Unclear

Use when available evidence is not strong enough to cluster the issue confidently.

## How comments cluster into issues

Comments should cluster into issues using additive evidence rules, not opaque one-shot classification.

Recommended clustering signals:

- same submittal package or revision
- same discipline or subject matter
- same comment thread or rejection letter
- overlapping cited requirement or baseline topic
- shared timing window
- shared responsibility hypothesis
- repeated phrasing across correspondence items

## Clustering workflow

1. ingest and stage correspondence evidence locally
2. create correspondence items from documents or extracted review entries
3. assign provisional comment-level descriptors
4. group related items into issue candidates
5. assign issue taxonomy
6. attach confidence and ambiguity notes
7. link the issue to deadlines, outputs, and source records

## Confidence and ambiguity

Issue records should allow uncertainty explicitly.

Recommended confidence values:

- `high`
- `medium`
- `low`

Recommended ambiguity flags:

- mixed causation
- missing source support
- chronology unclear
- responsibility contested

## Links to documents

Each issue should link back to:

- governing agreement evidence
- correspondence documents
- design-package or markup documents when available
- relevant page references or chunk references

This preserves downstream traceability for summary, report, draft, and sources.

## Links to deadlines

Issues should be able to generate or attach to deadline records such as:

- delay notice review
- compensation notice review
- directive follow-up
- internal escalation

Deadline creation may be manual, analysis-assisted, or future rule-driven.

## Links to outputs

Issues should be able to link to outputs that reflect or respond to them.

Examples:

- summary issue cards
- report sections
- draft response content
- source snapshots

Recommended output link fields:

- `summaryRef`
- `reportSectionRefs`
- `draftRef`
- `citationIds`

## Recommended local-first approach

In the first implementation phase:

- keep the current full-file analysis flow
- derive issue records locally from returned analysis plus document/category metadata
- let issue records remain a local model until deeper backend expansion is justified

This reduces risk and preserves current backend compatibility.

## Success condition

This model is successful when the Calcasieu demo can turn review comments and rejection cycles into understandable, traceable issue records that connect documents, deadlines, and outputs without breaking the current route flow.
