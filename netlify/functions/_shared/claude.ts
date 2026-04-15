import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedDocument, ExtractedChunk, Citation } from "../../../src/types.js";

// ---------------------------------------------------------------------------
// Retry wrapper
// ---------------------------------------------------------------------------

const RETRY_DELAYS = [2000, 6000];

export async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
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
// Analysis tool
// ---------------------------------------------------------------------------

export const ANALYSIS_TOOL: Anthropic.Tool = {
  name: "submit_analysis",
  description: "Submit the structured contract change analysis result.",
  input_schema: {
    type: "object",
    properties: {
      executiveConclusion:     { type: "string", description: "2-3 sentence summary. Max 300 chars." },
      scopeStatus:             { type: "string", enum: ["In Scope", "Out of Scope"] },
      primaryResponsibility:   { type: "string", description: "Who bears primary responsibility. Max 100 chars." },
      secondaryResponsibility: { type: "string", description: "Secondary party. Max 100 chars." },
      extraMoneyLikely:        { type: "boolean" },
      extraTimeLikely:         { type: "boolean" },
      claimableAmount:         { type: "string", description: "e.g. '$50,000' or 'Not specified'" },
      extraDays:               { type: "string", description: "e.g. '14 days' or 'Not specified'" },
      noticeDeadline:          { type: "string", description: "ISO 8601 date (YYYY-MM-DD) or 'Not specified'" },
      strategicRecommendation: { type: "string", description: "Recommended action. Max 500 chars." },
      keyRisks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title:       { type: "string", description: "Max 50 chars" },
            description: { type: "string", description: "Max 200 chars" },
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

export const ANALYSIS_SYSTEM_PROMPT = `You are a senior construction contract manager with deep expertise in AIA A201, DBIA 540, and standard heavy civil contract forms.

Your task: analyze the provided contract and correspondence to determine the legal and financial impact of a proposed change.

Rules:
1. Be concise — no repetition.
2. Cite page numbers where possible (e.g., "per Section 7.2, Page 14").
3. If a value cannot be determined, use "Not specified" — never hallucinate.
4. noticeDeadline must be YYYY-MM-DD or "Not specified".
5. scopeStatus must be exactly "In Scope" or "Out of Scope".
6. Always call the submit_analysis tool.`;

export function validateAnalysis(analysis: any): void {
  if (!analysis.executiveConclusion?.trim()) throw new Error("Analysis missing executiveConclusion.");
  if (!["In Scope", "Out of Scope"].includes(analysis.scopeStatus))
    throw new Error(`Invalid scopeStatus: "${analysis.scopeStatus}"`);
  if (!Array.isArray(analysis.keyRisks) || analysis.keyRisks.length === 0)
    throw new Error("Analysis must include at least one key risk.");
  if (analysis.noticeDeadline && analysis.noticeDeadline !== "Not specified") {
    const d = new Date(analysis.noticeDeadline);
    if (isNaN(d.getTime())) analysis.noticeDeadline = "Not specified";
  }
}

// ---------------------------------------------------------------------------
// Citation tool
// ---------------------------------------------------------------------------

export const CITATION_TOOL: Anthropic.Tool = {
  name: "submit_citations",
  description: "Submit extracted citations from the contract.",
  input_schema: {
    type: "object",
    properties: {
      citations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id:          { type: "string" },
            title:       { type: "string", description: "Max 60 chars." },
            source:      { type: "string", description: "e.g. 'Section 7.2, Page 14'" },
            text:        { type: "string", description: "Clause text. Max 300 chars." },
            explanation: { type: "string", description: "Why this clause matters. Max 200 chars." },
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

// ---------------------------------------------------------------------------
// Report tool
// ---------------------------------------------------------------------------

export const REPORT_TOOL: Anthropic.Tool = {
  name: "submit_report",
  description: "Submit the fully written report sections.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      sections: {
        type: "object",
        properties: {
          executiveSummary:       { type: "object", properties: { heading: { type: "string" }, content: { type: "string" } }, required: ["heading", "content"] },
          scopeAndResponsibility: { type: "object", properties: { heading: { type: "string" }, content: { type: "string" } }, required: ["heading", "content"] },
          commercialAnalysis:     { type: "object", properties: { heading: { type: "string" }, content: { type: "string" } }, required: ["heading", "content"] },
          scheduleImpact:         { type: "object", properties: { heading: { type: "string" }, content: { type: "string" } }, required: ["heading", "content"] },
          recommendation:         { type: "object", properties: { heading: { type: "string" }, content: { type: "string" } }, required: ["heading", "content"] },
        },
        required: ["executiveSummary", "scopeAndResponsibility", "commercialAnalysis", "scheduleImpact", "recommendation"],
      },
    },
    required: ["title", "sections"],
  },
};

// ---------------------------------------------------------------------------
// Build Claude message content from a document
// ---------------------------------------------------------------------------

export function buildDocumentContent(
  buffer: Buffer,
  mimetype: string,
  doc: ExtractedDocument
): Anthropic.MessageParam["content"] {
  if (mimetype === "application/pdf") {
    return [{
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") },
      title: doc.name,
      cache_control: { type: "ephemeral" },
    } as any];
  }
  const text = doc.pages?.map(p => `[Page ${p.pageNumber}]\n${p.text}`).join("\n\n")
    ?? `Document: ${doc.name}`;
  return [{ type: "text", text: `Document: ${doc.name}\n\n${text}` }];
}

// ---------------------------------------------------------------------------
// Run analysis
// ---------------------------------------------------------------------------

export async function runAnalysis(
  contractBuffer: Buffer, contractMime: string, contractDoc: ExtractedDocument,
  corrBuffer:     Buffer, corrMime:     string, corrDoc:      ExtractedDocument,
): Promise<any> {
  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
  const client = new Anthropic({ apiKey });

  const contractContent = buildDocumentContent(contractBuffer, contractMime, contractDoc);
  const corrContent     = buildDocumentContent(corrBuffer, corrMime, corrDoc);

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
        model:       "claude-sonnet-4-5",
        max_tokens:  2048,
        system:      ANALYSIS_SYSTEM_PROMPT,
        tools:       [ANALYSIS_TOOL],
        tool_choice: { type: "tool", name: "submit_analysis" },
        messages:    [{ role: "user", content: userContent }],
      }),
      "analysis"
    );

    const toolUse = response.content.find(b => b.type === "tool_use") as Anthropic.ToolUseBlock | undefined;
    if (!toolUse) throw new Error("Claude did not call submit_analysis.");
    const analysis = toolUse.input as any;
    validateAnalysis(analysis);
    return analysis;
  } catch (err: any) {
    if (err.name === "AbortError") throw new Error("Analysis timed out after 120 seconds.");
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Extract citations
// ---------------------------------------------------------------------------

export async function extractCitations(analysis: any, contractDoc: ExtractedDocument): Promise<Citation[]> {
  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return [];
  try {
    const client = new Anthropic({ apiKey });
    const chunks = (contractDoc.chunks ?? []).slice(0, 20);
    const chunksText = chunks.map(c => `[Page ${c.pageNumber ?? "?"}]\n${c.text}`).join("\n\n---\n\n");
    const analysisJson = JSON.stringify({
      scopeStatus: analysis.scopeStatus,
      primaryResp: analysis.primaryResponsibility,
      keyRisks:    analysis.keyRisks,
      noticeDeadline: analysis.noticeDeadline,
    }, null, 2);

    const response = await withRetry(
      () => client.messages.create({
        model:       "claude-sonnet-4-5",
        max_tokens:  1024,
        system:      "You are a construction contract analyst. Identify specific clauses supporting the findings. Call submit_citations.",
        tools:       [CITATION_TOOL],
        tool_choice: { type: "tool", name: "submit_citations" },
        messages: [{
          role: "user",
          content: `Analysis:\n${analysisJson}\n\nContract chunks:\n${chunksText}\n\nCall submit_citations.`,
        }],
      }),
      "citations"
    );

    const toolUse = response.content.find(b => b.type === "tool_use") as Anthropic.ToolUseBlock | undefined;
    if (!toolUse) return [];
    const raw = (toolUse.input as any).citations ?? [];
    return raw.map((c: any, i: number) => ({
      id: c.id ?? `cite-${i}`, title: c.title ?? "", source: c.source ?? "",
      text: c.text ?? "", explanation: c.explanation ?? "", confidence: c.confidence ?? "Medium",
    })) as Citation[];
  } catch (err) {
    console.warn("Citation extraction failed:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Generate report
// ---------------------------------------------------------------------------

export async function generateReport(analysis: any, projectData: any): Promise<any> {
  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
  const client = new Anthropic({ apiKey });

  const projectLabel = projectData?.name
    ? `${projectData.name}${projectData.changeRequestId ? ` (${projectData.changeRequestId})` : ""}`
    : "Unnamed Project";

  const analysisJson = JSON.stringify({
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
  }, null, 2);

  const response = await withRetry(
    () => client.messages.create({
      model:       "claude-sonnet-4-5",
      max_tokens:  2048,
      system: `You are a senior construction contract manager writing a formal change-order analysis report.
Write in professional, clear prose suitable for sending to legal counsel or a client.
Do not repeat yourself. Do not use bullet points. Do not hallucinate.
All content must derive from the provided analysis data.
Call submit_report with the completed sections.`,
      tools:       [REPORT_TOOL],
      tool_choice: { type: "tool", name: "submit_report" },
      messages: [{
        role:    "user",
        content: `Write a formal analysis report for project: ${projectLabel}\n\nAnalysis data:\n${analysisJson}`,
      }],
    }),
    "report"
  );

  const toolUse = response.content.find(b => b.type === "tool_use") as Anthropic.ToolUseBlock | undefined;
  if (!toolUse) throw new Error("Claude did not call submit_report.");
  return toolUse.input;
}
