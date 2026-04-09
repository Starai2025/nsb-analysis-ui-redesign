# /repo-audit — Full Repository Audit

Run a comprehensive audit of the Never Sign Blind codebase against the rebuild roadmap. Report the current state of every phase.

## Instructions

1. Read `docs/rebuild/roadmap.md` to understand all 9 phases and their success criteria.
2. Read `CLAUDE.md` for known issues and constraints.
3. For each phase (1–9), assess:
   - **Status**: Not Started / In Progress / Complete / Broken
   - **What exists**: What code is in place for this phase
   - **What's missing**: What's required but not yet built
   - **Blockers**: Any bugs or dependencies that block progress

4. For the current codebase, specifically check:
   - `src/pages/IntakePage.tsx` — Claude model names, API key handling, file validation
   - `src/pages/DecisionSummaryPage.tsx` — data wiring, editable fields, navigation
   - `src/pages/ReportPage.tsx` — PDF export, data loading
   - `src/pages/SourcesPage.tsx` — is data real or hardcoded?
   - `src/pages/DraftResponsePage.tsx` — is content wired to analysis?
   - `src/components/AskTheContract.tsx` — is the chat functional?
   - `server.ts` — what endpoints exist, are they needed?
   - `src/types.ts` — are all types up to date?

5. Output a formatted audit report with:
   - Phase-by-phase status table
   - Top 5 critical bugs to fix first
   - Recommended next phase to work on
   - Any security issues found

## Output Format

```
## NSB Repo Audit — [DATE]

### Phase Status
| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 1 | Codebase Audit | ... | ... |
...

### Critical Bugs
1. ...

### Security Issues
1. ...

### Recommended Next Phase: Phase X — [Name]
```
