# Ingestion And Extraction Plan

Date: 2026-04-17  
Branch: `demo/ladot-calcasieu`

## Purpose

Preserve the current backend ingestion and analysis contract in `server.ts` while defining additive planning for the Louisiana / LA DOTD / Calcasieu demo.

This plan is intentionally conservative:

- keep the existing extraction and analysis flow
- keep the current `/api/analyze` request/response contract during transition
- add metadata and orchestration around the current pipeline instead of replacing it

## Current backend strengths to preserve

The current backend already does meaningful work and should be treated as the foundation for the demo branch.

Current capabilities:

- ingests PDF and DOCX
- extracts pages and chunks
- supports DOCX fallback extraction from OOXML archives
- supports plain-text fallback for mislabeled `.docx` inputs
- estimates token budget
- falls back away from raw PDF upload for large documents
- selects relevant extracted pages when text volume is too large
- runs structured analysis
- extracts citations
- generates reports
- generates drafts

This is already a strong compute layer. The LA DOTD branch should not replace it with a new ingestion architecture unless a real limitation requires it.

## Current pipeline overview

### 1. Upload acceptance

`/api/analyze` currently accepts:

- `contract`
- `correspondence`

plus project metadata:

- `projectName`
- `contractNumber`
- `changeRequestId`

The current transitional rule for the demo branch should remain:

- `governing-agreement` maps to `contract`
- `correspondence-review-comments` maps to `correspondence`

## 2. Document ingestion

The current server uses `ingestDocument(...)` as the main adapter.

Behavior:

- chooses PDF or DOCX ingestion path by MIME type
- returns an `ExtractedDocument`
- stores:
  - `id`
  - `name`
  - `type`
  - `pages`
  - `chunks`
  - `metadata`

### PDF path

The PDF path already supports:

- per-page extraction
- chunk generation
- page count awareness

### DOCX path

The DOCX path already supports:

- Mammoth-based extraction
- OOXML archive fallback
- recovery from comments, footnotes, headers, and footers
- plain-text fallback for non-OOXML mislabeled files

This is important for the Calcasieu demo because real correspondence often arrives in inconsistent formats.

## 3. Text budget and analysis preparation

The current server already has layered safeguards before analysis:

- `MAX_ANTHROPIC_PDF_PAGES`
- estimated token budget checks
- extracted text character budget checks
- large-document page selection based on relevance
- extracted-text fallback when raw PDF upload is not appropriate

This should remain the base behavior for the demo branch.

## 4. Analysis pass

`runAnalysis(...)` already:

- validates server API key presence
- decides whether to use raw PDF binary or extracted text
- constrains oversized uploads
- builds the Claude content payload
- calls the structured analysis tool
- validates the returned analysis

This is the correct backbone for the demo branch.

## 5. Citation pass

`extractCitations(...)` already runs a second model pass to generate structured citations from contract chunks.

This should remain separate from the main analysis pass so the app can preserve:

- summary quality
- source traceability
- Sources-page compatibility

## 6. Report pass

`generateReport(...)` already turns analysis, project data, and citations into a structured report object.

That path should be preserved and extended only through additive context fields.

## 7. Draft pass

`generateDraft(...)` already turns analysis, citations, and optional report context into a structured draft letter plus strategy.

That path should be preserved and extended only through additive context fields.

## Additive design rule

The LA DOTD demo branch should treat the backend as a stable compute pipeline and layer demo-specific behavior on top through:

- additive metadata
- category mapping
- analysis-mode selection
- issue clustering
- deadline creation
- report/draft context shaping

Do not re-architect the core pipeline unless a specific capability gap requires it.

## Transitional compatibility contract

### Keep unchanged in the first implementation wave

- `POST /api/analyze`
- `POST /api/generate-report`
- `POST /api/generate-draft`
- PDF/DOCX ingestion logic
- page/chunk extraction structure
- browser-side use of returned `analysis`, `citations`, `contract`, and `correspondence`

### Add around it

- richer `ProjectData`
- document-category metadata
- workspace/project context
- analysis-mode metadata
- issue/submittal/deadline local records

## Planned additive changes

### 1. Project metadata expansion

Allow the request context and returned `projectData` to include richer fields such as:

- `state`
- `agency`
- `deliveryModel`
- `ownerClient`
- `userRole`
- `concessionaire`
- `builder`
- `leadDesigner`
- `demoProfile`
- `issueMode`

These should be additive and optional at first.

### 2. Document-category mapping

The backend should continue to receive two core analysis files during transition, but the workspace can locally stage more categories.

Current mapping remains:

- `governing-agreement` -> `contract`
- `correspondence-review-comments` -> `correspondence`

Optional supporting documents should stay locally staged until the backend is ready to selectively incorporate them.

### 3. Analysis mode metadata

The backend should remain a single analysis engine initially, but accept additive mode metadata so prompts and output framing can shift without breaking the existing shape.

Examples:

- `analysisMode`
- `demoProfile`
- `issueMode`

### 4. Issue and deadline artifacts

Issue clusters, submittal records, and deadlines should be created locally from backend results and source metadata before any deeper server-side expansion is attempted.

## Future backend expansion principles

When the backend eventually expands beyond the current two-file analysis pair, it should do so in layers.

### Layer 1

Keep the current two required analysis documents and preserve current output shapes.

### Layer 2

Allow optional supporting documents to be passed as structured context, but do not let them destabilize the current analysis flow.

### Layer 3

Introduce explicit issue-mode or rejection-triage prompt shaping while keeping the same high-level response contract for summary/report/draft compatibility.

## Large-document rule

The Calcasieu demo is likely to use large governing agreements and exhibit-heavy source sets.

Preserve these current principles:

- do not force large PDFs through raw PDF upload when limits are exceeded
- prefer extracted text and selective page budgeting for analysis
- preserve the full original document locally for viewing on the Sources page

The viewer and the analysis payload must remain decoupled.

## Non-goals

This plan does not recommend:

- replacing the current extraction stack
- moving durable state to the server
- replacing the route flow with a server-centered workflow
- changing output pages to depend on a brand-new backend contract

## Success condition

This plan is successful when the LA DOTD branch can evolve its issue model and workspace behavior while the existing backend pipeline continues to:

- ingest reliably
- analyze reliably
- cite reliably
- generate reports reliably
- generate drafts reliably

with only additive changes to inputs and context.
