# Phase 3 — Document Ingestion Engine

## Goal
Build a proper document ingestion pipeline that extracts text from PDFs and DOCX files with page-level granularity, chunks the text into indexed segments, and stores the structured result so that Sources and Chat features can reference real locations in the document.

## Pre-condition: Phase 2 must be complete and gated.

## Status: ⬜ Not Started

---

## Background
Currently, PDFs are passed as raw base64 blobs to Gemini and DOCX files are converted to a flat text string. This works for the basic analysis but does not enable:
- Showing the user which clause on which page drove a finding
- Answering "where does it say that?" in the chat
- Highlighting specific text in the Sources document viewer

Phase 3 builds the infrastructure that Phases 6 and 7 depend on.

---

## Deliverables

### 3.1 — Create Ingestion Service
**File:** `src/lib/ingestion.ts`

```typescript
interface IngestResult {
  document: ExtractedDocument
  chunks: ExtractedChunk[]
}

export async function ingestFile(file: File, type: DocumentType): Promise<IngestResult>
```

- For PDF: use `pdfjs-dist` to extract text page by page. Store each page as `ExtractedPage`. Chunk pages into overlapping segments of ~500 tokens.
- For DOCX: use `mammoth` to extract raw text. Approximate page breaks. Chunk into segments.
- Assign each chunk a stable `id` (e.g., `${sourceId}-chunk-${index}`).

---

### 3.2 — Update ExtractedDocument Type
**File:** `src/types.ts`

Ensure `ExtractedDocument` and `ExtractedChunk` types fully describe the ingestion output. Add any missing fields (e.g., character offsets, confidence).

---

### 3.3 — Update IngestionStore in localStorage
**File:** `src/lib/store.ts`

Extend the persistence service to also store the ingested documents (not just the analysis result). The store should hold:
```typescript
{
  analysis: AnalysisResult | null
  projectData: ProjectData | null
  contract: ExtractedDocument | null
  correspondence: ExtractedDocument | null
}
```

---

### 3.4 — Update IntakePage to Use Ingestion Service
**File:** `src/pages/IntakePage.tsx`

Before calling Gemini, run `ingestFile()` on both uploaded documents. Store the `ExtractedDocument` objects alongside the analysis. Pass the extracted text chunks to the Gemini prompt (rather than raw base64 for very large PDFs).

---

### 3.5 — Ingestion Progress UX
**File:** `src/pages/IntakePage.tsx`

Add a "Processing documents..." status stage to the analysis timer display. Large PDFs (100+ pages) can take several seconds to parse client-side.

---

## Chunk Strategy
- Chunk size: ~500 tokens (~2000 characters)
- Overlap: 100 tokens between adjacent chunks
- Each chunk carries: `id`, `text`, `pageNumber`, `sourceId`
- Store max 200 chunks per document to manage localStorage size

---

## Success Criteria
- [ ] PDF ingestion extracts text from each page individually
- [ ] DOCX ingestion produces text with approximate page markers
- [ ] Chunks are stored in localStorage alongside the analysis
- [ ] `analysisStore.load().contract.chunks` is an array with at least 1 chunk after a real upload
- [ ] Ingestion doesn't crash on edge cases: password-protected PDF, image-only PDF, 0-page file
- [ ] Analysis still works end-to-end (Phase 4 flow unbroken)

## Gate
Run `/phase-gate 3` before marking this phase complete.
