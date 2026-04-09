# Never Sign Blind — Rebuild Roadmap

## Vision
Never Sign Blind is a construction contract intelligence tool. A project manager uploads their contract and a change order or correspondence, and the app tells them: what it means, what they can claim, how much it's worth, and what to do about it — in under 60 seconds.

## Guiding Principles
1. **The analysis is the product.** Every phase must make the core analysis flow better, faster, or more trusted.
2. **No phase starts until the previous phase passes its gate.** See `.claude/skills/phase-gate/SKILL.md`.
3. **Real data over fake data.** Hardcoded demo content is a placeholder, not a feature. Every phase should wire one more thing to real data.
4. **The user shouldn't need to understand AI to use this.** Error messages should be plain English. Actions should be obvious.

---

## Phase Map

```
[Phase 1: Audit]
     ↓
[Phase 2: Persistence]
     ↓
[Phase 3: Ingestion]
     ↓
[Phase 4: Analysis Engine]
     ↓
[Phase 5: Report]  [Phase 6: Sources]  [Phase 7: Chat]
                                            ↓
                                    [Phase 8: Draft]
                                            ↓
                                    [Phase 9: Threading]
```

---

## Phase Summary

| # | Phase | Status | Key Deliverable |
|---|-------|--------|-----------------|
| 1 | Codebase Audit & Stabilization | 🟡 In Progress | Bug-free analysis flow with correct Claude models |
| 2 | State Persistence | ⬜ Not Started | Analysis survives page refresh via localStorage |
| 3 | Document Ingestion Engine | ⬜ Not Started | Chunked ingestion with page-level citations |
| 4 | Analysis Engine Hardening | ⬜ Not Started | Reliable, typed, prompt-engineered analysis |
| 5 | Report & Export | ⬜ Not Started | Production-quality PDF report |
| 6 | Sources & Citations | ⬜ Not Started | Citations wired to real document chunks |
| 7 | Ask the Contract (Chat) | ⬜ Not Started | Functional RAG-based contract Q&A |
| 8 | Draft Response Generation | ⬜ Not Started | AI-generated response letter from analysis |
| 9 | Threading & History | ⬜ Not Started | Multiple analyses, history, project management |

---

## Phase Details

### Phase 1 — Codebase Audit & Stabilization
**Goal:** Fix all critical bugs. Establish the baseline that all future phases build on.
**See:** `docs/rebuild/phase-1-audit.md`

### Phase 2 — State Persistence
**Goal:** Analysis state survives page refresh. Move from in-memory server store to localStorage.
**See:** `docs/rebuild/phase-2-persistence.md`

### Phase 3 — Document Ingestion Engine
**Goal:** PDFs and DOCX files are chunked, indexed, and page-mapped so citations can reference real locations.
**See:** `docs/rebuild/phase-3-ingestion.md`

### Phase 4 — Analysis Engine Hardening
**Goal:** Prompt engineering, model selection, error handling, and retry logic are production-grade.
**See:** `docs/rebuild/phase-4-analysis.md`

### Phase 5 — Report & Export
**Goal:** The PDF report is professional, accurate, and branded. No blank pages.
**See:** `docs/rebuild/phase-5-report.md`

### Phase 6 — Sources & Citations
**Goal:** SourcesPage shows real clauses from the uploaded contract, with accurate page/paragraph references.
**See:** `docs/rebuild/phase-6-sources.md`

### Phase 7 — Ask the Contract (Chat)
**Goal:** AskTheContract component answers questions about the uploaded contract using RAG.
**See:** `docs/rebuild/phase-7-chat.md`

### Phase 8 — Draft Response Generation
**Goal:** DraftResponsePage generates a real AI-drafted response letter based on the analysis.
**See:** `docs/rebuild/phase-8-draft.md`

### Phase 9 — Threading & History
**Goal:** Users can run multiple analyses, view history, and compare analyses.
**See:** `docs/rebuild/phase-9-threading.md`
