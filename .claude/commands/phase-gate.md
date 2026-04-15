# /phase-gate — Phase Gate Check

Run the full gate checklist before marking a phase complete. This prevents shipping broken phases.

## Usage
```
/phase-gate [phase-number]
```
Example: `/phase-gate 2`

## Instructions

1. Read `docs/rebuild/phase-[N]-[name].md` for the phase success criteria.
2. Read `.claude/skills/phase-gate/checklist.md` for the universal gate checklist.
3. Read `.claude/skills/phase-gate/smoke-tests.md` for applicable smoke tests.

4. Execute the gate checks:

### Universal Gates (must pass for every phase)
- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` succeeds
- [ ] No `console.error` in browser for the happy path
- [ ] No hardcoded secrets, API keys, or email addresses
- [ ] All new functions have TypeScript types (no `any` in new code)
- [ ] Navigation uses `useNavigate()`, not `window.location.href`
- [ ] No TODO or FIXME comments left in new code

### Phase-Specific Gates
Run the smoke tests from `.claude/skills/phase-gate/smoke-tests.md` that apply to this phase.

### Regression Check
- [ ] All previously-working routes still load
- [ ] The intake → summary → report flow is unbroken
- [ ] No regressions in phases that were previously complete

5. Output a gate report:

```
## Phase Gate Report — Phase [N]: [Name]
Date: [DATE]

### Universal Gates
- [x] npm lint passes
- [x] npm build succeeds
- [ ] ❌ No console errors — FAIL: "TypeError in DecisionSummaryPage line 42"
...

### Phase-Specific Smoke Tests
- [x] Analysis flow completes end-to-end
- [ ] ❌ PDF export — FAIL: blank page on export

### Regression Check
- [x] All routes load
- [x] Intake → Summary → Report flow intact

### VERDICT: ❌ NOT READY — 2 failures must be resolved
```

If any gate fails: list what needs to be fixed and do NOT mark the phase complete.
