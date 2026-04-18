import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import multer from "multer";
import mammoth from "mammoth";
import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";
import {
  buildAnalysisSystemPrompt,
  buildDraftSystemPrompt,
  buildReportSystemPrompt,
  loadKnowledge,
} from "./knowledge.ts";
import type { KnowledgeBundle } from "./knowledge.ts";
import type {
  IngestionStore, ExtractedDocument, ExtractedChunk,
  ExtractedPage, DocumentType, Citation,
} from "./src/types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const STORE_PATH = path.join(__dirname, "data-store.json");
const upload     = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
const MAX_ANTHROPIC_PDF_PAGES = 100;

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

async function ingestPDF(buffer: Buffer, docId: string): Promise<{ pages: ExtractedPage[]; chunks: ExtractedChunk[]; pageCount?: number }> {
  const pages: ExtractedPage[] = [], chunks: ExtractedChunk[] = [];
  try {
    // Node-side ingestion should avoid pdf.js worker bootstrapping, which can fail
    // in production/server environments and leave large PDFs with zero extracted pages.
    const pdf = await (pdfjsLib as any).getDocument({
      data: new Uint8Array(buffer),
      disableFontFace: true,
      verbosity: 0,
      disableWorker: true,
    }).promise;
    const pageCount = pdf.numPages;
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
    return { pages, chunks, pageCount };
  } catch (e) { console.warn("PDF extraction failed (possibly encrypted/image-only):", e); }
  return { pages, chunks };
}

