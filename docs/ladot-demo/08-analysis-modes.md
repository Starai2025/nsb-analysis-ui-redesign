# Analysis Modes

Date: 2026-04-17  
Branch: `demo/ladot-calcasieu`

## Purpose

Split the product concept into analysis modes without breaking the current backend or route flow.

These modes are primarily conceptual and orchestration-oriented at first. They should shape:

- issue taxonomy emphasis
- responsibility logic emphasis
- output tone
- next-step recommendations

The base analysis engine can remain the same while mode metadata and prompt shaping become more specific over time.

## Design principle

Modes should refine interpretation, not fragment the app into unrelated tools.

All modes should still support the same broad route flow:

- intake
- summary
- report
- draft
- sources

## Core modes

### 1. Contract review mode

Purpose:

- determine what the governing agreement appears to say about scope, entitlement, responsibility, and notice

Primary input emphasis:

- governing agreement
- technical provisions
- proposal / ATCs

Typical outputs:

- scope framing
- clause support
- notice clauses
- baseline responsibility read

Tone:

- conservative
- clause-led
- source-grounded

### 2. Rejection triage mode

Purpose:

- assess rejected submittals, review comments, and correspondence friction to determine what kind of issue is emerging

Primary input emphasis:

- correspondence / review comments
- marked-up review PDF
- design package
- meeting minutes

Typical outputs:

- issue taxonomy candidate
- responsibility pressure points
- immediate action recommendations
- whether the issue looks like correction, change, or mixed ambiguity

Tone:

- internal triage
- practical
- operationally focused

### 3. Issue clustering mode

Purpose:

- consolidate many comments or letters into manageable issue clusters

Primary input emphasis:

- comment sets
- correspondence history
- submittal log

Typical outputs:

- grouped issue clusters
- duplicate or overlapping themes
- cluster-level severity
- linked source references

Tone:

- organizational
- evidence-grouping oriented

### 4. Notice / deadline mode

Purpose:

- identify deadline pressure, notice review needs, and escalation triggers

Primary input emphasis:

- correspondence dates
- contract notice language
- directive-like communications
- submittal/review chronology

Typical outputs:

- deadline candidates
- review urgency
- escalation prompts
- “what to do next” reminders

Tone:

- risk-aware
- time-sensitive
- conservative

### 5. Report mode

Purpose:

- generate the formal internal report package

Primary input emphasis:

- saved analysis
- issue context
- project metadata
- citations

Typical outputs:

- executive summary
- structured sections
- risk and mitigation narrative
- source snapshot

Tone:

- professional
- memo-style
- internal-review oriented

### 6. Draft mode

Purpose:

- generate the outward-facing draft and internal response strategy

Primary input emphasis:

- saved analysis
- saved report
- project metadata
- key citations

Typical outputs:

- response letter
- strategy block
- mitigation steps
- recommended path

Tone:

- professional
- measured
- rights-preserving
- non-theatrical

## LA DOTD demo-specific mode

### Recommended demo mode

`ladot-calcasieu-rejection-triage`

This should be the primary visible mode for the Calcasieu demo.

## Purpose of the demo mode

This mode focuses the app on:

- rejected design submittals
- review-comment cycles
- redesign pressure
- correspondence escalation
- early notice risk

It should feel like a tailored internal-review mode for the Arcadis-side team, not a generic contract analysis mode.

## Demo-mode adjustments

### Issue taxonomy emphasis

The demo mode should prioritize classification toward:

- design correction
- incomplete submittal
- conflict in criteria
- stricter-standard enforcement
- owner-driven change
- agency interpretation shift
- delay risk
- compensation risk
- directive candidate
- mixed issue
- unclear

### Responsibility logic emphasis

The demo mode should ask:

- does the issue look like a true design deficiency?
- does the owner appear to be requiring a stricter or shifted standard?
- does the comment cycle suggest mixed causation?
- is there evidence of direction that is approaching a directive?
- does the chronology create delay or compensation exposure?

The mode should avoid overconfident single-party blame when the record suggests ambiguity.

### Output tone

The demo mode should bias toward:

- internal reviewer language
- operational clarity
- conservative entitlement framing
- practical next steps

It should not sound like:

- legal advice
- claim certainty
- public-facing advocacy copy

### Next-step recommendations

The demo mode should emphasize recommendations such as:

- clarify the comment basis
- separate correction items from change items
- preserve chronology and direction evidence
- review notice posture
- escalate unclear directive risk internally
- prepare a measured response path

## Mode metadata recommendation

The app should eventually support additive mode metadata such as:

```ts
interface AnalysisModeContext {
  analysisMode?: 'contract-review' | 'rejection-triage' | 'issue-clustering' | 'notice-deadline' | 'report' | 'draft';
  demoMode?: 'ladot-calcasieu-rejection-triage';
  issueMode?: string;
}
```

These fields should be optional at first and should shape orchestration rather than replace the current response payloads.

## Compatibility rules

- do not break the current `AnalysisResult` contract in the first pass
- do not create route-specific isolated data silos
- do not force the backend to return a different core analysis shape for each mode
- do not expose unfinished mode switching in the visible demo UI

## Success condition

This mode model is successful when the Calcasieu demo can feel intentionally tuned to rejection-triage and internal review while the underlying app still preserves the current summary/report/draft/sources flow.
