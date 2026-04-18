# LA DOTD Demo Stabilization Audit

Date: April 18, 2026
Branch: `demo/ladot-calcasieu`

## Highest-Risk Gaps

1. `/summary` is still mixed between the active project model and the legacy current-thread shape.
   The route prefers `loadCurrentWorkspaceThreadView()`, but its main render model still comes from the thread projection rather than a first-class project analysis object.

2. The clause library is only partially integrated into the active project flow.
   The workspace snapshot can read project-linked clauses, but the current audited analysis path does not clearly persist clause records during analysis, so the route surfaces can still see an empty clause library.

3. `/sources` was previously limited to citations plus report key clauses.
   It did not provide a reliable full-project clause browser with grouping, search, and contract-specific filters.

4. `/report` did not previously include a full clause appendix.
   The page depended mainly on `report.sections.keyContractClauses`, which is useful for a short body section but insufficient for a full project clause review.

5. `/draft` previously lacked structured clause-aware context.
   Draft generation used analysis, citations, and report context only, which weakens reservation-of-rights, request-for-direction, and directive posture for the LA DOTD demo.

6. Local persistence works, but the route safety story is still uneven.
   The app can survive refresh through IndexedDB-backed snapshots, but empty states and fallback behavior still depend heavily on legacy thread compatibility and can mask whether project-linked data is actually complete.

7. The biggest visible demo risk is integration stability, not layout polish.
   The current browser smoke suite still has a failing Sources/PDF case because the analysis fixture can stop before `/summary`, which makes end-to-end verification fragile even when individual route builds pass.
