# Analysis Eval Harness

This folder holds local evaluation cases for the backend `/api/analyze` flow.

## Goal

Measure backend accuracy against a small gold-standard design-build set before and after prompt or retrieval changes.

## Recommended workflow

1. Start the local server with a valid `ANTHROPIC_API_KEY`.
2. Create a private cases file from `design-build-analysis.template.json`.
3. Point each case at a real contract and correspondence pair.
4. Fill in only the expected fields you can score confidently.
5. Run:

```bash
npm run eval:analysis -- --cases data/evals/design-build-analysis.template.json
```

## Scoring model

The evaluator scores only the fields present in `expected`, so partial gold sets are allowed while the dataset grows.

Current weighted checks:

- `scopeStatus`
- `primaryResponsibilityIncludes`
- `secondaryResponsibilityIncludes`
- `extraMoneyLikely`
- `extraTimeLikely`
- `noticeDeadline`
- `strategicRecommendationIncludes`
- `keyRiskTitlesInclude`
- `citationsMin`

## Notes

- Keep real contract files out of git unless they are approved test fixtures.
- Prefer 25-50 cases covering notice, submittal rejection, directive risk, scope shift, and pricing support.
- Track scores over time instead of trusting one-off spot checks.