async function ingestDOCX(buffer: Buffer, docId: string): Promise<{ pages: ExtractedPage[]; chunks: ExtractedChunk[] }> {
  const pages: ExtractedPage[] = [], chunks: ExtractedChunk[] = [];
  try {
    let fullText = "";
    if (looksLikeZipContainer(buffer)) {
      fullText = (await mammoth.extractRawText({ buffer })).value;
      if (fullText.replace(/\s+/g, " ").trim().length < 25) {
        const fallbackText = await extractDOCXArchiveText(buffer);
        if (fallbackText.length > fullText.length) {
          console.log(`  DOCX fallback extractor recovered ${fallbackText.length} chars of OOXML text`);
          fullText = fallbackText;
        }
      }
    } else {
      const plainText = extractPlainTextBuffer(buffer);
      if (plainText) {
        console.log(`  Non-OOXML .docx fallback recovered ${plainText.length} chars of plain text`);
        fullText = plainText;
      }
    }
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

function looksLikeZipContainer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  const signature = buffer.subarray(0, 4).toString("binary");
  return signature === "PK\u0003\u0004" || signature === "PK\u0005\u0006" || signature === "PK\u0007\u0008";
}

function extractPlainTextBuffer(buffer: Buffer): string {
  const text = buffer.toString("utf8");
  const printableChars = text.match(/[\p{L}\p{N}\p{P}\p{Zs}\r\n\t]/gu)?.length ?? 0;
  const ratio = text.length > 0 ? printableChars / text.length : 0;
  if (ratio < 0.85) {
    return "";
  }

  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#xA;/gi, "\n")
    .replace(/&#xD;/gi, "\n")
    .replace(/&#9;/g, "\t");
}

function extractTextFromOOXML(xml: string): string {
  return decodeXmlEntities(
    xml
      .replace(/<w:tab(?:\s[^>]*)?\/>/g, "\t")
      .replace(/<w:(?:br|cr)(?:\s[^>]*)?\/>/g, "\n")
      .replace(/<\/w:p>/g, "\n\n")
      .replace(/<\/w:tr>/g, "\n")
      .replace(/<\/w:tc>/g, "\t")
      .replace(/<(?:w:t|w:delText|w:instrText)[^>]*>([\s\S]*?)<\/(?:w:t|w:delText|w:instrText)>/g, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

async function extractDOCXArchiveText(buffer: Buffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const textEntryNames = Object.keys(zip.files)
      .filter((name) =>
        /^word\/(document|comments|footnotes|endnotes|header\d+|footer\d+)\.xml$/i.test(name)
      )
      .sort((a, b) => {
        if (a === "word/document.xml") return -1;
        if (b === "word/document.xml") return 1;
        return a.localeCompare(b);
      });

    const sections: string[] = [];
    for (const name of textEntryNames) {
      const xml = await zip.file(name)?.async("string");
      if (!xml) continue;

      const text = extractTextFromOOXML(xml);
      if (!text) continue;

      if (name === "word/document.xml") {
        sections.push(text);
      } else {
        const label = name
          .replace(/^word\//i, "")
          .replace(/\.xml$/i, "")
          .replace(/(\D)(\d+)/g, "$1 $2")
          .replace(/([a-z])([A-Z])/g, "$1 $2");
        sections.push(`[${label}]\n${text}`);
      }
    }

    return sections.join("\n\n").trim();
  } catch (e) {
    console.warn("DOCX archive fallback failed:", e);
    return "";
  }
}

async function ingestDocument(buffer: Buffer, mimetype: string, originalname: string, type: DocumentType, fileSize: number): Promise<ExtractedDocument> {
  const id = `doc-${Date.now()}-${type}`;
  const { pages, chunks, pageCount } = mimetype === "application/pdf"
    ? await ingestPDF(buffer, id)
    : { ...(await ingestDOCX(buffer, id)), pageCount: undefined };
  console.log(`  Ingested "${originalname}": ${pages.length} pages, ${chunks.length} chunks`);
  return {
    id,
    name: originalname,
    type,
    pages,
    chunks,
    metadata: {
      fileSize,
      mimeType: mimetype,
      uploadedAt: new Date().toISOString(),
      pageCount,
    },
  };
}

// ---------------------------------------------------------------------------
// Token budget check
// ---------------------------------------------------------------------------

const MAX_ESTIMATED_TOKENS = 150_000;
const MAX_ANALYSIS_TEXT_CHARS = 520_000;
const DEFAULT_PAGE_OVERHEAD_CHARS = 18;
const CORE_CONTRACT_TERMS = [
  "change order",
  "changes",
  "change",
  "acceleration",
  "accelerate",
  "schedule",
  "delay",
  "time extension",
  "time for completion",
  "notice",
  "claim",
  "compensation",
  "payment",
  "fee",
  "cost",
  "scope",
  "services",
  "additional services",
  "extra work",
  "amendment",
  "suspension",
  "termination",
  "directed",
];
const QUERY_STOPWORDS = new Set([
  "about", "after", "against", "agreement", "analysis", "because", "before", "between", "change",
  "changes", "contract", "contractor", "correspondence", "could", "date", "days", "demo", "does",
  "early", "from", "have", "here", "including", "interchange", "into", "likely", "milestone",
  "must", "need", "notice", "owner", "page", "pages", "payment", "project", "request", "rights",
  "schedule", "services", "shall", "state", "their", "there", "these", "this", "through", "time",
  "tollway", "under", "west", "with", "without", "work", "would",
]);

function getDocumentText(doc: ExtractedDocument): string {
  if (doc.pages?.length) {
    return doc.pages.map((p) => `[Page ${p.pageNumber}]\n${p.text}`).join("\n\n");
  }
  if (doc.chunks?.length) {
    return doc.chunks.map((c) => {
      const label = c.pageNumber != null ? `Page ${c.pageNumber}` : "Extracted text";
      return `[${label}]\n${c.text}`;
    }).join("\n\n");
  }
  return "";
}

function shouldUsePdfBinary(mimetype: string, doc: ExtractedDocument): boolean {
  if (mimetype !== "application/pdf") return false;
  const pageCount = doc.metadata.pageCount ?? doc.pages?.length ?? 0;
  return pageCount > 0 && pageCount <= MAX_ANTHROPIC_PDF_PAGES;
}

function estimateTokens(buffer: Buffer, mimetype: string, doc: ExtractedDocument, usePdfBinary: boolean): number {
  if (usePdfBinary) return Math.ceil(buffer.length * 0.75 / 4);
  const text = getDocumentText(doc);
  return Math.ceil(text.length / 4);
}

function getDocumentCharCount(doc: ExtractedDocument): number {
  return getDocumentText(doc).length;
}

function extractQueryTerms(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? [];
  const counts = new Map<string, number>();

  for (const word of matches) {
    if (QUERY_STOPWORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 24)
    .map(([word]) => word);
}

function scoreDocumentPage(text: string, pageNumber: number, queryTerms: string[]): number {
  const lower = text.toLowerCase();
  let score = pageNumber <= 5 ? 80 - (pageNumber * 5) : 0;

  if (/\btable of contents\b|\bcontents\b/.test(lower)) score += 40;
  if (/\barticle\b|\bsection\b|\bexhibit\b|\bappendix\b/.test(lower)) score += 10;

  for (const term of [...CORE_CONTRACT_TERMS, ...queryTerms]) {
    if (!term || !lower.includes(term)) continue;
    score += CORE_CONTRACT_TERMS.includes(term) ? 12 : 8;
  }

  return score;
}

function selectDocumentPagesForBudget(doc: ExtractedDocument, maxChars: number, queryTerms: string[]): ExtractedDocument {
  if (!doc.pages?.length) return doc;

  const byPageNumber = new Map(doc.pages.map((page) => [page.pageNumber, page]));
  const selectedPages = new Set<number>();
  let selectedChars = 0;

  const tryAddPage = (pageNumber: number) => {
    const page = byPageNumber.get(pageNumber);
    if (!page || selectedPages.has(pageNumber)) return false;

    const pageChars = page.text.length + DEFAULT_PAGE_OVERHEAD_CHARS;
    if (selectedChars + pageChars > maxChars && selectedPages.size > 0) {
      return false;
    }

    selectedPages.add(pageNumber);
    selectedChars += pageChars;
    return true;
  };

  for (const page of doc.pages.slice(0, 5)) {
    tryAddPage(page.pageNumber);
  }

  const rankedPages = doc.pages
    .map((page) => ({
      pageNumber: page.pageNumber,
      score: scoreDocumentPage(page.text, page.pageNumber, queryTerms),
    }))
    .sort((a, b) => b.score - a.score || a.pageNumber - b.pageNumber);

  for (const candidate of rankedPages) {
    if (selectedChars >= maxChars) break;
    for (const pageNumber of [candidate.pageNumber - 1, candidate.pageNumber, candidate.pageNumber + 1]) {
      if (selectedChars >= maxChars) break;
      tryAddPage(pageNumber);
    }
  }

  const pages = doc.pages.filter((page) => selectedPages.has(page.pageNumber));
  const pageNums = new Set(pages.map((page) => page.pageNumber));
  console.warn(`  Reduced "${doc.name}" to ${pages.length} relevant pages (${selectedChars} chars) for analysis budget`);

  return {
    ...doc,
    pages,
    chunks: doc.chunks?.filter((chunk) => chunk.pageNumber != null && pageNums.has(chunk.pageNumber)),
  };
}

// ---------------------------------------------------------------------------
// Build Claude message content
// ---------------------------------------------------------------------------

function buildDocumentContent(
  buffer: Buffer,
  mimetype: string,
  doc: ExtractedDocument,
  options: { usePdfBinary: boolean },
): Anthropic.MessageParam["content"] {
  if (options.usePdfBinary) {
    return [{
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") },
      title: doc.name,
      cache_control: { type: "ephemeral" },
    } as any];
  }
  const text = getDocumentText(doc);
  if (!text.trim()) {
    const pageCount = doc.metadata.pageCount ?? doc.pages?.length ?? 0;
    if (mimetype === "application/pdf" && pageCount > MAX_ANTHROPIC_PDF_PAGES) {
      throw new Error(
        `"${doc.name}" has ${pageCount} pages. PDFs over ${MAX_ANTHROPIC_PDF_PAGES} pages must contain selectable text so they can be analyzed as extracted text. Please upload a text-based PDF, DOCX, or a smaller page range.`,
      );
    }
    throw new Error(`"${doc.name}" does not contain enough extractable text to analyze. Please upload a text-based PDF or DOCX file.`);
  }
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
  // Resilient keyRisks handling — image-only PDFs may yield empty results
  if (!Array.isArray(analysis.keyRisks) || analysis.keyRisks.length === 0) {
    console.warn("keyRisks empty — adding fallback risk");
    analysis.keyRisks = [{ title: "Manual Review Required", description: "Insufficient contract text was extracted. Re-upload a text-based PDF for full risk analysis." }];
  }
  analysis.keyRisks = analysis.keyRisks.filter((r: any) => r?.title?.trim() && r?.description?.trim());
  if (analysis.keyRisks.length === 0) {
    analysis.keyRisks = [{ title: "Manual Review Required", description: "Risk details could not be extracted from the provided documents." }];
  }
  if (!analysis.claimableAmount?.trim())
    analysis.claimableAmount = "Not specified";
  if (!analysis.extraDays?.trim())
    analysis.extraDays = "Not specified";
  // noticeDeadline: if not "Not specified", must parse as a valid date
  if (analysis.noticeDeadline && analysis.noticeDeadline !== "Not specified") {
    const d = new Date(analysis.noticeDeadline);
    if (isNaN(d.getTime())) {
      console.warn(`noticeDeadline "${analysis.noticeDeadline}" is not a valid ISO date — resetting to "Not specified"`);
      analysis.noticeDeadline = "Not specified";
    }
  }
}

function findClausePatternAlerts(knowledge: KnowledgeBundle, contractDoc: ExtractedDocument) {
  const pages = contractDoc.pages ?? [];
  const alerts: Array<{
    category: string;
    severity: string;
    pageNumber: number | null;
    fingerprint: string;
    plainEnglish: string;
  }> = [];

  for (const pattern of knowledge.clauseLibrary.patterns) {
    const fingerprint = String(pattern.fingerprint || "").toLowerCase().trim();
    if (!fingerprint) continue;

    const pageMatch = pages.find((page) => page.text.toLowerCase().includes(fingerprint));
    if (!pageMatch) continue;

    alerts.push({
      category: pattern.category,
      severity: pattern.severity,
      pageNumber: pageMatch.pageNumber ?? null,
      fingerprint,
      plainEnglish: pattern.plain_english,
    });
  }

  return alerts;
}

function applyClausePatternAlerts(analysis: any, alerts: ReturnType<typeof findClausePatternAlerts>) {
  analysis.clausePatternAlerts = alerts;

  if (!alerts.length) return analysis;

  const existingText = [
    analysis.executiveConclusion,
    analysis.strategicRecommendation,
    ...(analysis.keyRisks ?? []).flatMap((risk: any) => [risk?.title, risk?.description]),
  ]
    .join(" ")
    .toLowerCase();

  for (const alert of alerts) {
    const categoryLabel = alert.category.replace(/-/g, " ");
    if (existingText.includes(categoryLabel) || existingText.includes(alert.fingerprint)) continue;
    if ((analysis.keyRisks ?? []).length >= 6) break;

    const pageRef = alert.pageNumber ? `Page ${alert.pageNumber}` : "contract text";
    (analysis.keyRisks ??= []).push({
      title: `Potential ${categoryLabel} clause detected`,
      description: `${alert.plainEnglish} Review ${pageRef} for confirmation.`,
    });
  }

  return analysis;
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
  knowledge: KnowledgeBundle,
  contractBuffer: Buffer, contractMime: string, contractDoc: ExtractedDocument,
  corrBuffer:     Buffer, corrMime:     string, corrDoc:      ExtractedDocument,
): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set on the server.");
  const client = new Anthropic({ apiKey });

  let contractUsePdfBinary = shouldUsePdfBinary(contractMime, contractDoc);
  let corrUsePdfBinary     = shouldUsePdfBinary(corrMime,     corrDoc);

  // Token budget check — oversized uploads fall back to extracted text and truncation.
  const contractTokens = estimateTokens(contractBuffer, contractMime, contractDoc, contractUsePdfBinary);
  const corrTokens     = estimateTokens(corrBuffer,     corrMime,     corrDoc,     corrUsePdfBinary);
  const totalTokens    = contractTokens + corrTokens;
  const queryTerms     = extractQueryTerms(getDocumentText(corrDoc));

  let effectiveContractDoc = contractDoc;
  let effectiveCorrDoc     = corrDoc;

  if (totalTokens > MAX_ESTIMATED_TOKENS) {
    console.warn(`  Estimated ${totalTokens} tokens — applying token budget (max ${MAX_ESTIMATED_TOKENS})`);
    contractUsePdfBinary = false;
    corrUsePdfBinary     = false;
  }

  const contractChars = contractUsePdfBinary ? 0 : getDocumentCharCount(effectiveContractDoc);
  const corrChars     = corrUsePdfBinary ? 0 : getDocumentCharCount(effectiveCorrDoc);
  const totalChars    = contractChars + corrChars;

  if (totalChars > MAX_ANALYSIS_TEXT_CHARS) {
    console.warn(`  Extracted text is ${totalChars} chars — selecting relevant pages (max ${MAX_ANALYSIS_TEXT_CHARS})`);
    const contractShare = contractChars > 0 ? contractChars / totalChars : 0;
    let contractBudget = contractChars > 0
      ? Math.max(Math.floor(MAX_ANALYSIS_TEXT_CHARS * contractShare), 180_000)
      : 0;
    let corrBudget = corrChars > 0
      ? Math.max(MAX_ANALYSIS_TEXT_CHARS - contractBudget, Math.min(corrChars, 20_000))
      : 0;

    if (contractBudget + corrBudget > MAX_ANALYSIS_TEXT_CHARS) {
      const overflow = contractBudget + corrBudget - MAX_ANALYSIS_TEXT_CHARS;
      if (contractBudget >= corrBudget) {
        contractBudget = Math.max(contractBudget - overflow, 160_000);
      } else {
        corrBudget = Math.max(corrBudget - overflow, 10_000);
      }
    }

    if (!contractUsePdfBinary) {
      effectiveContractDoc = selectDocumentPagesForBudget(contractDoc, contractBudget, queryTerms);
    }
    if (!corrUsePdfBinary) {
      effectiveCorrDoc = selectDocumentPagesForBudget(corrDoc, corrBudget, queryTerms);
    }
  }

  const contractContent = buildDocumentContent(contractBuffer, contractMime, effectiveContractDoc, { usePdfBinary: contractUsePdfBinary });
  const corrContent     = buildDocumentContent(corrBuffer,     corrMime,     effectiveCorrDoc,     { usePdfBinary: corrUsePdfBinary });

  const userContent: Anthropic.MessageParam["content"] = [
    ...(contractContent as any[]),
    ...(corrContent as any[]),
    { type: "text", text: "Analyze these documents and call submit_analysis with your findings." },
  ];

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 180_000);  // 3 min for large reports

  try {
    const response = await withRetry(
      () => client.messages.create({
        model:      ANTHROPIC_MODEL,
        max_tokens: 2048,
        system:     buildAnalysisSystemPrompt(knowledge),
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
        model:      ANTHROPIC_MODEL,
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

async function generateReport(knowledge: KnowledgeBundle, analysis: any, projectData: any, citations: any[]): Promise<any> {
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
      model:       ANTHROPIC_MODEL,
      max_tokens:  4096,
      system:      buildReportSystemPrompt(knowledge),
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
// Draft generation — letter + strategy from analysis + report + citations
// ---------------------------------------------------------------------------

const DRAFT_TOOL: Anthropic.Tool = {
  name:        "submit_draft",
  description: "Submit the client-facing draft response letter and internal claim strategy.",
  input_schema: {
    type: "object",
    properties: {
      letter: {
        type:        "string",
        description: "Full client-facing response letter. 3-5 short paragraphs. Professional tone. Acknowledge request, reference contract review, state position, reserve rights, request direction. No fake statutory language. No hardcoded names.",
      },
      strategy: {
        type: "object",
        properties: {
          whatChanged:        { type: "string", description: "What the owner requested and how it differs from the baseline. 2-3 sentences." },
          arcadisPosition:    { type: "string", description: "Current commercial position — scope status, entitlement, and what Arcadis is doing now. 2-3 sentences." },
          criticalPathImpact: { type: "string", enum: ["Yes", "Likely", "Possible", "No", "Not Enough Information"] },
          scheduleDelayRisk:  { type: "string", enum: ["Low", "Moderate", "High", "Critical"] },
          mitigationSteps:    { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6, description: "Practical mitigation actions. Each step is a single actionable sentence." },
          alternativePaths:   { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4, description: "Alternative resolution paths if primary approach fails." },
          recommendedPath:    { type: "string", description: "Single paragraph: the recommended course of action." },
          commercialContext:  { type: "string", description: "Short paragraph on the current claim status and entitlement support level. Conservative and source-grounded." },
          strategicReminders: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5, description: "Short reminders for the commercial manager handling this change." },
        },
        required: ["whatChanged", "arcadisPosition", "criticalPathImpact", "scheduleDelayRisk",
                   "mitigationSteps", "alternativePaths", "recommendedPath", "commercialContext", "strategicReminders"],
      },
    },
    required: ["letter", "strategy"],
  },
};

async function generateDraft(
  knowledge: KnowledgeBundle,
  analysis:    any,
  projectData: any,
  citations:   any[],
  report?:     any,
): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set on the server.");
  const client = new Anthropic({ apiKey });

  const project  = projectData?.name       || "the project";
  const contract = projectData?.contractNumber || "the contract";
  const crId     = projectData?.changeRequestId || "";
  const today    = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Build context from report sections if available
  const reportContext = report?.sections
    ? `\n\nExisting report context (use to stay consistent):\n` +
      `- Arcadis Position: Scope ${report.sections.arcadisPosition?.scopeStatus ?? "unknown"}, ` +
      `Fee ${report.sections.arcadisPosition?.feePosition ?? "unknown"}, ` +
      `Time ${report.sections.arcadisPosition?.timePosition ?? "unknown"}\n` +
      `- Recommendation: ${report.sections.recommendation?.content?.slice(0, 200) ?? "N/A"}\n` +
      `- Risk & Mitigation: ${report.sections.riskAndMitigation?.content?.slice(0, 200) ?? "N/A"}`
    : "";

  const citationContext = citations?.length
    ? `\n\nKey contract citations:\n${JSON.stringify(citations.slice(0, 4), null, 2)}`
    : "";

  const userPrompt = `Generate a draft response letter and internal claim strategy for the following change order situation.

Project: ${project}
Contract: ${contract}${crId ? ` | Change Request: ${crId}` : ""}
Date: ${today}

Analysis:
${JSON.stringify({
    executiveConclusion:     analysis.executiveConclusion,
    scopeStatus:             analysis.scopeStatus,
    primaryResponsibility:   analysis.primaryResponsibility,
    extraMoneyLikely:        analysis.extraMoneyLikely,
    extraTimeLikely:         analysis.extraTimeLikely,
    claimableAmount:         analysis.claimableAmount,
    extraDays:               analysis.extraDays,
    noticeDeadline:          analysis.noticeDeadline,
    strategicRecommendation: analysis.strategicRecommendation,
    keyRisks:                analysis.keyRisks,
  }, null, 2)}${reportContext}${citationContext}

Rules:
- Letter: professional tone, no aggressive legal theatrics, usable by a commercial manager
- Do not invent law, deadlines, or entitlement certainty not supported by the analysis
- Do not use placeholder names like "Ms. Richardson" or "BuildCorp"
- Reference the project name and contract number where appropriate
- Strategy: practical and actionable, not theoretical
- All outputs must be conservative and source-grounded

Call submit_draft with the completed letter and strategy.`;

  const response = await withRetry(
    () => client.messages.create({
      model:       ANTHROPIC_MODEL,
      max_tokens:  3000,
      system:      buildDraftSystemPrompt(knowledge),
      tools:       [DRAFT_TOOL],
      tool_choice: { type: "tool", name: "submit_draft" },
      messages:    [{ role: "user", content: userPrompt }],
    }),
    "draft generation"
  );

  const toolUse = response.content.find(b => b.type === "tool_use") as Anthropic.ToolUseBlock | undefined;
  if (!toolUse) throw new Error("Claude did not call submit_draft.");
  return toolUse.input;
}

// ---------------------------------------------------------------------------
// Express server
// ---------------------------------------------------------------------------

async function startServer() {
  const app  = express();
  const PORT = Number(process.env.PORT) || 3000;
  const knowledge = await loadKnowledge(__dirname);

  console.log(
    `Knowledge loaded: ${knowledge.clauseLibrary.patterns.length} clause patterns, ${knowledge.clauseFingerprints.records.length} clause families, ${knowledge.chatBoostTerms.size} boosted chat terms`,
  );
  console.log(`Knowledge versions: ${JSON.stringify(knowledge.versionInfo)}`);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/knowledge-meta", (_req, res) => {
    res.json({
      success: true,
      knowledge: {
        ...knowledge.versionInfo,
        clausePatternCount: knowledge.clauseLibrary.patterns.length,
        chatBoostTermCount: knowledge.chatBoostTerms.size,
      },
    });
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
          knowledge,
          contractFile.buffer, contractFile.mimetype, contractDoc,
          corrFile.buffer,     corrFile.mimetype,     correspondenceDoc,
        );
        applyClausePatternAlerts(analysis, findClausePatternAlerts(knowledge, contractDoc));

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
        store = {
          analysis,
          projectData,
          contract: contractDocMeta,
          correspondence: corrDocMeta,
          citations,
          knowledgeMeta: knowledge.versionInfo,
        } as any;
        await saveStore(store);

        console.log("Analysis complete.\n");

        res.json({
          success: true,
          analysis,
          projectData,
          citations,
          knowledgeMeta: knowledge.versionInfo,
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
  app.post("/api/generate-report", express.json({ limit: "2mb" }), async (req, res) => {
    try {
      // Use body values if provided (sent by client from IndexedDB), fall back to server store
      const analysis    = req.body?.analysis    ?? store.analysis;
      const projectData = req.body?.projectData ?? store.projectData ?? {};
      const citations   = req.body?.citations   ?? store.citations   ?? [];

      if (!analysis) {
        res.status(400).json({ error: "No analysis found. Run an analysis first." });
        return;
      }
      console.log("Generating report...");
      const raw = await generateReport(knowledge, analysis, projectData, citations);
      const now = new Date().toISOString();
      const report = {
        id:        `report-${Date.now()}`,
        threadId:  "current",
        createdAt: now,
        updatedAt: now,
        title:     raw.title,
        metadata:  raw.metadata,
        sections:  raw.sections,
        knowledgeMeta: knowledge.versionInfo,
      };
      console.log("Report generated.");
      res.json({ success: true, report, knowledgeMeta: knowledge.versionInfo });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Report generation failed.";
      console.error("Report error:", message);
      res.status(500).json({ error: message });
    }
  });

  // ── Generate draft response + claim strategy ─────────────────────────────
  app.post("/api/generate-draft", express.json({ limit: "2mb" }), async (req, res) => {
    try {
      const analysis    = req.body?.analysis    ?? store.analysis;
      const projectData = req.body?.projectData ?? store.projectData ?? {};
      const citations   = req.body?.citations   ?? store.citations   ?? [];
      const report      = req.body?.report      ?? null;

      if (!analysis) {
        res.status(400).json({ error: "No analysis found. Run an analysis first." });
        return;
      }
      console.log("Generating draft...");
      const raw = await generateDraft(knowledge, analysis, projectData, citations, report);
      const now = new Date().toISOString();
      const draft = {
        id:        `draft-${Date.now()}`,
        threadId:  "current",
        createdAt: now,
        updatedAt: now,
        letter:    raw.letter,
        strategy:  raw.strategy,
        knowledgeMeta: knowledge.versionInfo,
      };
      console.log("Draft generated.");
      res.json({ success: true, draft, knowledgeMeta: knowledge.versionInfo });
    } catch (err: any) {
      const message = err instanceof Error ? err.message : "Draft generation failed.";
      console.error("Draft error:", message);
      res.status(500).json({ error: message });
    }
  });

    // ── Read backup store ──────────────────────────────────────────────────────
  app.get("/api/store", (_req, res) => {
    res.json(store);
  });


  // ── Ask the Contract — RAG chat ───────────────────────────────────────────
  app.post("/api/chat", express.json({ limit: "512kb" }), async (req, res) => {
    try {
      const { question, history } = req.body as {
        question: string;
        history?: { role: "user" | "assistant"; text: string }[];
      };

      if (!question?.trim()) {
        res.status(400).json({ error: "question is required." });
        return;
      }

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured." });
        return;
      }

      // Client sends chunks from IndexedDB (server store only has metadata, no chunks)
      const { chunks: bodyChunks } = req.body as { chunks?: any[] };
      const contractChunks       = bodyChunks ?? (store.contract      as any)?.chunks ?? [];
      const correspondenceChunks = (store.correspondence as any)?.chunks ?? [];
      const allChunks: any[]     = bodyChunks
        ? bodyChunks
        : [...contractChunks, ...correspondenceChunks];

      const questionWords = question.toLowerCase().split(/\W+/).filter(w => w.length > 2);
      const scored = allChunks.map((chunk: any) => {
        const text = (chunk.text ?? "").toLowerCase();
        let score  = 0;
        for (const w of questionWords) {
          if (text.includes(w)) {
            score += knowledge.chatBoostTerms.has(w) ? 3 : 1;
          }
        }
        return { chunk, score };
      });
      scored.sort((a, b) => b.score - a.score);
      const topChunks = scored.slice(0, 5).filter(s => s.score > 0).map(s => s.chunk);

      // If no chunks matched, still answer but note limited context
      const contextText = topChunks.length
        ? topChunks.map((c: any) => `[Page ${c.pageNumber ?? "?"}]\n${c.text}`).join("\n\n---\n\n")
        : null;

      // Build message history for conversational context (last 6 turns)
      const recentHistory = (history ?? []).slice(-6);
      const historyMessages: Anthropic.MessageParam[] = recentHistory.map(m => ({
        role:    m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      // If no chunks matched, return a no-support response without calling Claude
      if (!contextText) {
        res.json({
          answer: "I could not find relevant text in the uploaded documents to answer this question. Please try rephrasing, or check that the correct contract was uploaded. If the document is scanned or image-based, text extraction may be limited.",
          sourceChunks: [],
        });
        return;
      }

      const client = new Anthropic({ apiKey });
      const response = await withRetry(
        () => client.messages.create({
          model:      ANTHROPIC_MODEL,
          max_tokens: 512,
          system: `You are a construction contract analyst. Answer questions strictly from the provided contract excerpts.

Rules:
1. Only use information explicitly present in the provided excerpts.
2. Always cite the page number when referencing a clause (e.g., "per Page 3").
3. If the answer is not clearly supported by the excerpts, respond: "I could not find clear support for this in the uploaded documents."
4. Never answer from general legal knowledge or inference beyond the text.
5. Never state conclusions more confidently than the text supports.
6. Keep answers under 150 words.`,
          messages: [
            ...historyMessages,
            {
              role:    "user",
              content: `Contract excerpts:\n\n${contextText}\n\nQuestion: ${question}`,
            },
          ],
        }),
        "chat"
      );

      const textBlock = response.content.find(b => b.type === "text") as Anthropic.TextBlock | undefined;
      const answer    = textBlock?.text ?? "I was unable to generate a response.";

      const sourceChunks = topChunks.map((c: any) => ({
        id:         c.id,
        pageNumber: c.pageNumber,
        text:       c.text?.slice(0, 200) + (c.text?.length > 200 ? "…" : ""),
        sourceId:   c.sourceId,
      }));

      res.json({ answer, sourceChunks });
    } catch (err: any) {
      const message = err instanceof Error ? err.message : "Chat failed.";
      console.error("Chat error:", message);
      res.status(500).json({ error: message });
    }
  });

  // ── Frontend serving ───────────────────────────────────────────────────────
  const distPath = path.join(process.cwd(), "dist");
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (${process.env.NODE_ENV ?? "development"})`);
  });
}

startServer().catch((err) => {
  console.error("CRITICAL SERVER ERROR:", err);
  process.exit(1);
});
