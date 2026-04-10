import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import multer from "multer";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";
import {
  IngestionStore, ExtractedDocument, ExtractedChunk,
  ExtractedPage, DocumentType, Citation,
} from "./src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const STORE_PATH = path.join(__dirname, "data-store.json");
const upload     = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = "";

// ---------------------------------------------------------------------------
// Persistent store (server-side backup — primary store is client IndexedDB)
// ---------------------------------------------------------------------------

async function loadStore(): Promise<IngestionStore> {
  try {
    return JSON.parse(await fs.readFile(STORE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

async function saveStore(store: IngestionStore) {
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

let store: IngestionStore = {};
loadStore().then((s) => (store = s));

// ---------------------------------------------------------------------------
// Chunking helpers
// ---------------------------------------------------------------------------

const CHUNK_SIZE    = 2000;
const CHUNK_OVERLAP = 400;
const MAX_CHUNKS    = 200;

function chunkText(text: string, sourceId: string, pageNumber?: number): ExtractedChunk[] {
  const chunks: ExtractedChunk[] = [];
  let index = 0, pos = 0;
  while (pos < text.length && chunks.length < MAX_CHUNKS) {
    const end   = Math.min(pos + CHUNK_SIZE, text.length);
    const slice = text.slice(pos, end).trim();
    if (slice.length > 50) {
      chunks.push({ id: `${sourceId}-chunk-${index}`, text: slice, pageNumber, sourceId, charStart: pos, charEnd: end });
      index++;
    }
    if (end === text.length) break;
    pos += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// Document ingestion
// ---------------------------------------------------------------------------

async function ingestPDF(buffer: Buffer, docId: string): Promise<{ pages: ExtractedPage[]; chunks: ExtractedChunk[] }> {
  const pages: ExtractedPage[] = [], chunks: ExtractedChunk[] = [];
  try {
    const pdf = await (pdfjsLib as any).getDocument({ data: new Uint8Array(buffer), disableFontFace: true, verbosity: 0 }).promise;
    for (let p = 1; p <= pdf.numPages; p++) {
      try {
        const content = await (await pdf.getPage(p)).getTextContent();
        const text = content.items.map((i: any) => ("str" in i ? i.str : "")).join(" ").replace(/\s+/g, " ").trim();
        if (text.length > 0) {
          pages.push({ pageNumber: p, text });
          for (const c of chunkText(text, docId, p)) { if (chunks.length < MAX_CHUNKS) chunks.push(c); }
        }
      } catch (e) { console.warn(`Page ${p} extraction failed:`, e); }
    }
  } catch (e) { console.warn("PDF extraction failed (possibly encrypted/image-only):", e); }
  return { pages, chunks };
}

async function ingestDOCX(buffer: Buffer, docId: string): Promise<{ pages: ExtractedPage[]; chunks: ExtractedChunk[] }> {
  const pages: ExtractedPage[] = [], chunks: ExtractedChunk[] = [];
  try {
    const fullText = (await mammoth.extractRawText({ buffer })).value;
    const PAGE_SIZE = 3000;
    let pageNumber = 1, pos = 0;
    while (pos < fullText.length) {
      const text = fullText.slice(pos, Math.min(pos + PAGE_SIZE, fullText.length)).trim();
      if (text.length > 0) {
        pages.push({ pageNumber, text });
        for (const c of chunkText(text, docId, pageNumber)) { if (chunks.length < MAX_CHUNKS) chunks.push(c); }
        pageNumber++;
      }
      pos += PAGE_SIZE;
    }
  } catch (e) { console.warn("DOCX extraction failed:", e); }
  return { pages, chunks };
}

async function ingestDocument(buffer: Buffer, mimetype: string, originalname: string, type: DocumentType, fileSize: number): Promise<ExtractedDocument> {
  const id = `doc-${Date.now()}-${type}`;
  const { pages, chunks } = mimetype === "application/pdf"
    ? await ingestPDF(buffer, id)
    : await ingestDOCX(buffer, id);
  console.log(`  Ingested "${originalname}": ${pages.length} pages, ${chunks.length} chunks`);
  return { id, name: originalname, type, pages, chunks, metadata: { fileSize, mimeType: mimetype, uploadedAt: new Date().toISOString() } };
}

// ---------------------------------------------------------------------------
// Token budget check
// ---------------------------------------------------------------------------

const MAX_ESTIMATED_TOKENS = 150_000;

function estimateTokens(buffer: Buffer, mimetype: string, doc: ExtractedDocument): number {
  if (mimetype === "application/pdf") return Math.ceil(buffer.length * 0.75 / 4);
  const text = doc.pages?.map(p => p.text).join(" ") ?? "";
  return Math.ceil(text.length / 4);
}

function truncateDocForOversize(doc: ExtractedDocument, maxPages: number): ExtractedDocument {
  if (!doc.pages || doc.pages.length <= maxPages) return doc;
  console.warn(`  Truncating "${doc.name}" from ${doc.pages.length} to ${maxPages} pages for token budget`);
  const pages = doc.pages.slice(0, maxPages);
  const pageNums = new Set(pages.map(p => p.pageNumber));
  return { ...doc, pages, chunks: doc.chunks?.filter(c => c.pageNumber != null && pageNums.has(c.pageNumber)) };
}

// ---------------------------------------------------------------------------
// Build Claude message content
// ---------------------------------------------------------------------------

function buildDocumentContent(buffer: Buffer, mimetype: string, doc: ExtractedDocument): Anthropic.MessageParam["content"] {
  if (mimetype === "application/pdf") {
    return [{
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") },
      title: doc.name,
      cache_control: { type: "ephemeral" },
    } as any];
  }
  const text = doc.pages?.map(p => `[Page ${p.pageNumber}]\n${p.text}`).join("\n\n") ?? `Document: ${doc.name}`;
  return [{ type: "text", text: `Document: ${doc.name}\n\n${text}` }];
}

// ---------------------------------------------------------------------------
// Analysis — tool definition + improved prompt
// ---------------------------------------------------------------------------

const ANALYSIS_TOOL: Anthropic.Tool = {
  name:        "submit_analysis",
  description: "Submit the structured contract change analysis result.",
  input_schema: {
    type: "object",
    properties: {
      executiveConclusion:     { type: "string", description: "2-3 sentence summary of overall impact. Max 300 chars." },
      scopeStatus:             { type: "string", enum: ["In Scope", "Out of Scope"] },
      primaryResponsibility:   { type: "string", description: "Who bears primary responsibility for this change. Max 100 chars." },
      secondaryResponsibility: { type: "string", description: "Secondary responsible party, if any. Max 100 chars." },
      extraMoneyLikely:        { type: "boolean", description: "Is a monetary claim likely?" },
      extraTimeLikely:         { type: "boolean", description: "Is a time extension claim likely?" },
      claimableAmount:         { type: "string", description: "Estimated claimable amount, e.g. '$50,000'. Use 'Not specified' if unclear." },
      extraDays:               { type: "string", description: "Estimated additional days, e.g. '14 days'. Use 'Not specified' if unclear." },
      noticeDeadline:          { type: "string", description: "ISO 8601 date the notice must be filed by (YYYY-MM-DD), or 'Not specified'." },
      strategicRecommendation: { type: "string", description: "Recommended course of action for the contractor. Max 500 chars." },
      keyRisks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title:       { type: "string", description: "Risk title. Max 50 chars." },
            description: { type: "string", description: "Risk description with page reference if available. Max 200 chars." },
          },
          required: ["title", "description"],
        },
        minItems: 1,
        maxItems: 6,
      },
    },
    required: [
      "executiveConclusion", "scopeStatus", "primaryResponsibility",
      "secondaryResponsibility", "extraMoneyLikely", "extraTimeLikely",
      "claimableAmount", "extraDays", "noticeDeadline",
      "strategicRecommendation", "keyRisks",
    ],
  },
};

const SYSTEM_PROMPT = `You are a senior construction contract manager with deep expertise in AIA A201, DBIA 540, ConsensusDocs, and standard heavy civil contract forms.

Your task: analyze the provided contract and correspondence to determine the legal and financial impact of a proposed change.

Analysis guidelines:
1. Identify the relevant contract clauses governing scope, changes, notice, and payment — cite page numbers when available (e.g., "per Section 7.2, Page 14").
2. Determine whether the proposed work is within or outside the original contract scope.
3. Identify the responsible party for the cost and time impact under the contract terms.
4. Detect any notice requirements: find the specific clause that requires written notice of claims, and extract the deadline date if stated or calculable.
5. Flag adversarial or non-standard clauses that shift unusual risk to the contractor.
6. If a value cannot be determined from the documents, use "Not specified" — never hallucinate figures or dates.
7. scopeStatus must be exactly "In Scope" or "Out of Scope".
8. noticeDeadline must be YYYY-MM-DD format or "Not specified".
9. Always call the submit_analysis tool — do not respond with plain text.`;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateAnalysis(analysis: any): void {
  if (!analysis.executiveConclusion?.trim())
    throw new Error("Analysis missing executiveConclusion.");
  if (!["In Scope", "Out of Scope"].includes(analysis.scopeStatus))
    throw new Error(`Invalid scopeStatus: "${analysis.scopeStatus}". Must be "In Scope" or "Out of Scope".`);
  if (!analysis.primaryResponsibility?.trim())
    throw new Error("Analysis missing primaryResponsibility.");
  if (!Array.isArray(analysis.keyRisks) || analysis.keyRisks.length === 0)
    throw new Error("Analysis must include at least one key risk.");
  for (const risk of analysis.keyRisks) {
    if (!risk.title?.trim() || !risk.description?.trim())
      throw new Error("Each key risk must have a non-empty title and description.");
  }
  if (!analysis.claimableAmount?.trim())
    throw new Error("Analysis missing claimableAmount.");
  if (!analysis.extraDays?.trim())
    throw new Error("Analysis missing extraDays.");
  // noticeDeadline: if not "Not specified", must parse as a valid date
  if (analysis.noticeDeadline && analysis.noticeDeadline !== "Not specified") {
    const d = new Date(analysis.noticeDeadline);
    if (isNaN(d.getTime())) {
      console.warn(`noticeDeadline "${analysis.noticeDeadline}" is not a valid ISO date — resetting to "Not specified"`);
      analysis.noticeDeadline = "Not specified";
    }
  }
}

// ---------------------------------------------------------------------------
// Retry wrapper
// ---------------------------------------------------------------------------

const RETRY_DELAYS = [2000, 6000];

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRetryable = err?.status === 529 || err?.status === 503 || err?.code === "ECONNRESET";
      if (!isRetryable || attempt === RETRY_DELAYS.length) throw err;
      const delay = RETRY_DELAYS[attempt];
      console.warn(`${label} attempt ${attempt + 1} failed (${err?.status ?? err?.code}), retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error(`${label} failed after all retries.`);
}

// ---------------------------------------------------------------------------
// Run analysis
// ---------------------------------------------------------------------------

async function runAnalysis(
  contractBuffer: Buffer, contractMime: string, contractDoc: ExtractedDocument,
  corrBuffer:     Buffer, corrMime:     string, corrDoc:      ExtractedDocument,
): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set on the server.");
  const client = new Anthropic({ apiKey });

  // Token budget check — truncate DOCX pages if needed, keep PDF as-is
  const contractTokens = estimateTokens(contractBuffer, contractMime, contractDoc);
  const corrTokens     = estimateTokens(corrBuffer,     corrMime,     corrDoc);
  const totalTokens    = contractTokens + corrTokens;

  let effectiveContractDoc = contractDoc;
  let effectiveCorrDoc     = corrDoc;

  if (totalTokens > MAX_ESTIMATED_TOKENS) {
    console.warn(`  Estimated ${totalTokens} tokens — applying token budget (max ${MAX_ESTIMATED_TOKENS})`);
    const budget   = MAX_ESTIMATED_TOKENS;
    const cRatio   = contractTokens / totalTokens;
    const maxContr = Math.floor((budget * cRatio) / (CHUNK_SIZE / 4));
    const maxCorr  = Math.floor((budget * (1 - cRatio)) / (CHUNK_SIZE / 4));
    if (contractMime !== "application/pdf") effectiveContractDoc = truncateDocForOversize(contractDoc, Math.max(maxContr, 10));
    if (corrMime     !== "application/pdf") effectiveCorrDoc     = truncateDocForOversize(corrDoc,     Math.max(maxCorr,  5));
  }

  const contractContent = buildDocumentContent(contractBuffer, contractMime, effectiveContractDoc);
  const corrContent     = buildDocumentContent(corrBuffer,     corrMime,     effectiveCorrDoc);

  const userContent: Anthropic.MessageParam["content"] = [
    ...(contractContent as any[]),
    ...(corrContent as any[]),
    { type: "text", text: "Analyze these documents and call submit_analysis with your findings." },
  ];

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await withRetry(
      () => client.messages.create({
        model:      "claude-sonnet-4-5",
        max_tokens: 2048,
        system:     SYSTEM_PROMPT,
        tools:      [ANALYSIS_TOOL],
        tool_choice: { type: "tool", name: "submit_analysis" },
        messages:   [{ role: "user", content: userContent }],
      }),
      "analysis"
    );

    const toolUse = response.content.find((b) => b.type === "tool_use") as Anthropic.ToolUseBlock | undefined;
    if (!toolUse) throw new Error("Claude did not call the submit_analysis tool.");

    const analysis = toolUse.input as any;
    validateAnalysis(analysis);
    return analysis;
  } catch (err: any) {
    if (err.name === "AbortError") throw new Error("Analysis timed out after 120 seconds. Please try again.");
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Citation extraction (second Claude pass)
// ---------------------------------------------------------------------------

const CITATION_TOOL: Anthropic.Tool = {
  name:        "submit_citations",
  description: "Submit extracted citations from the contract that support the analysis findings.",
  input_schema: {
    type: "object",
    properties: {
      citations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id:          { type: "string" },
            title:       { type: "string", description: "Short label for this clause/finding. Max 60 chars." },
            source:      { type: "string", description: "Location, e.g. 'Section 7.2, Page 14'" },
            text:        { type: "string", description: "The exact or near-exact clause text. Max 300 chars." },
            explanation: { type: "string", description: "Why this clause is relevant to the analysis. Max 200 chars." },
            confidence:  { type: "string", enum: ["High", "Medium", "Low"] },
          },
          required: ["id", "title", "source", "text", "explanation", "confidence"],
        },
        minItems: 0,
        maxItems: 8,
      },
    },
    required: ["citations"],
  },
};

async function extractCitations(
  analysis:    any,
  contractDoc: ExtractedDocument,
): Promise<Citation[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  try {
    const client = new Anthropic({ apiKey });

    // Use top 20 chunks from the contract (by page order)
    const chunks = (contractDoc.chunks ?? []).slice(0, 20);
    const chunksText = chunks
      .map(c => `[Page ${c.pageNumber ?? "?"}]\n${c.text}`)
      .join("\n\n---\n\n");

    const analysisJson = JSON.stringify({
      scopeStatus:       analysis.scopeStatus,
      primaryResp:       analysis.primaryResponsibility,
      keyRisks:          analysis.keyRisks,
      noticeDeadline:    analysis.noticeDeadline,
      recommendation:    analysis.strategicRecommendation,
    }, null, 2);

    const response = await withRetry(
      () => client.messages.create({
        model:      "claude-sonnet-4-5",
        max_tokens: 1024,
        system:     "You are a construction contract analyst. Identify specific contract clauses that support the provided analysis findings. Call submit_citations with your results.",
        tools:      [CITATION_TOOL],
        tool_choice: { type: "tool", name: "submit_citations" },
        messages: [{
          role:    "user",
          content: `Analysis findings:\n${analysisJson}\n\nContract chunks:\n${chunksText}\n\nIdentify the specific clauses that support these findings and call submit_citations.`,
        }],
      }),
      "citation extraction"
    );

    const toolUse = response.content.find(b => b.type === "tool_use") as Anthropic.ToolUseBlock | undefined;
    if (!toolUse) return [];

    const raw = (toolUse.input as any).citations ?? [];
    return raw.map((c: any, i: number) => ({
      id:          c.id ?? `cite-${i}`,
      title:       c.title ?? "",
      source:      c.source ?? "",
      text:        c.text ?? "",
      explanation: c.explanation ?? "",
      confidence:  c.confidence ?? "Medium",
    })) as Citation[];
  } catch (err) {
    console.warn("Citation extraction failed (non-blocking):", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Report generation — 12-section template per docs/rebuild/final-report-template.md
// ---------------------------------------------------------------------------

const REPORT_TOOL: Anthropic.Tool = {
  name:        "submit_report",
  description: "Submit the completed 12-section Change Order Analysis Report. Write every section in professional, concise, memo-style prose. Never fabricate facts. Use approved fallback language when support is weak.",
  input_schema: {
    type: "object",
    properties: {
      title:    { type: "string", description: "Change Order Analysis Report — [Project Name]" },
      metadata: {
        type: "object",
        properties: {
          projectName:     { type: "string" },
          contractNumber:  { type: "string" },
          changeRequestId: { type: "string" },
          ownerClient:     { type: "string" },
          dateOfAnalysis:  { type: "string" },
          reportStatus:    { type: "string", enum: ["Draft", "Ready", "Updated", "Superseded"] },
        },
        required: ["projectName", "contractNumber", "changeRequestId", "ownerClient", "dateOfAnalysis", "reportStatus"],
      },
      sections: {
        type: "object",
        properties: {
          executiveSummary: {
            type: "object",
            properties: {
              heading: { type: "string" },
              content: { type: "string", description: "1-2 short paragraphs. State what was requested, scope status, fee/time supportability, and key commercial takeaway. No clause quotes. No filler." },
            },
            required: ["heading", "content"],
          },
          ownerRequest: {
            type: "object",
            properties: {
              heading: { type: "string" },
              content: { type: "string", description: "Short narrative paragraph. State what was requested, what changed from baseline, and whether the request expands/revises/accelerates/defers/resequences the work." },
            },
            required: ["heading", "content"],
          },
          arcadisPosition: {
            type: "object",
            properties: {
              scopeStatus:    { type: "string", enum: ["In Scope", "Out of Scope", "Partially Out of Scope", "Unclear"] },
              responsibility: { type: "string" },
              feePosition:    { type: "string", enum: ["Likely Yes", "Possible", "Unclear", "Likely No"] },
              timePosition:   { type: "string", enum: ["Likely Yes", "Possible", "Unclear", "Likely No"] },
              explanation:    { type: "string", description: "One short paragraph explaining the position. Source-grounded." },
            },
            required: ["scopeStatus", "responsibility", "feePosition", "timePosition", "explanation"],
          },
          keyContractClauses: {
            type: "array",
            description: "Most commercially important clauses. Rank by importance, not contract order. 1-4 entries.",
            items: {
              type: "object",
              properties: {
                reference:    { type: "string", description: "Document / Section / Page" },
                excerpt:      { type: "string", description: "Short exact or near-exact clause text" },
                meaning:      { type: "string", description: "Plain-English explanation" },
                whyItMatters: { type: "string", description: "Commercial relevance — fee and time effects" },
              },
              required: ["reference", "excerpt", "meaning", "whyItMatters"],
            },
            minItems: 0,
            maxItems: 4,
          },
          application: {
            type: "object",
            properties: {
              heading: { type: "string" },
              content: { type: "string", description: "1-3 short paragraphs applying contract language to the change request. Connect clauses to the request. Separate contract language from inference." },
            },
            required: ["heading", "content"],
          },
          commercialAnalysis: {
            type: "object",
            properties: {
              heading: { type: "string" },
              content: { type: "string", description: "Address Fee and Time in two named subparts. Fee: whether compensation is supportable, likely cost categories, pricing status. Time: whether time is supportable, resequencing/delay, schedule status." },
            },
            required: ["heading", "content"],
          },
          scheduleImpact: {
            type: "object",
            properties: {
              criticalPathImpact: { type: "string", enum: ["Yes", "Likely", "Possible", "No", "Not Enough Information"] },
              delayRiskLevel:     { type: "string", enum: ["Low", "Moderate", "High", "Critical"] },
              explanation:        { type: "string", description: "One explanatory paragraph. Address whether activity is critical/near-critical, float consumption, and whether more evidence is needed." },
            },
            required: ["criticalPathImpact", "delayRiskLevel", "explanation"],
          },
          noticeRequirements: {
            type: "object",
            properties: {
              noticeRequired: { type: "string", enum: ["Yes", "Likely", "Unclear", "No"] },
              deadline:       { type: "string", description: "Specific date or 'TBD based on contract notice period' or 'Not specified'" },
              recipient:      { type: "string" },
              riskIfMissed:   { type: "string" },
            },
            required: ["noticeRequired", "deadline", "recipient", "riskIfMissed"],
          },
          riskAndMitigation: {
            type: "object",
            properties: {
              heading: { type: "string" },
              content: { type: "string", description: "Short narrative identifying biggest commercial and schedule risks, followed by 3-6 practical mitigation actions. Keep it actionable, not theoretical." },
            },
            required: ["heading", "content"],
          },
          recommendation: {
            type: "object",
            properties: {
              heading: { type: "string" },
              content: { type: "string", description: "One short paragraph. If owner accepts: one next-step. If owner says no to time and money: three recommendations." },
            },
            required: ["heading", "content"],
          },
          draftResponse: {
            type: "object",
            properties: {
              heading: { type: "string" },
              content: { type: "string", description: "2-4 short paragraphs. Acknowledge request, reference contract review, state position, reserve rights, request direction/change order as appropriate. Professional tone. No aggressive legal theatrics." },
            },
            required: ["heading", "content"],
          },
          sourceSnapshot: {
            type: "object",
            properties: {
              heading: { type: "string" },
              content: { type: "string", description: "2-4 short entries listing the most load-bearing sources. Each entry: document name, section/page, short excerpt or paraphrase, why it mattered. Conservative if citations are limited." },
            },
            required: ["heading", "content"],
          },
        },
        required: [
          "executiveSummary", "ownerRequest", "arcadisPosition", "keyContractClauses",
          "application", "commercialAnalysis", "scheduleImpact", "noticeRequirements",
          "riskAndMitigation", "recommendation", "draftResponse", "sourceSnapshot",
        ],
      },
    },
    required: ["title", "metadata", "sections"],
  },
};

const REPORT_SYSTEM_PROMPT = `You are a senior construction commercial/change manager writing a formal Change Order Analysis Report.

Template rules (from docs/rebuild/final-report-template.md):
- Write like a senior commercial manager, not a legal brief and not a dashboard
- Stay concise. Keep paragraphs short. Avoid repetition
- Every section must appear. If support is weak, use approved fallback language
- Approved fallback language: "The current record does not provide enough support to confirm this conclusion." / "Further contract review is required." / "Pricing support is still TBD." / "Schedule support is still TBD." / "No specific deadline was identified in the current record."
- Separate contract language from inference
- No fluff, no generic filler, no fake certainty
- Do not fabricate figures, dates, or clause references
- keyContractClauses: rank by commercial importance, not contract order; keep excerpts short
- commercialAnalysis: use Fee / Time subparts explicitly
- draftResponse: professional, usable by a commercial manager, no aggressive legal theatrics
- Call submit_report with all 12 sections completed`;

async function generateReport(analysis: any, projectData: any, citations: any[]): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set on the server.");
  const client = new Anthropic({ apiKey });

  const projectLabel = projectData?.name || "Unnamed Project";
  const today        = new Date().toISOString().split("T")[0];

  // Build citation context for Source Snapshot
  const citationContext = citations?.length
    ? `\n\nExtracted citations (use for Key Contract Clauses and Source Snapshot):\n${JSON.stringify(citations.slice(0, 6), null, 2)}`
    : "\n\nNo structured citations were extracted. The Source Snapshot should be conservative and clearly limited.";

  const userPrompt = `Write a Change Order Analysis Report for the following project.

Project: ${projectLabel}
Contract Number: ${projectData?.contractNumber || "Not specified"}
Change Request: ${projectData?.changeRequestId || "Not specified"}
Date: ${today}

Analysis data:
${JSON.stringify({
    executiveConclusion:     analysis.executiveConclusion,
    scopeStatus:             analysis.scopeStatus,
    primaryResponsibility:   analysis.primaryResponsibility,
    secondaryResponsibility: analysis.secondaryResponsibility,
    extraMoneyLikely:        analysis.extraMoneyLikely,
    extraTimeLikely:         analysis.extraTimeLikely,
    claimableAmount:         analysis.claimableAmount,
    extraDays:               analysis.extraDays,
    noticeDeadline:          analysis.noticeDeadline,
    strategicRecommendation: analysis.strategicRecommendation,
    keyRisks:                analysis.keyRisks,
  }, null, 2)}${citationContext}

Call submit_report with all 12 sections completed.`;

  const response = await withRetry(
    () => client.messages.create({
      model:       "claude-sonnet-4-5",
      max_tokens:  4096,
      system:      REPORT_SYSTEM_PROMPT,
      tools:       [REPORT_TOOL],
      tool_choice: { type: "tool", name: "submit_report" },
      messages:    [{ role: "user", content: userPrompt }],
    }),
    "report generation"
  );

  const toolUse = response.content.find((b) => b.type === "tool_use") as Anthropic.ToolUseBlock | undefined;
  if (!toolUse) throw new Error("Claude did not call the submit_report tool.");
  return toolUse.input;
}

// ---------------------------------------------------------------------------
// Express server
// ---------------------------------------------------------------------------

async function startServer() {
  const app  = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ── Core: ingest + analyze + cite ─────────────────────────────────────────
  app.post(
    "/api/analyze",
    upload.fields([
      { name: "contract",       maxCount: 1 },
      { name: "correspondence", maxCount: 1 },
    ]),
    async (req, res) => {
      try {
        const files        = req.files as Record<string, Express.Multer.File[]>;
        const contractFile = files?.contract?.[0];
        const corrFile     = files?.correspondence?.[0];

        if (!contractFile || !corrFile) {
          res.status(400).json({ error: "Both 'contract' and 'correspondence' files are required." });
          return;
        }

        const supported = [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        if (!supported.includes(contractFile.mimetype)) {
          res.status(400).json({ error: `Unsupported contract type: ${contractFile.mimetype}` });
          return;
        }
        if (!supported.includes(corrFile.mimetype)) {
          res.status(400).json({ error: `Unsupported correspondence type: ${corrFile.mimetype}` });
          return;
        }

        console.log(`\nIngesting: "${contractFile.originalname}" + "${corrFile.originalname}"`);

        // Step 1: Ingest
        const [contractDoc, correspondenceDoc] = await Promise.all([
          ingestDocument(contractFile.buffer, contractFile.mimetype, contractFile.originalname, "contract",       contractFile.size),
          ingestDocument(corrFile.buffer,     corrFile.mimetype,     corrFile.originalname,     "correspondence", corrFile.size),
        ]);

        // Step 2: Analyze
        console.log("Running Claude analysis...");
        const analysis = await runAnalysis(
          contractFile.buffer, contractFile.mimetype, contractDoc,
          corrFile.buffer,     corrFile.mimetype,     correspondenceDoc,
        );

        // Step 3: Extract citations (non-blocking)
        console.log("Extracting citations...");
        const citations = await extractCitations(analysis, contractDoc);
        console.log(`  ${citations.length} citation(s) extracted`);

        const projectData = {
          name:            String(req.body.projectName     || ""),
          contractNumber:  String(req.body.contractNumber  || ""),
          changeRequestId: String(req.body.changeRequestId || ""),
        };

        // Step 4: Persist backup (metadata only)
        const contractDocMeta = { ...contractDoc,       pages: undefined, chunks: undefined };
        const corrDocMeta     = { ...correspondenceDoc, pages: undefined, chunks: undefined };
        store = { analysis, projectData, contract: contractDocMeta, correspondence: corrDocMeta };
        await saveStore(store);

        console.log("Analysis complete.\n");

        res.json({
          success: true,
          analysis,
          projectData,
          citations,
          contract:       contractDoc,
          correspondence: correspondenceDoc,
        });
      } catch (err: any) {
        const message = err instanceof Error ? err.message : "Analysis failed.";
        console.error("Analysis error:", message);
        // Map specific error types to helpful user messages
        if (message.includes("timed out"))
          res.status(504).json({ error: message });
        else if (message.includes("ANTHROPIC_API_KEY"))
          res.status(500).json({ error: "Server configuration error: API key not set." });
        else
          res.status(500).json({ error: message });
      }
    }
  );

  // ── Patch edits from DecisionSummaryPage ───────────────────────────────────
  app.post("/api/save-analysis", express.json({ limit: "10mb" }), async (req, res) => {
    try {
      const { analysis, projectData } = req.body;
      if (analysis)    store.analysis    = analysis;
      if (projectData) store.projectData = projectData;
      await saveStore(store);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to save analysis." });
    }
  });

  // ── Generate formal report from stored analysis ────────────────────────────
  app.post("/api/generate-report", express.json({ limit: "1mb" }), async (req, res) => {
    try {
      if (!store.analysis) {
        res.status(400).json({ error: "No analysis found. Run an analysis first." });
        return;
      }
      console.log("Generating report...");
      const raw = await generateReport(store.analysis, store.projectData ?? {}, (store as any).citations ?? []);
      const now = new Date().toISOString();
      const report = {
        id:        `report-${Date.now()}`,
        threadId:  "current",
        createdAt: now,
        updatedAt: now,
        title:     raw.title,
        sections:  raw.sections,
      };
      console.log("Report generated.");
      res.json({ success: true, report });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Report generation failed.";
      console.error("Report error:", message);
      res.status(500).json({ error: message });
    }
  });

  // ── Read backup store ──────────────────────────────────────────────────────
  app.get("/api/store", (_req, res) => {
    res.json(store);
  });

  // ── Vite / static ──────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    try {
      await fs.access(distPath);
      app.use(express.static(distPath));
      app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
    } catch {
      console.warn("Dist not found — falling back to Vite middleware.");
      const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
      app.use(vite.middlewares);
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (${process.env.NODE_ENV ?? "development"})`);
  });
}

startServer().catch((err) => {
  console.error("CRITICAL SERVER ERROR:", err);
  process.exit(1);
});
