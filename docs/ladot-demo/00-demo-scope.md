# LA DOTD Demo Scope

Date: 2026-04-17  
Branch: `demo/ladot-calcasieu`

## Demo objective

Reframe the current NSB application as a Louisiana / LA DOTD / Calcasieu demo while preserving the existing end-to-end product flow:

- intake
- analysis
- summary
- report
- draft
- sources

The demo should feel intentionally built around a live project-review problem, not like a generic contract AI tool with a region toggle.

## Demo scenario

- Project: `I-10 Calcasieu River Bridge`
- Agency: `LA DOTD`
- Delivery model: `P3 / design-build`
- User lens: `Arcadis / design team / internal reviewer`
- Core pain:
  - rejected design submittals
  - correspondence pressure
  - redesign pressure
  - notice risk

## Story the demo should tell

The user is reviewing a change-related issue on the Calcasieu program and needs to:

1. upload the governing contract material and issue-triggering correspondence
2. understand whether the issue appears inside or outside the current scope
3. identify the practical responsibility split
4. surface design/commercial/schedule/notice risk
5. produce an executive summary, formal report, supporting sources view, and draft response

The tone is internal review and risk triage, not legal advice and not public-facing claim certainty.

## In scope

### Product framing

- Louisiana / LA DOTD / Calcasieu naming and metadata
- Arcadis/internal-reviewer perspective
- design-review and correspondence-heavy issue framing
- scenario-specific project metadata and role vocabulary

### Data model planning

- expanded `ProjectData`
- demo profile defaults
- issue/correspondence-oriented metadata design
- IndexedDB evolution plan for richer local project records

### Workflow preservation

- keep the current route shell
- keep the current intake-to-summary flow
- keep report, draft, and sources compatible
- keep browser-first persistence

### Demo readiness

- documentation for scope
- architecture decisions
- schema evolution plan
- role model and project metadata plan

## Out of scope for this branch phase

- visible state-switching UI between Georgia and Louisiana
- cloud database migration
- multi-tenant or multi-user backend persistence
- legal-advice positioning or entitlement automation
- replacing the current route shell
- rewriting the app into a different frontend or backend stack

## User lens

The primary demo user is an Arcadis-side reviewer who needs a fast, defensible read on a change pressure point. This user is not asking the app for final legal advice. They are using it to:

- organize the issue
- review source evidence
- identify risk concentration
- understand notice pressure
- prepare internal and outward-facing response material

## Primary demo problem

The demo should focus on a design/change-management problem where correspondence and submittal friction matter as much as clause language. The app should help the reviewer answer:

- What changed?
- Why is it a problem now?
- Who appears to own the risk?
- What notice or documentation pressure exists?
- What should the team say next?

## Success criteria

This phase is successful when:

1. the repo has a clear written scope for the LA DOTD demo
2. the demo scenario is fixed around Calcasieu rather than generic statewide switching
3. the local-first architecture is explicitly protected
4. the future schema plan is compatible with the current route flow
5. the project/role model is detailed enough to support implementation without guessing

## Implementation guardrails implied by this scope

- keep the app local-first
- keep the current route sequence intact
- prefer additive data-model changes
- preserve full-document viewing on the Sources page
- preserve current downstream report/draft/source compatibility while changing the upstream framing
