# Phase Gate Skill — Never Sign Blind

## Purpose
This skill ensures that each phase of the NSB rebuild is genuinely complete before the next phase begins. It prevents the accumulation of hidden debt across phases.

## When to Use
Trigger this skill whenever:
- A phase is being marked complete
- The `/phase-gate` command is run
- A PR touches core analysis flow files
- A deploy is being prepared

## Gate Philosophy
A phase is complete when:
1. All planned features work end-to-end (not just in isolation)
2. No regressions were introduced to earlier phases
3. The build is clean
4. Security requirements are met
5. The next phase's pre-conditions are satisfied

**A phase is NOT complete if:**
- Features work but have hardcoded data
- The UI renders but the data is not wired
- Tests pass in isolation but the integration flow is broken
- Known bugs were "left for later" without being documented

## How to Run a Gate Check

### Step 1: Confirm Phase Scope
Read `docs/rebuild/phase-[N]-[name].md`. List every deliverable. For each one, verify it is present and functional.

### Step 2: Run Universal Checklist
Work through `checklist.md` in this directory. All items must pass.

### Step 3: Run Applicable Smoke Tests
Check `smoke-tests.md`. Run every test that applies to this phase. Document results.

### Step 4: Regression Sweep
Run `/regression-check` (or manually verify the core flow: Intake → Summary → Report).

### Step 5: Issue Gate Verdict
- ✅ **PASS** — All checks green. Phase is complete.
- ⚠️ **CONDITIONAL** — Minor issues that are documented and don't block next phase.
- ❌ **FAIL** — One or more blocking issues. Do not start next phase.

## Phase Dependencies
```
Phase 1 (Audit)
  └── Phase 2 (Persistence)
        └── Phase 3 (Ingestion)
              └── Phase 4 (Analysis)
                    ├── Phase 5 (Report)
                    ├── Phase 6 (Sources)
                    └── Phase 7 (Chat)
                          ├── Phase 8 (Draft)
                          └── Phase 9 (Threading)
```

Do not start a phase until its parent passes the gate.
