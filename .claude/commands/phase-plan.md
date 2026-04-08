# /phase-plan — Plan a Phase

Generate a detailed implementation plan for a specific phase of the NSB rebuild.

## Usage
```
/phase-plan [phase-number]
```
Example: `/phase-plan 3`

## Instructions

1. Read the phase doc at `docs/rebuild/phase-[N]-[name].md`.
2. Read `CLAUDE.md` for constraints and known issues.
3. Read `src/types.ts` for the current type surface.
4. Read any source files relevant to the phase.

5. Produce a plan with:

### A. Pre-conditions
List what must be true before this phase can start (e.g., Phase 2 must be complete for Phase 3).

### B. Files to Create
List every new file that will be created, with a one-line description.

### C. Files to Modify
List every existing file that will be changed, with a description of the change.

### D. Work Items
Numbered list of atomic tasks in dependency order. Each task should be completable in a single focused session.

### E. Test Criteria
What must pass for the phase to be considered complete? Reference `.claude/skills/phase-gate/checklist.md`.

### F. Risk Assessment
What could go wrong? What are the edge cases to watch?

### G. Estimated Complexity
Simple / Moderate / Complex — with brief justification.

## Output Format

```
## Phase [N] Plan — [Phase Name]

### Pre-conditions
- [ ] Phase X complete
- [ ] ...

### Files to Create
- `path/to/file.ts` — description

### Files to Modify
- `path/to/file.tsx` — what changes

### Work Items
1. ...
2. ...

### Test Criteria
- [ ] ...

### Risk Assessment
- ...

### Complexity: [Simple/Moderate/Complex]
```
